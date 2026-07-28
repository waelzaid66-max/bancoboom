import { WorkspaceShell } from "../../../components/workspace/WorkspaceShell";
import { WorkspaceB2bPanel } from "../../../components/workspace/WorkspaceB2bPanel";

export default function WorkspaceB2bPage() {
  return (
    <WorkspaceShell>
      <WorkspaceB2bPanel tab="overview" />
    </WorkspaceShell>
  );
}
