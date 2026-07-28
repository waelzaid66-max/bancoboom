import { WorkspaceShell } from "../../../components/workspace/WorkspaceShell";
import { ManagedListingsPanel } from "../../../components/workspace/ManagedListingsPanel";

export default function WorkspaceListingsPage() {
  return (
    <WorkspaceShell>
      <ManagedListingsPanel />
    </WorkspaceShell>
  );
}
