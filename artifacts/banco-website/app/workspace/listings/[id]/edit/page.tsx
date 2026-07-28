import { WorkspaceShell } from "../../../../../components/workspace/WorkspaceShell";
import { ListingCreateForm } from "../../../../../components/workspace/ListingCreateForm";

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorkspaceEditListingPage({ params }: EditPageProps) {
  const { id } = await params;
  return (
    <WorkspaceShell>
      <ListingCreateForm listingId={id} />
    </WorkspaceShell>
  );
}
