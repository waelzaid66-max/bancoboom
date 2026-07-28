import { useEffect, useState } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import {
  useGetMe, getGetMeQueryKey,
  useGetCompany, getGetCompanyQueryKey,
  useUpdateMyCompany,
  UpdateMyCompanyBodyIndustry,
} from "@workspace/api-client-react";
import type { UpdateMyCompanyBody } from "@workspace/api-client-react";
import { useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Building2, ShieldCheck, Users, Globe, Save,
} from "lucide-react";

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

const NONE = "__none__";

function cleanNumberString(s: string | number | null | undefined): string {
  if (s === null || s === undefined || s === "") return "";
  const n = typeof s === "number" ? s : parseFloat(String(s).replace(/[, ]/g, ""));
  return isFinite(n) ? String(n) : "";
}

const numOrNull = (s: string): number | null => {
  if (s.trim() === "") return null;
  const n = Number(s.replace(/[, ]/g, ""));
  return isFinite(n) ? n : null;
};

const splitCsv = (s: string): string[] =>
  s.split(",").map((x) => x.trim()).filter(Boolean);

export default function CompanyProfilePage() {
  const { user } = useClerk();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: meData } = useGetMe({
    query: { enabled: !!user, queryKey: getGetMeQueryKey() },
  });
  const myId = meData?.data?.id ?? "";

  const { data: companyData, isLoading } = useGetCompany(myId, {
    query: { enabled: !!myId, queryKey: getGetCompanyQueryKey(myId) },
  });

  const updateMyCompany = useUpdateMyCompany();

  const profile = companyData?.data;
  const trade = profile?.company ?? null;

  const [about, setAbout] = useState("");
  const [industry, setIndustry] = useState<string>(NONE);
  const [hqCountry, setHqCountry] = useState("");
  const [yearEstablished, setYearEstablished] = useState("");
  const [importFrom, setImportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [minOrderValue, setMinOrderValue] = useState("");
  const [minOrderUnit, setMinOrderUnit] = useState("");
  const [monthlyCapacity, setMonthlyCapacity] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [certifications, setCertifications] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  useEffect(() => {
    if (!trade) return;
    setAbout(trade.about ?? "");
    setIndustry(trade.industry ?? NONE);
    setHqCountry(trade.hq_country ?? "");
    setYearEstablished(cleanNumberString(trade.year_established));
    setImportFrom((trade.countries_import_from ?? []).join(", "));
    setExportTo((trade.countries_export_to ?? []).join(", "));
    setMinOrderValue(cleanNumberString(trade.min_order_value));
    setMinOrderUnit(trade.min_order_unit ?? "");
    setMonthlyCapacity(trade.monthly_capacity ?? "");
    setLeadTimeDays(cleanNumberString(trade.lead_time_days));
    setCertifications((trade.certifications ?? []).join(", "));
    setWebsiteUrl(trade.website_url ?? "");
    setLogoUrl(trade.logo_url ?? "");
    setCoverUrl(trade.cover_url ?? "");
  }, [trade]);

  const handleSave = () => {
    const body: UpdateMyCompanyBody = {
      about: about.trim() ? about.trim() : null,
      industry: industry !== NONE ? (industry as UpdateMyCompanyBodyIndustry) : undefined,
      hq_country: hqCountry.trim() ? hqCountry.trim() : null,
      year_established: numOrNull(yearEstablished),
      countries_import_from: splitCsv(importFrom),
      countries_export_to: splitCsv(exportTo),
      min_order_value: numOrNull(minOrderValue),
      min_order_unit: minOrderUnit.trim() ? minOrderUnit.trim() : null,
      monthly_capacity: monthlyCapacity.trim() ? monthlyCapacity.trim() : null,
      lead_time_days: numOrNull(leadTimeDays),
      certifications: splitCsv(certifications),
      website_url: websiteUrl.trim() ? websiteUrl.trim() : null,
      logo_url: logoUrl.trim() ? logoUrl.trim() : null,
      cover_url: coverUrl.trim() ? coverUrl.trim() : null,
    };

    updateMyCompany.mutate(
      { data: body },
      {
        onSuccess: () => {
          toast({ title: "Company profile updated" });
          if (myId) queryClient.invalidateQueries({ queryKey: getGetCompanyQueryKey(myId) });
        },
        onError: () => toast({ title: "Failed to update company profile", variant: "destructive" }),
      },
    );
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Company Profile</h1>
            <p className="text-muted-foreground mt-2">Your public supplier profile shown in the BANCO directory.</p>
          </div>
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={handleSave}
            disabled={updateMyCompany.isPending || isLoading}
            data-testid="btn-save-company"
          >
            {updateMyCompany.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>

        {isLoading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Header card */}
            <Card className="bg-card border-card-border">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {logoUrl ? (
                    <img src={logoUrl} alt={profile?.name ?? "Company"} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-7 h-7 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground truncate">{profile?.name ?? "Your company"}</span>
                    {profile?.is_verified && (
                      <Badge variant="outline" className="border-green-500 text-green-500 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />{profile?.follower_count ?? 0} followers
                    </span>
                    <span>{profile?.stats?.active_listings ?? 0} active listings</span>
                    {profile?.stats?.member_since && (
                      <span>Member since {new Date(profile.stats.member_since).getFullYear()}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* About + classification */}
            <Card className="bg-card border-card-border">
              <CardHeader>
                <CardTitle className="text-base">About & classification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">About</Label>
                  <Textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={4} className="bg-input border-border" data-testid="company-about" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Industry</Label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger className="bg-input border-border" data-testid="company-industry">
                        <SelectValue placeholder="Not specified" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Not specified</SelectItem>
                        {Object.values(UpdateMyCompanyBodyIndustry).map((v) => (
                          <SelectItem key={v} value={v}>{INDUSTRY_LABELS[v] ?? v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">HQ country</Label>
                    <Input value={hqCountry} onChange={(e) => setHqCountry(e.target.value)} className="bg-input border-border" data-testid="company-hq-country" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Year established</Label>
                    <Input type="number" value={yearEstablished} onChange={(e) => setYearEstablished(e.target.value)} className="bg-input border-border" data-testid="company-year" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Website URL</Label>
                    <Input value={websiteUrl} placeholder="https://…" onChange={(e) => setWebsiteUrl(e.target.value)} className="bg-input border-border" data-testid="company-website" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trade & capacity */}
            <Card className="bg-card border-card-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Trade & capacity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Import from (comma-separated)</Label>
                    <Input value={importFrom} onChange={(e) => setImportFrom(e.target.value)} placeholder="China, Turkey" className="bg-input border-border" data-testid="company-import-from" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Export to (comma-separated)</Label>
                    <Input value={exportTo} onChange={(e) => setExportTo(e.target.value)} placeholder="Egypt, KSA" className="bg-input border-border" data-testid="company-export-to" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Min order value</Label>
                    <Input type="number" value={minOrderValue} onChange={(e) => setMinOrderValue(e.target.value)} className="bg-input border-border" data-testid="company-min-order-value" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Min order unit</Label>
                    <Input value={minOrderUnit} onChange={(e) => setMinOrderUnit(e.target.value)} placeholder="EGP, tons" className="bg-input border-border" data-testid="company-min-order-unit" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Monthly capacity</Label>
                    <Input value={monthlyCapacity} onChange={(e) => setMonthlyCapacity(e.target.value)} placeholder="500 tons / month" className="bg-input border-border" data-testid="company-monthly-capacity" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Lead time (days)</Label>
                    <Input type="number" value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} className="bg-input border-border" data-testid="company-lead-time" />
                  </div>
                </div>
                <Separator className="bg-border" />
                <div className="space-y-1.5">
                  <Label className="text-xs">Certifications (comma-separated)</Label>
                  <Input value={certifications} onChange={(e) => setCertifications(e.target.value)} placeholder="ISO 9001, HACCP" className="bg-input border-border" data-testid="company-certifications" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Logo URL</Label>
                    <Input value={logoUrl} placeholder="https://…" onChange={(e) => setLogoUrl(e.target.value)} className="bg-input border-border" data-testid="company-logo" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cover URL</Label>
                    <Input value={coverUrl} placeholder="https://…" onChange={(e) => setCoverUrl(e.target.value)} className="bg-input border-border" data-testid="company-cover" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </SidebarLayout>
  );
}
