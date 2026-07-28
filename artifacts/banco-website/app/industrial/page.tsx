import { HubPageView } from "../../components/HubPageView";
import { hubCopy } from "../../lib/hub-config";
import { pageMetadata } from "../../lib/page-metadata";

const copy = hubCopy("industrial", "ar");

export const metadata = pageMetadata({
  title: copy.metadataTitle,
  description: copy.metadataDescription,
  path: copy.path,
});

export default function IndustrialHubPage() {
  return <HubPageView hub="industrial" locale="ar" />;
}
