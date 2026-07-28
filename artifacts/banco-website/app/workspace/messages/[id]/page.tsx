import { WorkspaceShell } from "../../../../components/workspace/WorkspaceShell";
import { MessageThreadPanel } from "../../../../components/workspace/MessageThreadPanel";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorkspaceMessageThreadPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <WorkspaceShell>
      <MessageThreadPanel conversationId={id} />
    </WorkspaceShell>
  );
}
