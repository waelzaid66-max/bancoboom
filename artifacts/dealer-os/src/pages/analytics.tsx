import { SidebarLayout } from "@/components/layout/sidebar-layout";
import {
  useGetDealerAnalytics, getGetDealerAnalyticsQueryKey,
  useGetDealerListings, getGetDealerListingsQueryKey,
} from "@workspace/api-client-react";
import { useClerk } from "@clerk/react";
import { Loader2, TrendingUp, Eye, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

type SortKey = "views" | "leads" | "conversion";

export default function AnalyticsPage() {
  const { user } = useClerk();
  const [sortKey, setSortKey] = useState<SortKey>("views");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Summary cards from the analytics endpoint
  const { data: analyticsData, isLoading: analyticsLoading } = useGetDealerAnalytics({
    query: { enabled: !!user, queryKey: getGetDealerAnalyticsQueryKey() },
  });

  // Per-listing table sourced from listings
  const { data: listingsData, isLoading: listingsLoading } = useGetDealerListings(
    { limit: 200, sort: sortKey === "conversion" ? "views" : sortKey, order: sortOrder },
    {
      query: {
        enabled: !!user,
        queryKey: getGetDealerListingsQueryKey({ limit: 200, sort: sortKey === "conversion" ? "views" : sortKey, order: sortOrder }),
      }
    }
  );

  const isLoading = analyticsLoading || listingsLoading;
  const listings = listingsData?.data ?? [];

  const rows = listings.map((l) => {
    const views = l.views ?? 0;
    const leads = l.leads ?? 0;
    const convRate = views > 0 ? (leads / views) * 100 : 0;
    return { ...l, convRate };
  });

  if (sortKey === "conversion") {
    rows.sort((a, b) =>
      sortOrder === "desc" ? b.convRate - a.convRate : a.convRate - b.convRate
    );
  }

  // Summary stats from analytics endpoint
  const totalViews = analyticsData?.data?.total_views ?? rows.reduce((s, r) => s + (r.views ?? 0), 0);
  const totalLeads = analyticsData?.data?.leads_today ?? rows.reduce((s, r) => s + (r.leads ?? 0), 0);
  const avgConv = analyticsData?.data?.conversion_rate ?? (
    totalViews > 0 ? `${((totalLeads / totalViews) * 100).toFixed(1)}%` : "0.0%"
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortOrder(o => o === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  }

  function SortIndicator({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-muted-foreground/40 ml-1">↕</span>;
    return <span className="text-primary ml-1">{sortOrder === "desc" ? "↓" : "↑"}</span>;
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-2">Per-listing performance metrics across your portfolio.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border" data-testid="stat-total-views">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Total Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{totalViews.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border" data-testid="stat-total-leads">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{totalLeads.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border" data-testid="stat-avg-conv">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Avg. Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{typeof avgConv === "string" && avgConv.endsWith("%") ? avgConv : `${avgConv}%`}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Per-Listing Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-b-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground pl-6">Listing</TableHead>
                    <TableHead className="text-muted-foreground">Category</TableHead>
                    <TableHead
                      className="text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                      onClick={() => toggleSort("views")}
                      data-testid="sort-views"
                    >
                      Views <SortIndicator col="views" />
                    </TableHead>
                    <TableHead
                      className="text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                      onClick={() => toggleSort("leads")}
                      data-testid="sort-leads"
                    >
                      Leads <SortIndicator col="leads" />
                    </TableHead>
                    <TableHead
                      className="text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                      onClick={() => toggleSort("conversion")}
                      data-testid="sort-conversion"
                    >
                      Conv. Rate <SortIndicator col="conversion" />
                    </TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : rows.length ? (
                    rows.map((row) => (
                      <TableRow key={row.id} className="border-border hover:bg-muted/40" data-testid={`analytics-row-${row.id}`}>
                        <TableCell className="pl-6">
                          <div className="font-medium text-sm text-foreground max-w-[240px] truncate">{row.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{row.location}</div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs capitalize text-muted-foreground">{row.category?.replace("_", " ")}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium tabular-nums">{(row.views ?? 0).toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium tabular-nums">{(row.leads ?? 0).toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-sm font-medium tabular-nums ${row.convRate >= 5 ? "text-green-400" : row.convRate >= 2 ? "text-yellow-400" : "text-muted-foreground"}`}
                          >
                            {row.convRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={row.status === "active" ? "border-green-500/50 text-green-500" : "border-border text-muted-foreground"}
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        No listings data available.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
