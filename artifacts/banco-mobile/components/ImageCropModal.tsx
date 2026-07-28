import { Feather } from "@/components/icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export type CropModalResult = {
  uri: string;
  width: number;
  height: number;
  contentType: string;
};

type AspectOption = {
  key: string;
  labelKey: string;
  // null = original (source aspect ratio); otherwise width/height.
  ratio: number | null;
};

const ASPECTS: AspectOption[] = [
  { key: "original", labelKey: "create.cropOriginal", ratio: null },
  { key: "1:1", labelKey: "create.cropSquare", ratio: 1 },
  { key: "4:3", labelKey: "create.crop43", ratio: 4 / 3 },
  { key: "16:9", labelKey: "create.crop169", ratio: 16 / 9 },
  { key: "3:4", labelKey: "create.crop34", ratio: 3 / 4 },
];

// Keep in sync with lib/upload.ts so a cropped image lands under the server cap
// and renders crisply on any surface.
const MAX_IMAGE_DIM = 2048;
const IMAGE_QUALITY = 0.85;
const MAX_ZOOM = 8;

type Props = {
  // When non-null the modal is open and crops this local image uri.
  uri: string | null;
  sourceWidth: number;
  sourceHeight: number;
  onCancel: () => void;
  onConfirm: (result: CropModalResult) => void;
};

/**
 * Custom in-app image cropper for the listing flow. Expo Go forbids native crop
 * libraries, so we render the picked image inside a fixed-aspect viewport the
 * seller can pan/pinch, then map the on-screen viewport back to source pixels and
 * hand the rectangle to expo-image-manipulator (the only Expo-Go-safe crop path).
 *
 * The viewport is the crop: whatever is visible inside the frame becomes the
 * output. At the default Original aspect with no zoom the rectangle equals the
 * whole image, so confirming untouched simply re-encodes/downsizes the original
 * (same result as the upload normalizer) — cropping is purely additive.
 */
export function ImageCropModal({
  uri,
  sourceWidth,
  sourceHeight,
  onCancel,
  onConfirm,
}: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const visible = !!uri;

  const [area, setArea] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [aspectKey, setAspectKey] = useState<string>("original");
  const [processing, setProcessing] = useState(false);
  const [cropError, setCropError] = useState(false);
  // Synchronous latch so a rapid double-tap on "Use photo" can't fire two crops
  // (processing state is async and wouldn't block the second tap in time).
  const confirmingRef = useRef(false);

  const iw = sourceWidth > 0 ? sourceWidth : 1;
  const ih = sourceHeight > 0 ? sourceHeight : 1;

  // Frame (the crop viewport) + base "cover" image size for the active aspect,
  // sized to fit the measured area. baseScale is screen-px per source-px at zoom
  // 1; the image always covers the frame so there are never empty edges.
  const frame = useMemo(() => {
    if (area.w <= 0 || area.h <= 0) {
      return { frameW: 0, frameH: 0, baseW: 0, baseH: 0, baseScale: 0 };
    }
    const ratio = ASPECTS.find((a) => a.key === aspectKey)?.ratio ?? iw / ih;
    let frameW = area.w;
    let frameH = frameW / ratio;
    if (frameH > area.h) {
      frameH = area.h;
      frameW = frameH * ratio;
    }
    const baseScale = Math.max(frameW / iw, frameH / ih);
    return {
      frameW,
      frameH,
      baseW: iw * baseScale,
      baseH: ih * baseScale,
      baseScale,
    };
  }, [area, aspectKey, iw, ih]);

  // Reanimated transform: translate is unscaled screen px (listed before scale so
  // it lives in the parent space), scale pivots around the image center.
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  // Bounds mirrored into shared values so the clamp worklet can read them.
  const frameWSV = useSharedValue(0);
  const frameHSV = useSharedValue(0);
  const baseWSV = useSharedValue(0);
  const baseHSV = useSharedValue(0);

  // Recompute bounds + reset the transform whenever the frame changes (aspect
  // switch or a new image opens).
  useEffect(() => {
    frameWSV.value = frame.frameW;
    frameHSV.value = frame.frameH;
    baseWSV.value = frame.baseW;
    baseHSV.value = frame.baseH;
    scale.value = 1;
    savedScale.value = 1;
    tx.value = 0;
    ty.value = 0;
  }, [frame, frameWSV, frameHSV, baseWSV, baseHSV, scale, savedScale, tx, ty]);

  // Fresh image => back to Original aspect and clear any prior error.
  useEffect(() => {
    if (uri) {
      setAspectKey("original");
      setCropError(false);
    }
  }, [uri]);

  const clampTranslation = useCallback(() => {
    "worklet";
    const dispW = baseWSV.value * scale.value;
    const dispH = baseHSV.value * scale.value;
    const maxX = Math.max(0, (dispW - frameWSV.value) / 2);
    const maxY = Math.max(0, (dispH - frameHSV.value) / 2);
    if (tx.value > maxX) tx.value = maxX;
    if (tx.value < -maxX) tx.value = -maxX;
    if (ty.value > maxY) ty.value = maxY;
    if (ty.value < -maxY) ty.value = -maxY;
  }, [baseWSV, baseHSV, frameWSV, frameHSV, scale, tx, ty]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onChange((e) => {
          tx.value += e.changeX;
          ty.value += e.changeY;
        })
        .onEnd(() => {
          clampTranslation();
        }),
    [clampTranslation, tx, ty],
  );

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onStart(() => {
          savedScale.value = scale.value;
        })
        .onChange((e) => {
          let next = savedScale.value * e.scale;
          if (next < 1) next = 1;
          if (next > MAX_ZOOM) next = MAX_ZOOM;
          scale.value = next;
          clampTranslation();
        })
        .onEnd(() => {
          savedScale.value = scale.value;
          clampTranslation();
        }),
    [clampTranslation, savedScale, scale],
  );

  const composedGesture = useMemo(
    () => Gesture.Simultaneous(panGesture, pinchGesture),
    [panGesture, pinchGesture],
  );

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  const handleConfirm = useCallback(async () => {
    if (!uri || confirmingRef.current || frame.baseScale <= 0) return;
    confirmingRef.current = true;
    setProcessing(true);
    setCropError(false);
    try {
      const totalScale = frame.baseScale * scale.value;
      const dispW = frame.baseW * scale.value;
      const dispH = frame.baseH * scale.value;
      // On-screen top-left of the displayed image relative to the frame.
      const imgLeft = (frame.frameW - dispW) / 2 + tx.value;
      const imgTop = (frame.frameH - dispH) / 2 + ty.value;
      // Frame rectangle mapped back into source pixels. Floor the origin, then
      // clamp the rounded size to the pixels that actually remain, so rounding
      // can never push the rectangle 1px past the source edge (which makes
      // ImageManipulator.crop reject an otherwise-valid crop).
      const rawOriginX = -imgLeft / totalScale;
      const rawOriginY = -imgTop / totalScale;
      const originX = Math.max(0, Math.min(Math.floor(rawOriginX), iw - 1));
      const originY = Math.max(0, Math.min(Math.floor(rawOriginY), ih - 1));
      const cropW = Math.max(
        1,
        Math.min(Math.round(frame.frameW / totalScale), iw - originX),
      );
      const cropH = Math.max(
        1,
        Math.min(Math.round(frame.frameH / totalScale), ih - originY),
      );

      const context = ImageManipulator.manipulate(uri);
      context.crop({ originX, originY, width: cropW, height: cropH });
      if (Math.max(cropW, cropH) > MAX_IMAGE_DIM) {
        context.resize(
          cropW >= cropH ? { width: MAX_IMAGE_DIM } : { height: MAX_IMAGE_DIM },
        );
      }
      const rendered = await context.renderAsync();
      const result = await rendered.saveAsync({
        compress: IMAGE_QUALITY,
        format: SaveFormat.JPEG,
      });
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
      onConfirm({
        uri: result.uri,
        width: result.width,
        height: result.height,
        contentType: "image/jpeg",
      });
    } catch {
      setCropError(true);
    } finally {
      confirmingRef.current = false;
      setProcessing(false);
    }
  }, [uri, frame, scale, tx, ty, iw, ih, onConfirm]);

  const onAreaLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea((prev) =>
      prev.w === width && prev.h === height ? prev : { w: width, h: height },
    );
  }, []);

  const rowDir = isRTL ? "row-reverse" : "row";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onCancel}
      transparent={false}
    >
      <View style={[styles.root, { backgroundColor: "#000000" }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + 8, flexDirection: rowDir },
          ]}
        >
          <Pressable
            onPress={onCancel}
            hitSlop={12}
            style={styles.headerBtn}
            testID="crop-cancel"
          >
            <Feather name="x" size={26} color="#FFFFFF" />
          </Pressable>
          <AppText style={styles.headerTitle}>{t("create.cropTitle")}</AppText>
          <View style={styles.headerBtn} />
        </View>

        {/* Crop area */}
        <View style={styles.areaWrap} onLayout={onAreaLayout}>
          {frame.frameW > 0 && uri ? (
            <GestureDetector gesture={composedGesture}>
              <View
                style={[
                  styles.frame,
                  { width: frame.frameW, height: frame.frameH },
                ]}
              >
                <Animated.View
                  style={[
                    {
                      position: "absolute",
                      left: (frame.frameW - frame.baseW) / 2,
                      top: (frame.frameH - frame.baseH) / 2,
                      width: frame.baseW,
                      height: frame.baseH,
                    },
                    imageStyle,
                  ]}
                >
                  <Image
                    source={{ uri }}
                    style={{ width: frame.baseW, height: frame.baseH }}
                    contentFit="fill"
                    cachePolicy="memory-disk"
                  />
                </Animated.View>

                {/* Rule-of-thirds guides */}
                <View pointerEvents="none" style={styles.gridOverlay}>
                  <View style={[styles.gridLineV, { left: "33.33%" }]} />
                  <View style={[styles.gridLineV, { left: "66.66%" }]} />
                  <View style={[styles.gridLineH, { top: "33.33%" }]} />
                  <View style={[styles.gridLineH, { top: "66.66%" }]} />
                </View>
              </View>
            </GestureDetector>
          ) : null}
        </View>

        {/* Aspect chips */}
        <View style={[styles.chipsRow, { flexDirection: rowDir }]}>
          {ASPECTS.map((a) => {
            const active = a.key === aspectKey;
            return (
              <Pressable
                key={a.key}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.selectionAsync();
                  setAspectKey(a.key);
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : "#1A1A1A",
                    borderColor: active ? colors.primary : "#333333",
                  },
                ]}
                testID={`crop-aspect-${a.key}`}
              >
                <AppText
                  style={[
                    styles.chipText,
                    { color: active ? colors.primaryForeground : "#CCCCCC" },
                  ]}
                >
                  {t(a.labelKey)}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {cropError ? (
          <AppText style={[styles.errorText, { color: colors.destructive }]}>
            {t("create.cropFailed")}
          </AppText>
        ) : null}

        {/* Footer actions */}
        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + 12,
              flexDirection: rowDir,
            },
          ]}
        >
          <Pressable
            onPress={onCancel}
            style={[styles.footerBtn, styles.cancelBtn]}
            testID="crop-cancel-btn"
          >
            <AppText style={styles.cancelBtnText}>
              {t("create.cropCancel")}
            </AppText>
          </Pressable>
          <Pressable
            onPress={handleConfirm}
            disabled={processing || frame.frameW <= 0}
            style={[
              styles.footerBtn,
              {
                backgroundColor: colors.primary,
                opacity: processing || frame.frameW <= 0 ? 0.6 : 1,
              },
            ]}
            testID="crop-confirm-btn"
          >
            {processing ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <View style={[styles.confirmInner, { flexDirection: rowDir }]}>
                <Feather
                  name="check"
                  size={18}
                  color={colors.primaryForeground}
                />
                <AppText
                  style={[
                    styles.confirmText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  {t("create.cropUse")}
                </AppText>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  areaWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  frame: {
    overflow: "hidden",
    backgroundColor: "#0A0A0A",
    borderRadius: 4,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  gridLineH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  chipsRow: {
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  errorText: {
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  footerBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#333333",
  },
  cancelBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  confirmInner: {
    alignItems: "center",
    gap: 8,
  },
  confirmText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
