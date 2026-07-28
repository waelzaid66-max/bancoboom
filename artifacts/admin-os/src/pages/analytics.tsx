import { useGetAdminAnalytics } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLang } from "@/context/LanguageContext";

export default function AnalyticsPage() {
  const { t } = useLang();
  const { data: resp, isLoading } = useGetAdminAnalytics();
  const a = resp?.data;

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const kpis = [
    { label: t("analyticsPage.conversionRate"), value: `${((a?.conversion_rate ?? 0) * 100).toFixed(1)}%` },
    { label: t("analyticsPage.totalListings"), value: a?.total_listings ?? 0 },
    { label: t("analyticsPage.activeListings"), value: a?.active_listings ?? 0 },
    { label: t("analyticsPage.soldListings"), value: a?.sold_listings ?? 0 },
    { label: t("analyticsPage.totalLeads"), value: a?.total_leads ?? 0 },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("analyticsPage.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("analyticsPage.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {kpis.map((k, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{k.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">{t("analyticsPage.topCategories")}</h2>
          <div className="border rounded-md bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("analyticsPage.colCategory")}</TableHead>
                  <TableHead className="text-end">{t("analyticsPage.colListings")}</TableHead>
                  <TableHead className="text-end">{t("analyticsPage.colLeads")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!a?.top_categories?.length ? (
                  <TableRow><TableCell colSpan={3} className="h-16 text-center text-muted-foreground">{t("analyticsPage.noData")}</TableCell></TableRow>
                ) : (
                  a.top_categories.map((c: NonNullable<typeof a.top_categories>[number], i: number) => (
                    <TableRow key={i}>
                      <TableCell className="capitalize font-medium">{c.category}</TableCell>
                      <TableCell className="text-end">{c.listing_count}</TableCell>
                      <TableCell className="text-end">{c.lead_count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">{t("analyticsPage.bestSellers")}</h2>
          <div className="border rounded-md bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("analyticsPage.colSeller")}</TableHead>
                  <TableHead className="text-end">{t("analyticsPage.colSold")}</TableHead>
                  <TableHead className="text-end">{t("analyticsPage.colLeads")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!a?.best_sellers?.length ? (
                  <TableRow><TableCell colSpan={3} className="h-16 text-center text-muted-foreground">{t("analyticsPage.noData")}</TableCell></TableRow>
                ) : (
                  a.best_sellers.map((s: NonNullable<typeof a.best_sellers>[number], i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium truncate max-w-[160px]">{s.name}</TableCell>
                      <TableCell className="text-end">{s.sold_count}</TableCell>
                      <TableCell className="text-end">{s.lead_count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">{t("analyticsPage.trendingListings")}</h2>
          <div className="border rounded-md bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("analyticsPage.colListing")}</TableHead>
                  <TableHead className="text-end">{t("analyticsPage.colViews")}</TableHead>
                  <TableHead className="text-end">{t("analyticsPage.colLeads")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!a?.trending_listings?.length ? (
                  <TableRow><TableCell colSpan={3} className="h-16 text-center text-muted-foreground">{t("analyticsPage.noData")}</TableCell></TableRow>
                ) : (
                  // NOTE: map var renamed tl (a bare `t` would shadow the translator).
                  a.trending_listings.map((tl: NonNullable<typeof a.trending_listings>[number], i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium truncate max-w-[160px]">{tl.title}</TableCell>
                      <TableCell className="text-end">{tl.view_count}</TableCell>
                      <TableCell className="text-end">{tl.lead_count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
