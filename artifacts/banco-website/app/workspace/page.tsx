import { WorkspaceShell } from "../../components/workspace/WorkspaceShell";
import { WorkspaceMetricsCards } from "../../components/workspace/WorkspaceMetricsCards";
import { WorkspaceOverviewPanel } from "../../components/workspace/WorkspaceOverviewPanel";

export default function WorkspacePage() {
  return (
    <WorkspaceShell>
      <WorkspaceMetricsCards />
      <WorkspaceOverviewPanel />
    </WorkspaceShell>
  );
}
