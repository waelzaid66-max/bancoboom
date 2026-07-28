import type { Metadata } from "next";
import { MaintenanceView } from "../../components/MaintenanceView";

export const metadata: Metadata = {
  title: "الموقع متوقف مؤقتاً",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return <MaintenanceView locale="ar" />;
}
