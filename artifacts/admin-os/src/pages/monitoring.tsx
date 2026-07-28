import { useGetAdminMonitoring, getGetAdminMonitoringQueryKey } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLang } from "@/context/LanguageContext";

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function MonitoringPage() {
  const { t } = useLang();
  const { data: resp, isLoading } = useGetAdminMonitoring({
    query: { queryKey: getGetAdminMonitoringQueryKey(), refetchInterval: 10000 },
  });
  const m = resp?.data;

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const errorRate = (m?.error_rate ?? 0) * 100;
  const kpis = [
    { label: t("monitoringPage.uptime"), value: formatUptime(m?.uptime_seconds ?? 0) },
    { label: t("monitoringPage.totalRequests"), value: (m?.total_requests ?? 0).toLocaleString() },
    { label: t("monitoringPage.throughput"), value: (m?.throughput_per_min ?? 0).toFixed(1) },
    { label: t("monitoringPage.errorRate"), value: `${errorRate.toFixed(2)}%`, highlight: errorRate > 1 },
    { label: t("monitoringPage.latP50"), value: `${m?.latency_p50_ms ?? 0} ms` },
    { label: t("monitoringPage.latP95"), value: `${m?.latency_p95_ms ?? 0} ms` },
    { label: t("monitoringPage.feedP50"), value: `${m?.feed_latency_p50_ms ?? 0} ms` },
    { label: t("monitoringPage.feedP95"), value: `${m?.feed_latency_p95_ms ?? 0} ms` },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("monitoringPage.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("monitoringPage.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {kpis.map((k, i) => (
          <Card key={i} className={k.highlight ? "border-destructive/50 bg-destructive/5" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{k.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-3">{t("monitoringPage.endpoints")}</h2>
      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("monitoringPage.colPath")}</TableHead>
              <TableHead className="text-end">{t("monitoringPage.colRequests")}</TableHead>
              <TableHead className="text-end">{t("monitoringPage.colErrors")}</TableHead>
              <TableHead className="text-end">p50</TableHead>
              <TableHead className="text-end">p95</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!m?.endpoints?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                  {t("monitoringPage.empty")}
                </TableCell>
              </TableRow>
            ) : (
              m.endpoints.map((e: NonNullable<typeof m.endpoints>[number], i: number) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{e.path}</TableCell>
                  <TableCell className="text-end">{(e.count ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-end">
                    {e.error_count ? <span className="text-destructive">{e.error_count}</span> : 0}
                  </TableCell>
                  <TableCell className="text-end">{e.p50_ms ?? 0} ms</TableCell>
                  <TableCell className="text-end">{e.p95_ms ?? 0} ms</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
