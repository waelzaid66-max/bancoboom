import { Platform } from "react-native";

/** Default radius when the user enables "Near me" (km). */
export const DEFAULT_NEAR_RADIUS_KM = 25;

/**
 * Selectable radii for the "Near me" search (km). The row is rendered ONLY while
 * near-me is enabled, so the compact filter sheet keeps its default height.
 * 5 → walking/neighbourhood, 100 → whole-governorate reach.
 */
export const NEAR_RADIUS_OPTIONS_KM = [5, 10, 25, 50, 100] as const;

/**
 * Requests foreground location permission and returns the device coordinates.
 * Returns null on web, denied permission, or any runtime error — callers show UX.
 */
export async function requestNearMeCoords(): Promise<{
  lat: number;
  lng: number;
} | null> {
  if (Platform.OS === "web") return null;
  try {
    const Location = await import("expo-location");
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") {
      const req = await Location.requestForegroundPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}
