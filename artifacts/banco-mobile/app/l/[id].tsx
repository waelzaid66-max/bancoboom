import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * Public share URLs use `/l/:id` (web + Android App Links). Forward in-app to
 * the canonical listing screen so shared links open the detail view.
 */
export default function ListingShortLinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return <Redirect href="/(tabs)" />;
  return <Redirect href={`/listing/${id}`} />;
}
