import { DirectoryHubView } from "../../../components/DirectoryHubView";
import { directoryHubCopy } from "../../../lib/directory-hub-copy";
import { pageMetadata } from "../../../lib/page-metadata";

const copy = directoryHubCopy("en");

export const metadata = pageMetadata({
  title: copy.metaTitle,
  description: copy.metaDescription,
  path: "/en/directory",
  locale: "en",
});

export default function EnglishDirectoryPage() {
  return <DirectoryHubView locale="en" />;
}
