import { ALL_INDUSTRIAL_TYPES, LOCATIONS, flattenAreas, locLabel } from "@workspace/taxonomy";
import type { SiteLocale } from "./hub-config";
import type { WorkspaceUiCopy } from "./workspace-ui-copy";

export type WorkspaceCategory = "car" | "real_estate" | "industrial";

export type SpecFieldDef = {
  key: string;
  label: string;
  numeric?: boolean;
  options?: { value: string; label: string }[];
};

export function workspaceLocationGroups(locale: SiteLocale) {
  const isRTL = locale === "ar";
  return LOCATIONS.map((country) => ({
    country: locLabel(country, isRTL),
    items: flattenAreas(country).map(({ area, group }) => {
      const areaLabel = locLabel(area, isRTL);
      const groupLabel = locLabel(group, isRTL);
      return {
        value: area.value,
        label: areaLabel === groupLabel ? areaLabel : `${areaLabel} — ${groupLabel}`,
      };
    }),
  }));
}

export function workspaceSpecFields(
  category: WorkspaceCategory,
  copy: WorkspaceUiCopy,
): SpecFieldDef[] {
  switch (category) {
    case "car":
      return [
        { key: "make", label: copy.specMake },
        { key: "model", label: copy.specModel },
        { key: "year", label: copy.specYear, numeric: true },
        { key: "mileage", label: copy.specMileage, numeric: true },
      ];
    case "real_estate":
      return [
        { key: "property_type", label: copy.specPropertyType },
        { key: "area", label: copy.specAreaSqm, numeric: true },
        { key: "rooms", label: copy.specRooms, numeric: true },
      ];
    case "industrial":
      return [
        {
          key: "industrial_type",
          label: copy.specIndustrialType,
          options: ALL_INDUSTRIAL_TYPES.map((value) => ({
            value,
            label: value.replace(/_/g, " "),
          })),
        },
        { key: "equipment_type", label: copy.specEquipmentType },
        { key: "condition", label: copy.specCondition },
      ];
  }
}

export function workspaceCategoryOptions(
  copy: WorkspaceUiCopy,
): { value: WorkspaceCategory; label: string }[] {
  return [
    { value: "car", label: copy.categoryCar },
    { value: "real_estate", label: copy.categoryRealEstate },
    { value: "industrial", label: copy.categoryIndustrial },
  ];
}
