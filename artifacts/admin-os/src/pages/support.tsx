import { useState } from "react";
import {
  useGetSupportTickets,
  useGetSupportTicket,
  useRespondSupportTicket,
  useResolveSupportTicket,
  getGetSupportTicketsQueryKey,
  getGetSupportTicketQueryKey,
  getGetAdminOverviewQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, CheckCircle2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/context/LanguageContext";

export default function SupportPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLang();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const { data: listResp, isLoading } = useGetSupportTickets();
  const tickets = listResp?.data ?? [];

  const { data: detailResp, isLoading: detailLoading } = useGetSupportTicket(selectedId ?? "", {
    query: { queryKey: getGetSupportTicketQueryKey(selectedId ?? ""), enabled: !!selectedId },
  });
  const ticket = detailResp?.data;

  const respond = useRespondSupportTicket();
  const resolve = useResolveSupportTicket();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetSupportTicketsQueryKey() });
    if (selectedId) queryClient.invalidateQueries({ queryKey: getGetSupportTicketQueryKey(selectedId) });
    queryClient.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() });
  };

  const sendReply = () => {
    if (!selectedId || !reply.trim()) return;
    respond.mutate(
      { id: selectedId, data: { message: reply.trim() } },
      {
        onSuccess: () => {
          setReply("");
          invalidate();
        },
        onError: () => toast({ title: t("supportPage.failedSend"), variant: "destructive" }),
      }
    );
  };

  const setStatus = (status: "open" | "closed") => {
    if (!selectedId) return;
    resolve.mutate(
      { id: selectedId, data: { status } },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: status === "closed" ? t("supportPage.toastClosed") : t("supportPage.toastReopened") });
        },
        onError: () => toast({ title: t("supportPage.actionFailed"), variant: "destructive" }),
      }
    );
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("supportPage.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("supportPage.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* List */}
        <div className="border rounded-md bg-card overflow-hidden">
          {isLoading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !tickets.length ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              {t("supportPage.empty")}
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[70vh] overflow-y-auto">
              {tickets.map((tk: (typeof tickets)[number]) => (
                <button
                  key={tk.id}
                  onClick={() => setSelectedId(tk.id!)}
                  className={cn(
                    "w-full text-start p-4 hover:bg-muted/50 transition-colors",
                    selectedId === tk.id && "bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{tk.subject}</span>
                    <Badge variant={tk.status === "open" ? "destructive" : "secondary"} className="shrink-0">
                      {tk.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    {tk.user_name ?? t("supportPage.unknown")} · {tk.message_count ?? 0} {t("supportPage.msgs")}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="border rounded-md bg-card flex flex-col min-h-[400px]">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              {t("supportPage.selectPrompt")}
            </div>
          ) : detailLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : ticket ? (
            <>
              <div className="p-4 border-b border-border flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{ticket.subject}</h2>
                  <p className="text-xs text-muted-foreground">
                    {ticket.user_name ?? t("supportPage.unknown")}{ticket.category ? ` · ${ticket.category}` : ""}
                  </p>
                </div>
                {ticket.status === "open" ? (
                  <Button size="sm" variant="outline" disabled={resolve.isPending}
                    onClick={() => setStatus("closed")}>
                    <CheckCircle2 className="w-4 h-4 me-1" /> {t("supportPage.close")}
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" disabled={resolve.isPending}
                    onClick={() => setStatus("open")}>
                    <RotateCcw className="w-4 h-4 me-1" /> {t("supportPage.reopen")}
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[50vh]">
                {(ticket.messages ?? []).map((m: NonNullable<typeof ticket.messages>[number]) => (
                  <div key={m.id} className={cn("flex", m.is_admin ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                      m.is_admin ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <div className="text-[10px] opacity-70 mb-0.5">
                        {m.is_admin ? t("supportPage.supportLabel") : m.author_name ?? t("supportPage.userLabel")}
                      </div>
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border flex gap-2">
                <Textarea
                  placeholder={t("supportPage.replyPh")}
                  value={reply}
                  rows={2}
                  onChange={(e) => setReply(e.target.value)}
                  className="resize-none"
                />
                <Button onClick={sendReply} disabled={respond.isPending || !reply.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
