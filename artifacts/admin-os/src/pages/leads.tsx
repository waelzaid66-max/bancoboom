import { useGetAdminLeads } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/context/LanguageContext";

export default function LeadsPage() {
  const { t } = useLang();
  const { data: resp, isLoading } = useGetAdminLeads();
  const leads = resp?.data ?? [];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("leadsPage.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("leadsPage.subtitle")}</p>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("leadsPage.colListing")}</TableHead>
              <TableHead>{t("leadsPage.colAction")}</TableHead>
              <TableHead>{t("leadsPage.colBuyer")}</TableHead>
              <TableHead>{t("leadsPage.colStatus")}</TableHead>
              <TableHead>{t("leadsPage.colDate")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : !leads.length ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {t("leadsPage.empty")}
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead: (typeof leads)[number]) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium truncate max-w-[280px]">{lead.listing_title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{lead.action_type?.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>{lead.buyer_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{lead.buyer_phone ?? ""}</div>
                  </TableCell>
                  <TableCell className="capitalize">{lead.status}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
