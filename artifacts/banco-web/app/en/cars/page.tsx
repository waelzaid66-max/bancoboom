import { HubPageView } from "../../../components/HubPageView";
import { hubCopy } from "../../../lib/hub-config";
import { pageMetadata } from "../../../lib/page-metadata";

const copy = hubCopy("cars", "en");

export const metadata = pageMetadata({
  title: copy.metadataTitle,
  description: copy.metadataDescription,
  path: copy.path,
  locale: "en",
});

export default function EnglishCarsHubPage() {
  return <HubPageView hub="cars" locale="en" />;
}
