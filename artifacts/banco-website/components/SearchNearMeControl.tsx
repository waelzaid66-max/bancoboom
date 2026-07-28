"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_NEAR_RADIUS_KM, requestNearMeCoords } from "../lib/near-me-web";
import { searchUiCopy } from "../lib/search-ui-copy";
import { trackSearchEvent } from "../lib/telemetry";
import { useSearchLocale } from "../lib/use-search-locale";

const buttonStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: 10,
  background: "transparent",
  color: "var(--banco-fg)",
  padding: "0.55rem 0.7rem",
  fontWeight: 700,
  cursor: "pointer",
};

const activeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "var(--banco-primary)",
  color: "#fff",
  borderColor: "var(--banco-primary)",
};

export function SearchNearMeControl() {
  const locale = useSearchLocale();
  const copy = searchUiCopy(locale);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);

  const nearLat = searchParams.get("near_lat");
  const nearLng = searchParams.get("near_lng");
  const active = Boolean(nearLat && nearLng);

  const toggleNearMe = async () => {
    const params = new URLSearchParams(searchParams.toString());

    if (active) {
      params.delete("near_lat");
      params.delete("near_lng");
      params.delete("radius_km");
      trackSearchEvent("search_near_me_disable", {});
      router.replace(`${pathname}?${params.toString()}`);
      return;
    }

    setPending(true);
    const coords = await requestNearMeCoords();
    setPending(false);

    if (!coords) {
      trackSearchEvent("search_near_me_denied", {});
      window.alert(copy.nearMeDenied);
      return;
    }

    params.set("near_lat", String(coords.lat));
    params.set("near_lng", String(coords.lng));
    params.set("radius_km", String(DEFAULT_NEAR_RADIUS_KM));
    trackSearchEvent("search_near_me_enable", {
      radius_km: DEFAULT_NEAR_RADIUS_KM,
    });
    router.replace(`${pathname}?${params.toString()}`);
  };

  const label = pending ? copy.nearMePending : active ? copy.nearMeActive : copy.nearMe;

  return (
    <button
      type="button"
      style={active ? activeButtonStyle : buttonStyle}
      onClick={() => void toggleNearMe()}
      disabled={pending}
      data-testid="filter-near-me"
    >
      {label}
    </button>
  );
}
