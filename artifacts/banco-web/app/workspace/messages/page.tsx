import { WorkspaceShell } from "../../../components/workspace/WorkspaceShell";
import { MessagesInboxPanel } from "../../../components/workspace/MessagesInboxPanel";

export default function WorkspaceMessagesPage() {
  return (
    <WorkspaceShell>
      <MessagesInboxPanel />
    </WorkspaceShell>
  );
}
