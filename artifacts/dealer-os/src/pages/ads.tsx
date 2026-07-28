import { useState } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import {
  useGetDealerListings,
  getGetDealerListingsQueryKey,
  useBoostListing,
} from "@workspace/api-client-react";
import { useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowUpRight, Zap, Star, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/LanguageContext";

type AdType = "featured" | "native_feed" | "top_search";
const AD_TYPES: AdType[] = ["featured", "native_feed", "top_search"];
const AD_TYPE_ICONS: Record<AdType, any> = {
  featured: Star,
  native_feed: Zap,
  top_search: Search,
};

export default function AdsPage() {
  const { user } = useClerk();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useI18n();

  const adTypeLabel = (key: AdType) => t(`ads.types.${key}.label`);
  const adTypeDesc = (key: AdType) => t(`ads.types.${key}.desc`);

  const [boostOpen, setBoostOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adType, setAdType] = useState<AdType>("featured");
  const [duration, setDuration] = useState("7");

  const { data: listingsData, isLoading } = useGetDealerListings(
    { limit: 100, status: "active" },
    {
      query: {
        enabled: !!user,
        queryKey: getGetDealerListingsQueryKey({ limit: 100, status: "active" }),
      }
    }
  );

  const boostMutation = useBoostListing();

  const listings = listingsData?.data ?? [];

  function openBoost(id: string) {
    setSelectedId(id);
    setAdType("featured");
    setDuration("7");
    setBoostOpen(true);
  }

  function handleBoost() {
    if (!selectedId) return;
    boostMutation.mutate(
      { data: { listing_id: selectedId, ad_type: adType, duration_days: parseInt(duration) } },
      {
        onSuccess: () => {
          toast({
            title: t("ads.toast.boosted"),
            description: t("ads.toast.boostedDesc", { label: adTypeLabel(adType), count: duration }),
          });
          setBoostOpen(false);
          queryClient.invalidateQueries({ queryKey: getGetDealerListingsQueryKey() });
        },
        onError: () => {
          toast({ title: t("ads.toast.failed"), variant: "destructive" });
        },
      }
    );
  }

  const selectedListing = listings.find(l => l.id === selectedId);

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("ads.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("ads.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {AD_TYPES.map((key) => {
            const Icon = AD_TYPE_ICONS[key];
            return (
              <Card key={key} className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="w-4 h-4 text-primary" />
                    {adTypeLabel(key)}
                  </CardTitle>
                  <CardDescription>{adTypeDesc(key)}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">{t("ads.readyToBoost")}</CardTitle>
            <CardDescription>{t("ads.readyToBoostDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-32 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : listings.length ? (
              <div className="space-y-2">
                {listings.map((listing) => (
                  <div
                    key={listing.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors"
                    data-testid={`ad-listing-${listing.id}`}
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="font-medium text-sm text-foreground truncate">{listing.title}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">{listing.location}</span>
                        <span className="text-xs text-muted-foreground">{listing.price_display}</span>
                        <Badge variant="outline" className="text-xs border-border">
                          {t("ads.views", { count: listing.views ?? 0 })}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-white flex-shrink-0"
                      onClick={() => openBoost(listing.id!)}
                      data-testid={`btn-boost-ad-${listing.id}`}
                    >
                      <ArrowUpRight className="w-4 h-4 mr-1" />
                      {t("ads.boost")}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                {t("ads.noListings")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={boostOpen} onOpenChange={setBoostOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{t("ads.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("ads.dialogDesc", { title: selectedListing?.title ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">{t("ads.adType")}</label>
              <Select value={adType} onValueChange={(v: any) => setAdType(v)}>
                <SelectTrigger className="border-border bg-input" data-testid="select-ad-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">{adTypeLabel("featured")}</SelectItem>
                  <SelectItem value="native_feed">{adTypeLabel("native_feed")}</SelectItem>
                  <SelectItem value="top_search">{adTypeLabel("top_search")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{adTypeDesc(adType)}</p>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">{t("ads.duration")}</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="border-border bg-input" data-testid="select-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">{t("ads.days3")}</SelectItem>
                  <SelectItem value="7">{t("ads.days7")}</SelectItem>
                  <SelectItem value="14">{t("ads.days14")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-border" onClick={() => setBoostOpen(false)}>
              {t("ads.cancel")}
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={handleBoost}
              disabled={boostMutation.isPending}
              data-testid="btn-confirm-boost"
            >
              {boostMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("ads.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarLayout>
  );
}
