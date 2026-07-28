import { useState } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import {
  useGetDealerListings, getGetDealerListingsQueryKey,
  useDealerBulkAction, useBoostListing,
  useGetPromoAdSummary, getGetPromoAdSummaryQueryKey
} from "@workspace/api-client-react";
import { useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  flexRender, getCoreRowModel, useReactTable,
  getSortedRowModel, getPaginationRowModel, ColumnDef
} from "@tanstack/react-table";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Car, Factory, Home, ArrowUpRight, Archive, CheckCircle, Plus, Pencil, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { DealerListing } from "@workspace/api-client-react";
import { ListingFormSheet } from "@/components/listing-form-sheet";
import { useI18n } from "@/i18n/LanguageContext";

const CATEGORY_ICONS: Record<string, any> = {
  car: Car,
  real_estate: Home,
  industrial: Factory,
};

export default function ListingsPage() {
  const { user } = useClerk();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useI18n();

  // Translate a status enum for display; fall back to the raw value if unmapped.
  const statusLabel = (s: string) => {
    const key = `listings.status.${s}`;
    const tr = t(key);
    return tr === key ? s : tr;
  };

  const [rowSelection, setRowSelection] = useState({});
  const [boostModalOpen, setBoostModalOpen] = useState(false);
  const [boostListingId, setBoostListingId] = useState<string | null>(null);
  const [boostType, setBoostType] = useState<"featured" | "native_feed" | "top_search">("featured");
  const [boostDuration, setBoostDuration] = useState("7");

  const { data: listingsData, isLoading } = useGetDealerListings(
    { limit: 100 },
    { query: { enabled: !!user, queryKey: getGetDealerListingsQueryKey({ limit: 100 }) } }
  );

  const bulkActionMutation = useDealerBulkAction();
  const boostMutation = useBoostListing();

  const { data: promoResp } = useGetPromoAdSummary({
    query: { enabled: !!user, queryKey: getGetPromoAdSummaryQueryKey() },
  });
  const promo = promoResp?.data;
  const promoBalance = promo ? Number(promo.balance) : 0;
  const hasPromo = !!promo?.campaign_enabled && promoBalance > 0;
  const refreshPromo = () =>
    queryClient.invalidateQueries({ queryKey: getGetPromoAdSummaryQueryKey() });

  const [bulkBoostOpen, setBulkBoostOpen] = useState(false);
  const [bulkBoostType, setBulkBoostType] = useState<"featured" | "native_feed" | "top_search">("featured");
  const [bulkBoostDuration, setBulkBoostDuration] = useState("7");

  const [formOpen, setFormOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<DealerListing | null>(null);

  const openCreate = () => { setEditingListing(null); setFormOpen(true); };
  const openEdit = (l: DealerListing) => { setEditingListing(l); setFormOpen(true); };

  const handleBulkAction = (action: "activate" | "archive" | "delete") => {
    const selectedIds = Object.keys(rowSelection).map(idx => listingsData?.data?.[parseInt(idx)]?.id).filter(Boolean) as string[];
    if (!selectedIds.length) return;

    const toastKey = action === "activate"
      ? "listings.toast.bulkActivated"
      : action === "archive"
        ? "listings.toast.bulkArchived"
        : "listings.toast.bulkDeleted";

    bulkActionMutation.mutate({ data: { listing_ids: selectedIds, action } }, {
      onSuccess: () => {
        toast({ title: t(toastKey, { count: selectedIds.length }) });
        setRowSelection({});
        queryClient.invalidateQueries({ queryKey: getGetDealerListingsQueryKey({ limit: 100 }) });
      },
      onError: () => {
        toast({ title: t("listings.toast.actionFailed"), variant: "destructive" });
      }
    });
  };

  const handleBulkBoost = () => {
    const selectedIds = Object.keys(rowSelection).map(idx => listingsData?.data?.[parseInt(idx)]?.id).filter(Boolean) as string[];
    if (!selectedIds.length) return;
    let completed = 0;
    let failed = 0;
    const total = selectedIds.length;
    selectedIds.forEach(id => {
      boostMutation.mutate(
        { data: { listing_id: id, ad_type: bulkBoostType, duration_days: parseInt(bulkBoostDuration) } },
        {
          onSuccess: () => {
            completed++;
            if (completed + failed === total) {
              toast({ title: failed
                ? t("listings.toast.boostedNfailed", { count: completed, failed })
                : t("listings.toast.boostedN", { count: completed }) });
              setBulkBoostOpen(false);
              setRowSelection({});
              refreshPromo();
            }
          },
          onError: () => {
            failed++;
            if (completed + failed === total) {
              toast({ title: t("listings.toast.boostedNfailed", { count: completed, failed }), variant: failed === total ? "destructive" : "default" });
              setBulkBoostOpen(false);
              refreshPromo();
            }
          },
        }
      );
    });
  };

  const handleStatusToggle = (id: string, currentStatus: string) => {
    const action = currentStatus === "active" ? "archive" : "activate";
    bulkActionMutation.mutate({ data: { listing_ids: [id], action } }, {
      onSuccess: () => {
        toast({ title: action === "activate" ? t("listings.toast.activated") : t("listings.toast.archived") });
        queryClient.invalidateQueries({ queryKey: getGetDealerListingsQueryKey({ limit: 100 }) });
      }
    });
  };

  const handleBoostSubmit = () => {
    if (!boostListingId) return;
    boostMutation.mutate({
      data: { listing_id: boostListingId, ad_type: boostType, duration_days: parseInt(boostDuration) }
    }, {
      onSuccess: (res) => {
        const promoUsed = Number(res?.data?.promo_used ?? "0");
        const walletCharged = Number(res?.data?.wallet_charged ?? "0");
        const description =
          promoUsed > 0 && walletCharged <= 0
            ? t("listings.toast.paidPromoOnly", { amount: promoUsed.toLocaleString() })
            : promoUsed > 0
              ? t("listings.toast.paidPromoWallet", { promo: promoUsed.toLocaleString(), wallet: walletCharged.toLocaleString() })
              : undefined;
        toast({ title: t("listings.toast.boostSuccess"), description });
        setBoostModalOpen(false);
        refreshPromo();
      },
      onError: () => {
        toast({ title: t("listings.toast.boostFailed"), variant: "destructive" });
      }
    });
  };

  const columns: ColumnDef<DealerListing>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t("listings.selectAll")}
          className="border-white/20"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t("listings.selectRow")}
          className="border-white/20"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "title",
      header: t("listings.colListing"),
      cell: ({ row }) => {
        const cat = row.original.category || "car";
        const Icon = CATEGORY_ICONS[cat] || Car;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-sm text-foreground">{row.original.title}</span>
              <span className="text-xs text-muted-foreground">{row.original.location}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "price_display",
      header: t("listings.colPrice"),
      cell: ({ row }) => <span className="text-sm">{row.original.price_display}</span>,
    },
    {
      accessorKey: "status",
      header: t("listings.colStatus"),
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge
            variant="outline"
            className={status === "active" ? "border-green-500 text-green-500" : "border-muted-foreground text-muted-foreground"}
          >
            {statusLabel(status || "archived")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "views",
      header: t("listings.colViews"),
      cell: ({ row }) => <span className="text-sm">{row.original.views || 0}</span>,
    },
    {
      accessorKey: "leads",
      header: t("listings.colLeads"),
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.leads || 0}</span>,
    },
    {
      id: "actions",
      header: t("listings.colActions"),
      cell: ({ row }) => {
        const isActive = row.original.status === "active";
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-white/10"
              onClick={() => openEdit(row.original)}
              data-testid={`btn-edit-${row.original.id}`}
            >
              <Pencil className="w-4 h-4 mr-2" />
              {t("listings.edit")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-white/10"
              onClick={() => handleStatusToggle(row.original.id!, row.original.status || "archived")}
              data-testid={`btn-toggle-${row.original.id}`}
            >
              {isActive ? <Archive className="w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              {isActive ? t("listings.archive") : t("listings.activate")}
            </Button>
            <Button
              size="sm"
              className="h-8 bg-primary hover:bg-primary/90 text-white"
              onClick={() => {
                setBoostListingId(row.original.id!);
                setBoostModalOpen(true);
              }}
              data-testid={`btn-boost-${row.original.id}`}
            >
              <ArrowUpRight className="w-4 h-4 mr-1" />
              {t("listings.boost")}
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: listingsData?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("listings.title")}</h1>
            <p className="text-muted-foreground mt-2">{t("listings.subtitle")}</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white" onClick={openCreate} data-testid="btn-new-listing">
            <Plus className="w-4 h-4 mr-2" />
            {t("listings.newListing")}
          </Button>
        </div>

        {selectedCount > 0 && (
          <div className="bg-muted p-3 rounded-lg border border-border flex items-center justify-between">
            <span className="text-sm font-medium">{t("listings.selected", { count: selectedCount })}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => handleBulkAction("archive")} data-testid="btn-bulk-archive">{t("listings.bulkArchive")}</Button>
              <Button size="sm" variant="default" onClick={() => handleBulkAction("activate")} data-testid="btn-bulk-activate">{t("listings.bulkActivate")}</Button>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-white"
                onClick={() => setBulkBoostOpen(true)}
                data-testid="btn-bulk-boost"
              >
                <ArrowUpRight className="w-4 h-4 mr-1" />
                {t("listings.bulkBoost")}
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-border hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-muted-foreground">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="border-border hover:bg-muted/50">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    {t("listings.noListings")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="border-border"
          >
            {t("listings.previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="border-border"
          >
            {t("listings.next")}
          </Button>
        </div>
      </div>

      <Dialog open={boostModalOpen} onOpenChange={setBoostModalOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("listings.boostDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("listings.boostDialog.desc")}
            </DialogDescription>
          </DialogHeader>
          {hasPromo ? (
            <div className="flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/10 p-3">
              <Gift className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-primary">
                  {t("listings.boostDialog.creditAvailable", { amount: promoBalance.toLocaleString() })}
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {t("listings.boostDialog.creditApplied")}
                  {promo?.expires_at
                    ? ` ${t("listings.boostDialog.expires", { date: new Date(promo.expires_at).toLocaleDateString() })}`
                    : ""}
                </p>
              </div>
            </div>
          ) : null}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t("listings.boostDialog.adType")}</label>
              <Select value={boostType} onValueChange={(v: any) => setBoostType(v)}>
                <SelectTrigger className="border-border bg-input">
                  <SelectValue placeholder={t("listings.boostDialog.adType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">{t("listings.boostDialog.featured")}</SelectItem>
                  <SelectItem value="native_feed">{t("listings.boostDialog.nativeFeed")}</SelectItem>
                  <SelectItem value="top_search">{t("listings.boostDialog.topSearch")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t("listings.boostDialog.duration")}</label>
              <Select value={boostDuration} onValueChange={setBoostDuration}>
                <SelectTrigger className="border-border bg-input">
                  <SelectValue placeholder={t("listings.boostDialog.duration")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">{t("listings.boostDialog.days3")}</SelectItem>
                  <SelectItem value="7">{t("listings.boostDialog.days7")}</SelectItem>
                  <SelectItem value="14">{t("listings.boostDialog.days14")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-border" onClick={() => setBoostModalOpen(false)}>{t("listings.boostDialog.cancel")}</Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={handleBoostSubmit}
              disabled={boostMutation.isPending}
            >
              {boostMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("listings.boostDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Boost Dialog */}
      <Dialog open={bulkBoostOpen} onOpenChange={setBulkBoostOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("listings.bulkBoostDialog.title", { count: selectedCount })}</DialogTitle>
            <DialogDescription>
              {t("listings.bulkBoostDialog.desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t("listings.boostDialog.adType")}</label>
              <Select value={bulkBoostType} onValueChange={(v: any) => setBulkBoostType(v)}>
                <SelectTrigger className="border-border bg-input" data-testid="bulk-boost-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">{t("listings.boostDialog.featured")}</SelectItem>
                  <SelectItem value="native_feed">{t("listings.boostDialog.nativeFeed")}</SelectItem>
                  <SelectItem value="top_search">{t("listings.boostDialog.topSearch")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t("listings.boostDialog.duration")}</label>
              <Select value={bulkBoostDuration} onValueChange={setBulkBoostDuration}>
                <SelectTrigger className="border-border bg-input" data-testid="bulk-boost-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">{t("listings.boostDialog.days3")}</SelectItem>
                  <SelectItem value="7">{t("listings.boostDialog.days7")}</SelectItem>
                  <SelectItem value="14">{t("listings.boostDialog.days14")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-border" onClick={() => setBulkBoostOpen(false)}>{t("listings.boostDialog.cancel")}</Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={handleBulkBoost}
              disabled={boostMutation.isPending}
              data-testid="btn-confirm-bulk-boost"
            >
              {boostMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("listings.bulkBoostDialog.confirm", { count: selectedCount })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ListingFormSheet open={formOpen} onOpenChange={setFormOpen} listing={editingListing} />
    </SidebarLayout>
  );
}
