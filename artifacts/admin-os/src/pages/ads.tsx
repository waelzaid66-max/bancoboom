import { useGetAdminAds } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/context/LanguageContext";

export default function AdsPage() {
  const { t } = useLang();
  const { data: resp, isLoading } = useGetAdminAds();
  const ads = resp?.data ?? [];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("adsPage.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("adsPage.subtitle")}</p>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("adsPage.colListing")}</TableHead>
              <TableHead>{t("adsPage.colSeller")}</TableHead>
              <TableHead>{t("adsPage.colType")}</TableHead>
              <TableHead>{t("adsPage.colSpent")}</TableHead>
              <TableHead>{t("adsPage.colImpressions")}</TableHead>
              <TableHead>{t("adsPage.colStatus")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : !ads.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {t("adsPage.empty")}
                </TableCell>
              </TableRow>
            ) : (
              ads.map((ad: (typeof ads)[number]) => (
                <TableRow key={ad.id}>
                  <TableCell className="font-medium truncate max-w-[240px]">{ad.listing_title ?? ad.listing_id}</TableCell>
                  <TableCell>{ad.seller_name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{ad.ad_type?.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">EGP {ad.budget_spent ?? "0"}</span>
                    <span className="text-muted-foreground"> / {ad.budget_total ?? "∞"}</span>
                  </TableCell>
                  <TableCell>{(ad.impressions ?? 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={ad.is_active ? "default" : "secondary"}>
                      {ad.is_active ? t("adsPage.active") : t("adsPage.ended")}
                    </Badge>
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
