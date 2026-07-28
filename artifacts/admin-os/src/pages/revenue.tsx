import { useGetAdminRevenue } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLang } from "@/context/LanguageContext";

export default function RevenuePage() {
  const { t } = useLang();
  const { data: resp, isLoading } = useGetAdminRevenue();
  const revenue = resp?.data;

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const currency = revenue?.currency ?? "EGP";

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("revenuePage.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("revenuePage.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("revenuePage.mtd")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{currency} {revenue?.total_mtd ?? "0"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("revenuePage.allTime")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{currency} {revenue?.total_all_time ?? "0"}</div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-3">{t("revenuePage.byChannel")}</h2>
      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("revenuePage.colChannel")}</TableHead>
              <TableHead>{t("revenuePage.colAmount")}</TableHead>
              <TableHead>{t("revenuePage.colNote")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!revenue?.by_channel?.length ? (
              <TableRow>
                <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                  {t("revenuePage.empty")}
                </TableCell>
              </TableRow>
            ) : (
              revenue.by_channel.map((c: NonNullable<typeof revenue.by_channel>[number], i: number) => (
                <TableRow key={i}>
                  <TableCell className="font-medium capitalize">{c.channel?.replace(/_/g, " ")}</TableCell>
                  <TableCell>{currency} {c.amount ?? "0"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.note ?? ""}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
