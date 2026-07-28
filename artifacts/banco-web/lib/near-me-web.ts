import { DEFAULT_NEAR_RADIUS_KM } from "@workspace/search-contract";

export type NearMeCoords = {
  lat: number;
  lng: number;
};

/**
 * Browser Geolocation for web search (W3.4). Returns null when unavailable or denied.
 */
export async function requestNearMeCoords(): Promise<NearMeCoords | null> {
  if (typeof window === "undefined" || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 12_000 },
    );
  });
}

export { DEFAULT_NEAR_RADIUS_KM };
