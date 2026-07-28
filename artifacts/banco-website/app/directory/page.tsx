import { DirectoryHubView } from "../../components/DirectoryHubView";
import { directoryHubCopy } from "../../lib/directory-hub-copy";
import { pageMetadata } from "../../lib/page-metadata";

const copy = directoryHubCopy("ar");

export const metadata = pageMetadata({
  title: copy.metaTitle,
  description: copy.metaDescription,
  path: "/directory",
  locale: "ar",
});

export default function DirectoryPage() {
  return <DirectoryHubView locale="ar" />;
}
