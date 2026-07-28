import { describe, it, expect } from "vitest";
import { validateAttributes } from "./ListingService";

/**
 * Sub-type-aware attribute floors (#13). `rooms` is required for built real-estate
 * units but NOT for raw land / bare commercial plots, so a land listing is never
 * forced to invent a room count. Pure function — no DB. Mirrors the mobile gate
 * (requiredSpecKeysFor / REAL_ESTATE_NO_ROOMS_TYPES).
 */
describe("validateAttributes — real-estate rooms floor is sub-type aware", () => {
  it("requires rooms for a built unit (apartment)", () => {
    const ok = validateAttributes("real_estate", { area: 120, property_type: "apartment", rooms: 3 });
    expect(ok.valid).toBe(true);

    const missing = validateAttributes("real_estate", { area: 120, property_type: "apartment" });
    expect(missing.valid).toBe(false);
    expect(missing.errors.join(" ")).toMatch(/rooms/);
  });

  it("does NOT require rooms for land / shop / office / clinic", () => {
    for (const property_type of ["land", "shop", "office", "clinic"]) {
      const res = validateAttributes("real_estate", { area: 500, property_type });
      expect(res.valid, `${property_type} should publish without rooms`).toBe(true);
    }
  });

  it("still requires area for real-estate regardless of sub-type", () => {
    const res = validateAttributes("real_estate", { property_type: "land" });
    expect(res.valid).toBe(false);
    expect(res.errors.join(" ")).toMatch(/area/);
  });

  it("keeps the car + industrial floors intact", () => {
    expect(validateAttributes("car", { mileage: 50000, condition: "used" }).valid).toBe(true);
    expect(validateAttributes("car", { mileage: 50000 }).valid).toBe(false); // missing condition
    expect(validateAttributes("industrial", { capacity: "500 u/hr" }).valid).toBe(true);
    expect(validateAttributes("industrial", {}).valid).toBe(false); // missing capacity
  });

  /**
   * The movable-asset category holds more than cars. Owner, 2026-07-28: if
   * someone wants to list an aircraft, a boat or a launch, the system must never
   * refuse the listing. Mileage was doing exactly that — an odometer reading is a
   * car assumption, while aircraft count flight hours and vessels engine hours,
   * so assets with no kilometres could not be published at all.
   */
  describe("the movable-asset floor does not assume the asset is a car", () => {
    it("publishes assets that have no odometer (aircraft, vessel, launch)", () => {
      // Hours, not kilometres — carried as a free spec, not as `mileage`.
      const aircraft = validateAttributes("car", {
        condition: "used",
        flight_hours: 1200,
      });
      expect(aircraft.valid, aircraft.errors.join(" ")).toBe(true);

      const vessel = validateAttributes("car", {
        condition: "new",
        engine_hours: 300,
      });
      expect(vessel.valid, vessel.errors.join(" ")).toBe(true);
    });

    it("still refuses a listing with no condition — the floor is small, not absent", () => {
      const res = validateAttributes("car", { flight_hours: 1200 });
      expect(res.valid).toBe(false);
      expect(res.errors.join(" ")).toMatch(/condition/);
    });

    it("keeps accepting ordinary cars unchanged", () => {
      expect(
        validateAttributes("car", {
          mileage: 50000,
          condition: "used",
          year: 2019,
          fuel_type: "petrol",
        }).valid,
      ).toBe(true);
    });
  });
});
