import { useState } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import {
  useListMyInvestments, getListMyInvestmentsQueryKey,
} from "@workspace/api-client-react";
import type { InvestmentSummary } from "@workspace/api-client-react";
import { useClerk } from "@clerk/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Loader2, Plus, Pencil, TrendingUp, ShieldAlert, MapPin,
} from "lucide-react";
import { InvestmentFormSheet } from "@/components/investment-form-sheet";

const TYPE_LABELS: Record<string, string> = {
  factory_sale: "Factory sale",
  business_sale: "Business sale",
  production_line_investment: "Production line",
  franchise: "Franchise",
  partnership: "Partnership",
};

const STATUS_STYLES: Record<string, string> = {
  active: "border-green-500 text-green-500",
  under_offer: "border-blue-500 text-blue-500",
  draft: "border-muted-foreground text-muted-foreground",
  closed: "border-red-500 text-red-500",
};

export default function InvestmentsPage() {
  const { user } = useClerk();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InvestmentSummary | null>(null);

  const { data, isLoading } = useListMyInvestments(
    undefined,
    { query: { enabled: !!user, queryKey: getListMyInvestmentsQueryKey() } },
  );

  const investments = data?.data ?? [];

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (inv: InvestmentSummary) => { setEditing(inv); setFormOpen(true); };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Investments</h1>
            <p className="text-muted-foreground mt-2">List and manage your investment opportunities.</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white" onClick={openCreate} data-testid="btn-new-investment">
            <Plus className="w-4 h-4 mr-2" />
            New Investment
          </Button>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
          <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-200/90">
            Figures provided by the seller — not verified by BANCO. BANCO is a marketplace that connects buyers and
            sellers; deals, payments and shipping happen directly between the parties. Verify counterparties and do your
            own due diligence.
          </p>
        </div>

        <div className="rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Opportunity</TableHead>
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground">Value</TableHead>
                <TableHead className="text-muted-foreground">ROI</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : investments.length ? (
                investments.map((inv: InvestmentSummary) => (
                  <TableRow key={inv.id} className="border-border hover:bg-muted/50" data-testid={`investment-${inv.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-foreground">{inv.title}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{inv.location}
                            {inv.industry ? ` · ${inv.industry}` : ""}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-white/10">
                        {TYPE_LABELS[inv.investment_type] ?? inv.investment_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{inv.total_value_display}</TableCell>
                    <TableCell className="text-sm">
                      {inv.expected_roi_pct != null ? `${inv.expected_roi_pct}%` : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={STATUS_STYLES[inv.status] ?? "border-muted-foreground text-muted-foreground"}
                      >
                        {inv.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-white/10"
                        onClick={() => openEdit(inv)}
                        data-testid={`btn-edit-investment-${inv.id}`}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No investments yet. Create your first opportunity.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {!isLoading && investments.length === 0 && (
          <Card className="bg-card border-card-border">
            <CardContent className="py-10 text-center text-muted-foreground">
              Investment opportunities you list appear here and in the BANCO marketplace.
            </CardContent>
          </Card>
        )}
      </div>

      <InvestmentFormSheet open={formOpen} onOpenChange={setFormOpen} investment={editing} />
    </SidebarLayout>
  );
}
