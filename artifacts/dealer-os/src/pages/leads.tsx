import { useState } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { useGetDealerLeads, getGetDealerLeadsQueryKey, useUpdateLeadStatus } from "@workspace/api-client-react";
import { useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageCircle, Phone, MessageSquare, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/LanguageContext";

const ACTION_ICONS: Record<string, any> = {
  whatsapp: MessageCircle,
  call: Phone,
  chat: MessageSquare,
  finance_request: Briefcase,
};

const ACTION_COLORS: Record<string, string> = {
  whatsapp: "text-green-500 bg-green-500/10 border-green-500/20",
  call: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  chat: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  finance_request: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
};

export default function LeadsPage() {
  const { user } = useClerk();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useI18n();

  // Translate an action/status enum for display; fall back to a readable raw value.
  const actionLabel = (a: string) => {
    const key = `leads.action.${a}`;
    const tr = t(key);
    return tr === key ? a.replace("_", " ") : tr;
  };

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allLeads, setAllLeads] = useState<any[]>([]);

  const params = {
    limit: 25,
    ...(statusFilter !== "all" ? { status: statusFilter as any } : {}),
    ...(cursor ? { cursor } : {}),
  };

  const { data: leadsData, isLoading, isFetching } = useGetDealerLeads(
    params,
    {
      query: {
        enabled: !!user,
        queryKey: getGetDealerLeadsQueryKey(params),
      }
    }
  );

  const updateStatusMutation = useUpdateLeadStatus();

  // When new page loads, append results
  const [pageLeads, setPageLeads] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);

  const currentPage = leadsData?.data ?? [];
  const currentNextCursor = (leadsData as any)?.meta?.cursor ?? undefined;

  const handleStatusChange = (id: string, newStatus: string) => {
    updateStatusMutation.mutate({ id, data: { status: newStatus as any } }, {
      onSuccess: () => {
        toast({ title: t("leads.toast.updated") });
        queryClient.invalidateQueries({ queryKey: getGetDealerLeadsQueryKey() });
      },
      onError: () => {
        toast({ title: t("leads.toast.updateFailed"), variant: "destructive" });
      }
    });
  };

  // Reset pagination when filter changes
  const handleFilterChange = (f: string) => {
    setStatusFilter(f);
    setCursor(undefined);
  };

  const leads = currentPage;
  const hasNextPage = !!currentNextCursor;

  // Calculate funnel counts locally if API doesn't provide it
  const funnel = {
    new: leads.filter(l => l.status === "new").length,
    contacted: leads.filter(l => l.status === "contacted").length,
    closed: leads.filter(l => l.status === "closed").length,
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("leads.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("leads.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter("new")}>
            <div className="text-muted-foreground font-medium">{t("leads.funnelNew")}</div>
            <div className="text-2xl font-bold text-foreground">{funnel.new}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter("contacted")}>
            <div className="text-muted-foreground font-medium">{t("leads.funnelContacted")}</div>
            <div className="text-2xl font-bold text-foreground">{funnel.contacted}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter("closed")}>
            <div className="text-muted-foreground font-medium">{t("leads.funnelClosed")}</div>
            <div className="text-2xl font-bold text-foreground">{funnel.closed}</div>
          </div>
        </div>

        <div className="flex gap-2">
          {["all", "new", "contacted", "closed"].map(f => (
            <Badge
              key={f}
              variant={statusFilter === f ? "default" : "outline"}
              className={`cursor-pointer ${statusFilter === f ? "bg-primary text-white" : "border-border text-muted-foreground"}`}
              onClick={() => handleFilterChange(f)}
            >
              {f === "all" ? t("leads.all") : t(`leads.status.${f}`)}
            </Badge>
          ))}
        </div>

        <div className="rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground pl-4">{t("leads.colBuyer")}</TableHead>
                <TableHead className="text-muted-foreground">{t("leads.colAsset")}</TableHead>
                <TableHead className="text-muted-foreground">{t("leads.colAction")}</TableHead>
                <TableHead className="text-muted-foreground">{t("leads.colDate")}</TableHead>
                <TableHead className="text-muted-foreground text-right pr-4">{t("leads.colStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : leads.length ? (
                leads.map((lead) => {
                  const Icon = ACTION_ICONS[lead.action_type || "chat"] || MessageSquare;
                  return (
                    <TableRow key={lead.id} className="border-border hover:bg-muted/50">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-foreground">{lead.buyer_name || t("leads.unknownBuyer")}</span>
                          <span className="text-xs text-muted-foreground">{lead.buyer_phone || t("leads.noPhone")}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {lead.listing_title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`flex items-center gap-1 w-fit ${ACTION_COLORS[lead.action_type || "chat"]}`}>
                          <Icon className="w-3 h-3" />
                          <span>{actionLabel(lead.action_type || "chat")}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={lead.status || "new"}
                          onValueChange={(val) => handleStatusChange(lead.id!, val)}
                        >
                          <SelectTrigger className="w-[130px] ml-auto border-border bg-input h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">{t("leads.status.new")}</SelectItem>
                            <SelectItem value="contacted">{t("leads.status.contacted")}</SelectItem>
                            <SelectItem value="closed">{t("leads.status.closed")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {t("leads.noLeads")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            {t("leads.showing", { count: leads.length })}
            {cursor ? t("leads.pagePlus") : ""}
          </span>
          <div className="flex gap-2">
            {cursor && (
              <Button
                variant="outline"
                size="sm"
                className="border-border"
                onClick={() => setCursor(undefined)}
                data-testid="btn-first-page"
              >
                {t("leads.firstPage")}
              </Button>
            )}
            {hasNextPage && (
              <Button
                variant="outline"
                size="sm"
                className="border-border"
                disabled={isFetching}
                onClick={() => setCursor(currentNextCursor)}
                data-testid="btn-next-page"
              >
                {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : t("leads.loadMore")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
