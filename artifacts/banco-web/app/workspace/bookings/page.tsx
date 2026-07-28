import { WorkspaceShell } from "../../../components/workspace/WorkspaceShell";
import { BookingsPanel } from "../../../components/workspace/BookingsPanel";
import { ListBookingsRole } from "@workspace/api-client-react";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WorkspaceBookingsPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) ?? {};
  const roleParam = typeof resolved.role === "string" ? resolved.role : undefined;
  const initialRole =
    roleParam === "host" ? ListBookingsRole.host : ListBookingsRole.guest;

  return (
    <WorkspaceShell>
      <BookingsPanel initialRole={initialRole} />
    </WorkspaceShell>
  );
}
