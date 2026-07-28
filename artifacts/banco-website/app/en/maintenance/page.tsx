import type { Metadata } from "next";
import { MaintenanceView } from "../../../components/MaintenanceView";

export const metadata: Metadata = {
  title: "Website temporarily offline",
  robots: { index: false, follow: false },
};

export default function EnMaintenancePage() {
  return <MaintenanceView locale="en" />;
}
