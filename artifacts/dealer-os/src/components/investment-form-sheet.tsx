import { useEffect, useState } from "react";
import {
  useCreateInvestment,
  useUpdateInvestment,
  useGetInvestment, getGetInvestmentQueryKey,
  getListMyInvestmentsQueryKey,
  CreateInvestmentBodyInvestmentType,
  CreateInvestmentBodyIndustry,
  CreateInvestmentBodyFiguresSource,
  UpdateInvestmentBodyStatus,
} from "@workspace/api-client-react";
import type {
  CreateInvestmentBody, UpdateInvestmentBody, InvestmentSummary,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, ShieldAlert } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  factory_sale: "Factory sale",
  business_sale: "Business sale",
  production_line_investment: "Production line investment",
  franchise: "Franchise",
  partnership: "Partnership",
};

const INDUSTRY_LABELS: Record<string, string> = {
  food: "Food",
  beverage: "Beverage",
  plastic: "Plastic",
  textile: "Textile",
  pharmaceutical: "Pharmaceutical",
  chemical: "Chemical",
  engineering: "Engineering",
  other: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  under_offer: "Under offer",
  closed: "Closed",
};

const FIGURES_LABELS: Record<string, string> = {
  seller_provided: "Seller provided",
  estimate: "Estimate",
};

const NONE = "__none__";

function cleanNumberString(s: string | undefined | null): string {
  if (s === null || s === undefined || s === "") return "";
  const n = parseFloat(String(s).replace(/[, ]/g, ""));
  return isFinite(n) ? String(n) : "";
}

const numOrNull = (s: string): number | null => {
  if (s.trim() === "") return null;
  const n = Number(s.replace(/[, ]/g, ""));
  return isFinite(n) ? n : null;
};

export function InvestmentFormSheet({
  open,
  onOpenChange,
  investment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: InvestmentSummary | null;
}) {
  const isEdit = !!investment?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createInvestment = useCreateInvestment();
  const updateInvestment = useUpdateInvestment();

  const { data: detailData, isLoading: detailLoading } = useGetInvestment(investment?.id ?? "", {
    query: { enabled: open && isEdit, queryKey: getGetInvestmentQueryKey(investment?.id ?? "") },
  });

  const [investmentType, setInvestmentType] = useState<string>("factory_sale");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState<string>(NONE);
  const [location, setLocation] = useState("");
  const [totalValue, setTotalValue] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [roi, setRoi] = useState("");
  const [payback, setPayback] = useState("");
  const [revenueMin, setRevenueMin] = useState("");
  const [revenueMax, setRevenueMax] = useState("");
  const [costNote, setCostNote] = useState("");
  const [growthNote, setGrowthNote] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [figuresSource, setFiguresSource] = useState<string>("seller_provided");
  const [status, setStatus] = useState<string>("active");

  // Reset to a clean state whenever a CREATE sheet is opened.
  useEffect(() => {
    if (open && !isEdit) {
      setInvestmentType("factory_sale");
      setTitle("");
      setDescription("");
      setIndustry(NONE);
      setLocation("");
      setTotalValue("");
      setCurrency("EGP");
      setRoi("");
      setPayback("");
      setRevenueMin("");
      setRevenueMax("");
      setCostNote("");
      setGrowthNote("");
      setCoverUrl("");
      setFiguresSource("seller_provided");
      setStatus("active");
    }
  }, [open, isEdit]);

  // Prefill from the summary row when EDITing.
  useEffect(() => {
    if (!open || !isEdit || !investment) return;
    setInvestmentType(investment.investment_type);
    setTitle(investment.title);
    setDescription(investment.description ?? "");
    setIndustry(investment.industry ?? NONE);
    setLocation(investment.location);
    setTotalValue(cleanNumberString(investment.total_value_amount));
    setCurrency(investment.currency || "EGP");
    setRoi(cleanNumberString(investment.expected_roi_pct));
    setPayback(cleanNumberString(investment.payback_years));
    setRevenueMin(cleanNumberString(investment.revenue_range_min));
    setRevenueMax(cleanNumberString(investment.revenue_range_max));
    setCoverUrl(investment.cover_url ?? "");
    setFiguresSource(investment.figures_source);
    setStatus(investment.status);
  }, [open, isEdit, investment]);

  // Backfill the detail-only notes once the detail fetch resolves.
  useEffect(() => {
    const detail = detailData?.data;
    if (!detail) return;
    setCostNote(detail.cost_structure_note ?? "");
    setGrowthNote(detail.growth_potential_note ?? "");
  }, [detailData]);

  const validateCommon = (): string | null => {
    if (!title.trim()) return "Title is required";
    if (!location.trim()) return "Location is required";
    const v = Number(totalValue.replace(/[, ]/g, ""));
    if (!isFinite(v) || v <= 0) return "Enter a valid total value";
    return null;
  };

  const isPending = createInvestment.isPending || updateInvestment.isPending;

  const handleCreate = () => {
    const err = validateCommon();
    if (err) {
      toast({ title: err, variant: "destructive" });
      return;
    }
    const body: CreateInvestmentBody = {
      investment_type: investmentType as CreateInvestmentBody["investment_type"],
      title: title.trim(),
      location: location.trim(),
      total_value_amount: Number(totalValue.replace(/[, ]/g, "")),
      currency: currency.trim() || "EGP",
      figures_source: figuresSource as CreateInvestmentBodyFiguresSource,
      expected_roi_pct: numOrNull(roi),
      payback_years: numOrNull(payback),
      revenue_range_min: numOrNull(revenueMin),
      revenue_range_max: numOrNull(revenueMax),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(industry !== NONE ? { industry: industry as CreateInvestmentBodyIndustry } : {}),
      ...(costNote.trim() ? { cost_structure_note: costNote.trim() } : { cost_structure_note: null }),
      ...(growthNote.trim() ? { growth_potential_note: growthNote.trim() } : { growth_potential_note: null }),
      ...(coverUrl.trim() ? { cover_url: coverUrl.trim() } : { cover_url: null }),
    };

    createInvestment.mutate(
      { data: body },
      {
        onSuccess: () => {
          toast({ title: "Investment created" });
          queryClient.invalidateQueries({ queryKey: getListMyInvestmentsQueryKey() });
          onOpenChange(false);
        },
        onError: () => toast({ title: "Failed to create investment", variant: "destructive" }),
      },
    );
  };

  const handleUpdate = () => {
    if (!investment?.id) return;
    const err = validateCommon();
    if (err) {
      toast({ title: err, variant: "destructive" });
      return;
    }
    const body: UpdateInvestmentBody = {
      investment_type: investmentType as UpdateInvestmentBody["investment_type"],
      title: title.trim(),
      location: location.trim(),
      total_value_amount: Number(totalValue.replace(/[, ]/g, "")),
      currency: currency.trim() || "EGP",
      figures_source: figuresSource as UpdateInvestmentBody["figures_source"],
      status: status as UpdateInvestmentBodyStatus,
      description: description.trim(),
      industry: industry !== NONE ? (industry as UpdateInvestmentBody["industry"]) : undefined,
      expected_roi_pct: numOrNull(roi),
      payback_years: numOrNull(payback),
      revenue_range_min: numOrNull(revenueMin),
      revenue_range_max: numOrNull(revenueMax),
      cost_structure_note: costNote.trim() ? costNote.trim() : null,
      growth_potential_note: growthNote.trim() ? growthNote.trim() : null,
      cover_url: coverUrl.trim() ? coverUrl.trim() : null,
    };

    updateInvestment.mutate(
      { id: investment.id, data: body },
      {
        onSuccess: () => {
          toast({ title: "Investment updated" });
          queryClient.invalidateQueries({ queryKey: getListMyInvestmentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetInvestmentQueryKey(investment.id) });
          onOpenChange(false);
        },
        onError: () => toast({ title: "Failed to update investment", variant: "destructive" }),
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card border-border w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-foreground text-left">
            {isEdit ? "Edit Investment" : "New Investment"}
          </SheetTitle>
          <SheetDescription className="text-left">
            {isEdit
              ? "Update your investment opportunity."
              : "List a factory sale, business sale, production line, franchise or partnership."}
          </SheetDescription>
        </SheetHeader>

        {isEdit && detailLoading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5 py-4">
            {/* Type */}
            <div className="space-y-1.5">
              <Label className="text-xs">Investment type *</Label>
              <Select value={investmentType} onValueChange={setInvestmentType}>
                <SelectTrigger className="bg-input border-border" data-testid="form-investment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(CreateInvestmentBodyInvestmentType).map((v) => (
                    <SelectItem key={v} value={v}>{TYPE_LABELS[v] ?? v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Core fields */}
            <div className="space-y-1.5">
              <Label className="text-xs">Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-input border-border" data-testid="form-title" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="bg-input border-border" data-testid="form-description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger className="bg-input border-border" data-testid="form-industry">
                    <SelectValue placeholder="Not specified" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not specified</SelectItem>
                    {Object.values(CreateInvestmentBodyIndustry).map((v) => (
                      <SelectItem key={v} value={v}>{INDUSTRY_LABELS[v] ?? v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Location *</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} className="bg-input border-border" data-testid="form-location" />
              </div>
            </div>

            {isEdit && (
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="bg-input border-border" data-testid="form-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(UpdateInvestmentBodyStatus).map((v) => (
                      <SelectItem key={v} value={v}>{STATUS_LABELS[v] ?? v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Figures */}
            <div>
              <Separator className="bg-border" />
              <h3 className="text-sm font-semibold text-foreground mt-4 mb-1">Financial figures</h3>
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 mb-3">
                <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-200/90">
                  Figures are seller-provided and shown with a "not verified by BANCO" note. Leave a field blank to hide it.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Total value *</Label>
                  <Input type="number" inputMode="decimal" value={totalValue} onChange={(e) => setTotalValue(e.target.value)} className="bg-input border-border" data-testid="form-total-value" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Currency</Label>
                  <Input value={currency} onChange={(e) => setCurrency(e.target.value)} className="bg-input border-border" data-testid="form-currency" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Expected ROI (%)</Label>
                  <Input type="number" inputMode="decimal" value={roi} onChange={(e) => setRoi(e.target.value)} className="bg-input border-border" data-testid="form-roi" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Payback (years)</Label>
                  <Input type="number" inputMode="decimal" value={payback} onChange={(e) => setPayback(e.target.value)} className="bg-input border-border" data-testid="form-payback" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Revenue range (min)</Label>
                  <Input type="number" inputMode="decimal" value={revenueMin} onChange={(e) => setRevenueMin(e.target.value)} className="bg-input border-border" data-testid="form-revenue-min" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Revenue range (max)</Label>
                  <Input type="number" inputMode="decimal" value={revenueMax} onChange={(e) => setRevenueMax(e.target.value)} className="bg-input border-border" data-testid="form-revenue-max" />
                </div>
              </div>
              <div className="space-y-1.5 mt-3">
                <Label className="text-xs">Figures source</Label>
                <Select value={figuresSource} onValueChange={setFiguresSource}>
                  <SelectTrigger className="bg-input border-border" data-testid="form-figures-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(CreateInvestmentBodyFiguresSource).map((v) => (
                      <SelectItem key={v} value={v}>{FIGURES_LABELS[v] ?? v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Narrative */}
            <div>
              <Separator className="bg-border" />
              <h3 className="text-sm font-semibold text-foreground mt-4 mb-3">Details</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Cost structure note</Label>
                  <Textarea value={costNote} onChange={(e) => setCostNote(e.target.value)} rows={2} className="bg-input border-border" data-testid="form-cost-note" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Growth potential note</Label>
                  <Textarea value={growthNote} onChange={(e) => setGrowthNote(e.target.value)} rows={2} className="bg-input border-border" data-testid="form-growth-note" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cover image URL</Label>
                  <Input value={coverUrl} placeholder="https://…" onChange={(e) => setCoverUrl(e.target.value)} className="bg-input border-border" data-testid="form-cover-url" />
                </div>
              </div>
            </div>
          </div>
        )}

        <SheetFooter>
          <Button variant="outline" className="border-border" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={isEdit ? handleUpdate : handleCreate}
            disabled={isPending || (isEdit && detailLoading)}
            data-testid="btn-save-investment"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Investment"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
