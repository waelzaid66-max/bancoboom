import { useEffect, useMemo, useRef, useState } from "react";
import {
  useGetFinancingRequests,
  getGetFinancingRequestsQueryKey,
  useUpdateFinancingRequest,
  useGetFinancingIntermediaries,
  getGetFinancingIntermediariesQueryKey,
  useCreateFinancingIntermediary,
  useUpdateFinancingIntermediary,
  useGetFinancingBranches,
  getGetFinancingBranchesQueryKey,
  useCreateFinancingBranch,
  useGetFinancingSeats,
  getGetFinancingSeatsQueryKey,
  useCreateFinancingSeat,
  CreateFinancingSeatBodyRole,
  type FinancingRequest,
  type FinancingIntermediary,
  type GetFinancingRequestsParams,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Download, Plus, Search, Building2, Pencil, Network } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/context/LanguageContext";

const STATUSES = ["new", "forwarded", "contacted", "closed", "rejected"] as const;
type Status = (typeof STATUSES)[number];

const CATEGORIES = ["car", "real_estate", "industrial"] as const;

const STATUS_STYLE: Record<Status, string> = {
  new: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  forwarded: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  contacted: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  closed: "bg-green-500/15 text-green-400 border-green-500/30",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
};

const CATEGORY_LABEL: Record<string, string> = {
  car: "Car",
  real_estate: "Real Estate",
  industrial: "Industrial",
};

const UNASSIGNED = "__none__";

function fmtMoney(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function FinancingPage() {
  const { toast } = useToast();
  const { t } = useLang();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);

  // Cursor stack for prev/next page navigation. cursorStack[i] is the cursor used
  // to fetch page i+1 (page 1 = undefined). The table renders the current page
  // directly from react-query data, so mutations/invalidation always show fresh
  // rows (no separately-accumulated local copy to go stale).
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([undefined]);
  const cursor = cursorStack[cursorStack.length - 1];

  const PAGE_SIZE = 50;

  const params: GetFinancingRequestsParams = useMemo(() => {
    const p: GetFinancingRequestsParams = { limit: PAGE_SIZE };
    if (category !== "all") p.category = category as GetFinancingRequestsParams["category"];
    if (status !== "all") p.status = status as GetFinancingRequestsParams["status"];
    if (search) p.search = search;
    if (dateFrom) p.date_from = dateFrom;
    if (dateTo) p.date_to = dateTo;
    if (cursor) p.cursor = cursor;
    return p;
  }, [category, status, search, dateFrom, dateTo, cursor]);

  // Reset paging to the first page whenever a filter changes.
  const filterKey = `${category}|${status}|${search}|${dateFrom}|${dateTo}`;
  const lastFilterKey = useRef(filterKey);
  useEffect(() => {
    if (lastFilterKey.current !== filterKey) {
      lastFilterKey.current = filterKey;
      setCursorStack([undefined]);
    }
  }, [filterKey]);

  const { data: resp, isLoading, isFetching } = useGetFinancingRequests(params, {
    query: { queryKey: getGetFinancingRequestsQueryKey(params) },
  });

  // Render straight from react-query — invalidation after a save refetches this
  // exact page and the table updates immediately.
  const requests = resp?.data ?? [];
  const nextCursor = resp?.meta?.cursor;
  const page = cursorStack.length;
  const hasNext = Boolean(resp?.meta?.has_next && nextCursor);
  const hasPrev = cursorStack.length > 1;

  const goNext = () => {
    if (nextCursor) setCursorStack((s) => [...s, nextCursor]);
  };
  const goPrev = () => {
    setCursorStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  };

  const { data: intermResp } = useGetFinancingIntermediaries({
    query: { queryKey: getGetFinancingIntermediariesQueryKey() },
  });
  const intermediaries = intermResp?.data ?? [];

  const updateRequest = useUpdateFinancingRequest();

  const refetchRequests = () =>
    queryClient.invalidateQueries({ queryKey: getGetFinancingRequestsQueryKey(params) });

  async function applyUpdate(
    leadId: string,
    body: { status?: Status; intermediary_id?: string | null; notes?: string | null },
  ) {
    try {
      await updateRequest.mutateAsync({ leadId, data: body });
      await refetchRequests();
      toast({ title: t("financingPage.toastUpdated"), description: t("financingPage.toastRequestSaved") });
    } catch {
      toast({ title: t("financingPage.toastUpdateFailed"), description: t("financingPage.toastCouldNotSaveChange"), variant: "destructive" });
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const qs = new URLSearchParams();
      if (category !== "all") qs.set("category", category);
      if (status !== "all") qs.set("status", status);
      if (search) qs.set("search", search);
      if (dateFrom) qs.set("date_from", dateFrom);
      if (dateTo) qs.set("date_to", dateTo);
      const url = `/api/v1/admin/financing/requests/export${qs.toString() ? `?${qs.toString()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `financing-requests-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch {
      toast({ title: t("financingPage.toastExportFailed"), description: t("financingPage.toastCouldNotExport"), variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("financingPage.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("financingPage.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <IntermediariesDialog intermediaries={intermediaries} />
          <Button onClick={handleExport} disabled={exporting} variant="outline">
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("financingPage.searchPh")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSearch(searchInput.trim());
            }}
            className="pl-9 w-[260px]"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("financingPage.category")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("financingPage.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[150px]"
            aria-label="Requested from"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[150px]"
            aria-label="Requested to"
          />
        </div>
        {(category !== "all" || status !== "all" || search || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            onClick={() => {
              setCategory("all");
              setStatus("all");
              setSearch("");
              setSearchInput("");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="border rounded-md bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Listing</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Amount &amp; Terms</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Intermediary</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead className="text-right">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : !requests.length ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No financing requests.
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req) => (
                <RequestRow
                  key={req.lead_id}
                  req={req}
                  intermediaries={intermediaries}
                  busy={updateRequest.isPending}
                  onUpdate={applyUpdate}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-muted-foreground">
          {isLoading
            ? "Loading…"
            : `Page ${page} · ${requests.length} request${requests.length === 1 ? "" : "s"}`}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={!hasPrev || isFetching} onClick={goPrev}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={!hasNext || isFetching} onClick={goNext}>
            {isFetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function RequestRow({
  req,
  intermediaries,
  busy,
  onUpdate,
}: {
  req: FinancingRequest;
  intermediaries: FinancingIntermediary[];
  busy: boolean;
  onUpdate: (
    leadId: string,
    body: { status?: Status; intermediary_id?: string | null; notes?: string | null },
  ) => void;
}) {
  const { t } = useLang();
  const leadId = req.lead_id ?? "";
  return (
    <TableRow>
      <TableCell className="font-medium truncate max-w-[220px]">{req.listing_title}</TableCell>
      <TableCell>
        <Badge variant="outline">{CATEGORY_LABEL[req.category ?? ""] ?? req.category}</Badge>
      </TableCell>
      <TableCell>
        <div>{req.buyer_name ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{req.buyer_phone ?? ""}</div>
      </TableCell>
      <TableCell className="text-sm whitespace-nowrap">
        <div>Price: {fmtMoney(req.asset_price)}</div>
        <div className="text-xs text-muted-foreground">
          {fmtMoney(req.monthly_payment)}/mo
          {req.duration_months ? ` × ${req.duration_months}m` : ""}
          {req.down_payment ? ` · ${fmtMoney(req.down_payment)} down` : ""}
        </div>
      </TableCell>
      <TableCell>
        <Select
          value={req.status ?? "new"}
          onValueChange={(v) => onUpdate(leadId, { status: v as Status })}
          disabled={busy}
        >
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue>
              <Badge variant="outline" className={`capitalize ${STATUS_STYLE[(req.status ?? "new") as Status]}`}>
                {req.status ?? "new"}
              </Badge>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={req.intermediary_id ?? UNASSIGNED}
          onValueChange={(v) =>
            onUpdate(leadId, { intermediary_id: v === UNASSIGNED ? null : v })
          }
          disabled={busy}
        >
          <SelectTrigger className="w-[170px] h-8">
            <SelectValue placeholder={t("financingPage.unassigned")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {intermediaries
              .filter((im) => im.is_active || im.id === req.intermediary_id)
              .map((im) => (
                <SelectItem key={im.id} value={im.id ?? ""}>{im.name}</SelectItem>
              ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
        {req.created_at ? new Date(req.created_at).toLocaleDateString() : "—"}
      </TableCell>
      <TableCell className="text-right">
        <NotesDialog req={req} onSave={(notes) => onUpdate(leadId, { notes })} />
      </TableCell>
    </TableRow>
  );
}

function NotesDialog({ req, onSave }: { req: FinancingRequest; onSave: (notes: string) => void }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(req.notes ?? "");

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setValue(req.notes ?? "");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="w-3.5 h-3.5 mr-1" />
          {req.notes ? "Edit" : "Add"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>CRM Notes</DialogTitle>
          <DialogDescription className="truncate">{req.listing_title}</DialogDescription>
        </DialogHeader>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={5}
          placeholder={t("financingPage.notesPh")}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              onSave(value);
              setOpen(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InstitutionOpsDialog({
  intermediary,
  open,
  onOpenChange,
}: {
  intermediary: FinancingIntermediary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const { t } = useLang();
  const queryClient = useQueryClient();
  const id = intermediary?.id ?? "";

  const [branchName, setBranchName] = useState("");
  const [branchCity, setBranchCity] = useState("");
  const [seatUserId, setSeatUserId] = useState("");
  const [seatRole, setSeatRole] = useState<"manager" | "agent">("agent");
  const [seatBranchId, setSeatBranchId] = useState<string>(UNASSIGNED);

  const branchesQuery = useGetFinancingBranches(id, {
    query: {
      queryKey: getGetFinancingBranchesQueryKey(id),
      enabled: open && !!id,
    },
  });
  const seatsQuery = useGetFinancingSeats(id, {
    query: {
      queryKey: getGetFinancingSeatsQueryKey(id),
      enabled: open && !!id,
    },
  });
  const createBranch = useCreateFinancingBranch();
  const createSeat = useCreateFinancingSeat();

  const branches = branchesQuery.data?.data ?? [];
  const seats = seatsQuery.data?.data ?? [];

  async function handleAddBranch() {
    if (!id || !branchName.trim()) return;
    try {
      await createBranch.mutateAsync({
        id,
        data: {
          name: branchName.trim(),
          city: branchCity.trim() || null,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getGetFinancingBranchesQueryKey(id) });
      setBranchName("");
      setBranchCity("");
      toast({ title: t("financingPage.toastSaved"), description: t("financingPage.toastBranchSaved") });
    } catch {
      toast({
        title: t("financingPage.toastSaveFailed"),
        description: t("financingPage.toastCouldNotSaveBranch"),
        variant: "destructive",
      });
    }
  }

  async function handleAddSeat() {
    if (!id || !seatUserId.trim()) return;
    try {
      await createSeat.mutateAsync({
        id,
        data: {
          user_id: seatUserId.trim(),
          role:
            seatRole === "manager"
              ? CreateFinancingSeatBodyRole.manager
              : CreateFinancingSeatBodyRole.agent,
          branch_id: seatBranchId === UNASSIGNED ? null : seatBranchId,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getGetFinancingSeatsQueryKey(id) });
      setSeatUserId("");
      setSeatBranchId(UNASSIGNED);
      toast({ title: t("financingPage.toastSaved"), description: t("financingPage.toastSeatSaved") });
    } catch {
      toast({
        title: t("financingPage.toastSaveFailed"),
        description: t("financingPage.toastCouldNotSaveSeat"),
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("financingPage.manageInstitution")}</DialogTitle>
          <DialogDescription>{intermediary?.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-2">
            <h3 className="text-sm font-medium">{t("financingPage.branches")}</h3>
            <div className="max-h-28 overflow-y-auto space-y-1 border rounded-md p-2">
              {!branches.length ? (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  {t("financingPage.noBranches")}
                </p>
              ) : (
                branches.map((b) => (
                  <div key={b.id} className="text-sm flex justify-between gap-2">
                    <span>{b.name}</span>
                    <span className="text-xs text-muted-foreground">{b.city || "—"}</span>
                  </div>
                ))
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder={t("financingPage.branchName")}
              />
              <Input
                value={branchCity}
                onChange={(e) => setBranchCity(e.target.value)}
                placeholder={t("financingPage.branchCity")}
              />
            </div>
            <Button
              size="sm"
              onClick={handleAddBranch}
              disabled={createBranch.isPending || !branchName.trim()}
            >
              {createBranch.isPending && <Loader2 className="w-3.5 h-3.5 me-2 animate-spin" />}
              {t("financingPage.addBranch")}
            </Button>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-medium">{t("financingPage.seats")}</h3>
            <div className="max-h-28 overflow-y-auto space-y-1 border rounded-md p-2">
              {!seats.length ? (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  {t("financingPage.noSeats")}
                </p>
              ) : (
                seats.map((s) => (
                  <div key={s.id} className="text-sm">
                    <span className="font-medium">{s.user_name || s.user_id}</span>
                    <span className="text-xs text-muted-foreground ms-2">
                      {s.role}
                      {s.branch_id ? ` · ${branches.find((b) => b.id === s.branch_id)?.name || s.branch_id}` : ""}
                    </span>
                  </div>
                ))
              )}
            </div>
            <Input
              value={seatUserId}
              onChange={(e) => setSeatUserId(e.target.value)}
              placeholder={t("financingPage.seatUserId")}
            />
            <div className="grid grid-cols-2 gap-2">
              <Select value={seatRole} onValueChange={(v) => setSeatRole(v as "manager" | "agent")}>
                <SelectTrigger>
                  <SelectValue placeholder={t("financingPage.seatRole")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">manager</SelectItem>
                  <SelectItem value="agent">agent</SelectItem>
                </SelectContent>
              </Select>
              <Select value={seatBranchId} onValueChange={setSeatBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("financingPage.seatBranch")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>{t("financingPage.unassigned")}</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id!}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              onClick={handleAddSeat}
              disabled={createSeat.isPending || !seatUserId.trim()}
            >
              {createSeat.isPending && <Loader2 className="w-3.5 h-3.5 me-2 animate-spin" />}
              {t("financingPage.addSeat")}
            </Button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IntermediariesDialog({ intermediaries }: { intermediaries: FinancingIntermediary[] }) {
  const { toast } = useToast();
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FinancingIntermediary | null>(null);
  const [opsTarget, setOpsTarget] = useState<FinancingIntermediary | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [active, setActive] = useState(true);

  const createInterm = useCreateFinancingIntermediary();
  const updateInterm = useUpdateFinancingIntermediary();
  const busy = createInterm.isPending || updateInterm.isPending;

  const refetch = () =>
    queryClient.invalidateQueries({ queryKey: getGetFinancingIntermediariesQueryKey() });

  function resetForm() {
    setEditing(null);
    setName("");
    setEmail("");
    setPhone("");
    setNotes("");
    setOwnerUserId("");
    setActive(true);
  }

  function startEdit(im: FinancingIntermediary) {
    setEditing(im);
    setName(im.name ?? "");
    setEmail(im.contact_email ?? "");
    setPhone(im.contact_phone ?? "");
    setNotes(im.notes ?? "");
    setOwnerUserId(im.owner_user_id ?? "");
    setActive(im.is_active ?? true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast({ title: t("financingPage.toastNameRequired"), variant: "destructive" });
      return;
    }
    try {
      if (editing?.id) {
        await updateInterm.mutateAsync({
          id: editing.id,
          data: {
            name: name.trim(),
            contact_email: email.trim() || null,
            contact_phone: phone.trim() || null,
            notes: notes.trim() || null,
            is_active: active,
            owner_user_id: ownerUserId.trim() || null,
          },
        });
      } else {
        await createInterm.mutateAsync({
          data: {
            name: name.trim(),
            contact_email: email.trim() || null,
            contact_phone: phone.trim() || null,
            notes: notes.trim() || null,
          },
        });
      }
      await refetch();
      toast({ title: t("financingPage.toastSaved"), description: t("financingPage.toastIntermediarySaved") });
      resetForm();
    } catch {
      toast({ title: t("financingPage.toastSaveFailed"), description: t("financingPage.toastCouldNotSaveIntermediary"), variant: "destructive" });
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline">
            <Building2 className="w-4 h-4 mr-2" />
            Intermediaries
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Banks &amp; Financiers</DialogTitle>
            <DialogDescription>Manage the intermediaries you forward finance requests to.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
            {!intermediaries.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No intermediaries yet.</p>
            ) : (
              intermediaries.map((im) => (
                <div key={im.id} className="flex items-center justify-between border rounded-md p-3 gap-2">
                  <div className="min-w-0">
                    <div className="font-medium flex items-center gap-2">
                      {im.name}
                      {!im.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                      {im.owner_user_id && (
                        <Badge variant="outline" className="text-xs">linked</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[im.contact_email, im.contact_phone].filter(Boolean).join(" · ") || "No contact info"}
                    </div>
                    {im.owner_user_id ? (
                      <div className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">
                        owner: {im.owner_user_id}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setOpsTarget(im)} title={t("financingPage.manageInstitution")}>
                      <Network className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => startEdit(im)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2 font-medium text-sm">
              {editing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editing ? "Edit intermediary" : "Add intermediary"}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. National Bank" />
              </div>
              <div>
                <Label className="text-xs">Contact email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="optional" />
              </div>
              <div>
                <Label className="text-xs">Contact phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="optional" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="optional" />
              </div>
              {editing && (
                <>
                  <div className="col-span-2">
                    <Label className="text-xs">{t("financingPage.ownerUserId")}</Label>
                    <Input
                      value={ownerUserId}
                      onChange={(e) => setOwnerUserId(e.target.value)}
                      placeholder={t("financingPage.ownerUserIdPh")}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Switch checked={active} onCheckedChange={setActive} id="interm-active" />
                    <Label htmlFor="interm-active" className="text-sm">Active</Label>
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            {editing && (
              <Button variant="ghost" onClick={resetForm} disabled={busy}>{t("financingPage.cancelEdit")}</Button>
            )}
            <Button onClick={handleSave} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Save changes" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InstitutionOpsDialog
        intermediary={opsTarget}
        open={!!opsTarget}
        onOpenChange={(o) => {
          if (!o) setOpsTarget(null);
        }}
      />
    </>
  );
}
