import { Ionicons } from "@/components/icons";
import { Image } from "expo-image";
import { VideoPlayer, VideoView, useVideoPlayer } from "expo-video";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { MediaItem } from "@workspace/api-client-react";
import { FullscreenImageViewer } from "@/components/FullscreenImageViewer";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface VideoSlideProps {
  url: string;
  height: number;
  isActive: boolean;
}

function VideoSlide({ url, height, isActive }: VideoSlideProps) {
  const player = useVideoPlayer(url, (p: VideoPlayer) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
    return () => {
      player.pause();
    };
  }, [isActive, player]);

  return (
    <VideoView
      player={player}
      style={{ width: SCREEN_WIDTH, height }}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

interface MediaGalleryProps {
  media: MediaItem[];
  height?: number;
}

export function MediaGallery({ media, height = 300 }: MediaGalleryProps) {
  const colors = useColors();
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(idx);
  };

  const openViewer = (idx: number) => {
    setViewerIndex(idx);
    setViewerOpen(true);
  };

  if (!media || media.length === 0) {
    return (
      <View
        style={[
          styles.placeholder,
          { height, backgroundColor: colors.muted },
        ]}
      >
        <Ionicons name="image-outline" size={48} color={colors.mutedForeground} />
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { height }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEnabled={!!media.length}
        style={{ width: SCREEN_WIDTH }}
      >
        {media.map((item, idx) => (
          <Pressable
            key={item.id ?? idx}
            onPress={() => openViewer(idx)}
            style={{ width: SCREEN_WIDTH, height }}
          >
            {item.type === "video" ? (
              <VideoSlide
                url={item.url}
                height={height}
                isActive={idx === activeIndex}
              />
            ) : (
              <Image
                source={{ uri: item.url }}
                style={styles.image}
                contentFit="cover"
                transition={150}
              />
            )}
          </Pressable>
        ))}
      </ScrollView>

      {media.length > 1 && (
        <View style={styles.dots}>
          {media.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    idx === activeIndex ? "#FFFFFF" : "rgba(255,255,255,0.4)",
                  width: idx === activeIndex ? 16 : 6,
                },
              ]}
            />
          ))}
        </View>
      )}

      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {activeIndex + 1} / {media.length}
        </Text>
      </View>

      <FullscreenImageViewer
        key={viewerOpen ? `viewer-${viewerIndex}` : "viewer-closed"}
        media={media}
        initialIndex={viewerIndex}
        visible={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  counter: {
    position: "absolute",
    top: 14,
    right: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
