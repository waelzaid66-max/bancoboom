import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import {
  useListGlobalSupply, getListGlobalSupplyQueryKey,
  useGetGlobalSupply, getGetGlobalSupplyQueryKey,
  useRespondGlobalSupply,
  RespondGlobalSupplyBodyIncoterms,
} from "@workspace/api-client-react";
import type { GlobalSupplyRequest, SupplierMatch } from "@workspace/api-client-react";
import { useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Globe, MapPin, Package, Users, ShieldCheck, ShieldAlert, CheckCircle2, Building2,
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  open: "border-green-500 text-green-500",
  fulfilled: "border-blue-500 text-blue-500",
  closed: "border-muted-foreground text-muted-foreground",
  cancelled: "border-red-500 text-red-500",
};

const NONE = "__none__";

const INCOTERMS_LABELS: Record<string, string> = {
  exw: "EXW", fca: "FCA", fob: "FOB", cfr: "CFR", cif: "CIF", dap: "DAP", ddp: "DDP",
};

function Detail({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm text-foreground">{value}</span>
      </div>
    </div>
  );
}

function GlobalSupplyDetailSheet({ requestId, onClose }: { requestId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useGetGlobalSupply(requestId, {
    query: { queryKey: getGetGlobalSupplyQueryKey(requestId) },
  });
  const respond = useRespondGlobalSupply();

  const request = data?.data;
  const myResponse = request?.responses?.find((r) => r.is_mine);

  const [countryOfOrigin, setCountryOfOrigin] = useState("");
  const [priceQuote, setPriceQuote] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [moq, setMoq] = useState("");
  const [shippingTime, setShippingTime] = useState("");
  const [incoterms, setIncoterms] = useState<string>(NONE);
  const [deliveryEstimate, setDeliveryEstimate] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (myResponse) {
      setCountryOfOrigin(myResponse.country_of_origin ?? "");
      setPriceQuote(myResponse.price_quote ?? "");
      setCurrency(myResponse.currency ?? "EGP");
      setMoq(myResponse.moq ?? "");
      setShippingTime(myResponse.shipping_time_days != null ? String(myResponse.shipping_time_days) : "");
      setIncoterms(myResponse.incoterms ?? NONE);
      setDeliveryEstimate(myResponse.delivery_estimate ?? "");
      setMessage(myResponse.message ?? "");
    }
  }, [myResponse]);

  const canRespond = request?.status === "open" && !request?.viewer_is_buyer;

  const numOrNull = (s: string): number | null => {
    if (s.trim() === "") return null;
    const n = Number(s.replace(/[, ]/g, ""));
    return isFinite(n) ? n : null;
  };

  const handleSubmit = () => {
    respond.mutate(
      {
        id: requestId,
        data: {
          country_of_origin: countryOfOrigin.trim() ? countryOfOrigin.trim() : null,
          price_quote: numOrNull(priceQuote),
          currency: currency.trim() || "EGP",
          moq: numOrNull(moq),
          shipping_time_days: numOrNull(shippingTime),
          incoterms: incoterms !== NONE ? (incoterms as RespondGlobalSupplyBodyIncoterms) : undefined,
          delivery_estimate: deliveryEstimate.trim() ? deliveryEstimate.trim() : null,
          message: message.trim() ? message.trim() : null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: myResponse ? "Response updated" : "Response submitted" });
          queryClient.invalidateQueries({ queryKey: getGetGlobalSupplyQueryKey(requestId) });
          queryClient.invalidateQueries({ queryKey: getListGlobalSupplyQueryKey() });
        },
        onError: () => toast({ title: "Failed to submit response", variant: "destructive" }),
      },
    );
  };

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="bg-card border-border w-full sm:max-w-lg overflow-y-auto">
        {isLoading || !request ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={STATUS_STYLES[request.status] ?? "border-muted-foreground text-muted-foreground"}>
                  {request.status}
                </Badge>
                {request.category && (
                  <Badge variant="outline" className="border-white/10 capitalize">{request.category.replace("_", " ")}</Badge>
                )}
              </div>
              <SheetTitle className="text-foreground text-left">{request.product_text}</SheetTitle>
              <SheetDescription className="text-left">
                Requested by {request.buyer_name || "Buyer"} · {new Date(request.created_at).toLocaleDateString()}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 py-4">
              {request.notes && <p className="text-sm text-muted-foreground">{request.notes}</p>}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {(request.quantity || request.unit) && (
                  <Detail icon={Package} label="Quantity" value={`${request.quantity ?? ""} ${request.unit ?? ""}`.trim()} />
                )}
                <Detail icon={MapPin} label="Destination" value={request.destination_country} />
                {request.budget_max && (
                  <Detail icon={Package} label="Budget max" value={`${request.budget_max} ${request.currency}`} />
                )}
                {request.industry && <Detail icon={Building2} label="Industry" value={request.industry} />}
                {request.incoterms && (
                  <Detail icon={Globe} label="Incoterms" value={INCOTERMS_LABELS[request.incoterms] ?? request.incoterms} />
                )}
                <Detail icon={Users} label="Responses" value={String(request.response_count)} />
              </div>

              {/* Suggested suppliers from the directory */}
              {request.supplier_matches?.length > 0 && (
                <div className="pt-4 border-t border-border space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Suggested suppliers</h3>
                  {request.supplier_matches.map((m: SupplierMatch) => (
                    <div key={m.id} className="flex items-start gap-2 rounded-md border border-border p-2.5">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {m.logo_url ? <img src={m.logo_url} alt={m.name} className="w-full h-full object-cover" /> : <Building2 className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground truncate">{m.name}</span>
                          {m.is_verified && <ShieldCheck className="w-3 h-3 text-green-500 flex-shrink-0" />}
                        </div>
                        <span className="text-xs text-muted-foreground">{m.match_reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Respond form */}
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    {myResponse ? "Your Response" : "Respond to this request"}
                  </h3>
                  {myResponse && (
                    <Badge variant="outline" className="border-white/10 capitalize flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {myResponse.status}
                    </Badge>
                  )}
                </div>

                {request.viewer_is_buyer ? (
                  <p className="text-sm text-muted-foreground">This is your own request — suppliers respond here.</p>
                ) : !canRespond ? (
                  <p className="text-sm text-muted-foreground">
                    This request is {request.status}; new responses can no longer be submitted.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Country of origin</Label>
                        <Input value={countryOfOrigin} onChange={(e) => setCountryOfOrigin(e.target.value)} className="bg-input border-border" data-testid="resp-origin" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Price quote</Label>
                        <Input type="number" inputMode="decimal" value={priceQuote} onChange={(e) => setPriceQuote(e.target.value)} className="bg-input border-border" data-testid="resp-price" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Currency</Label>
                        <Input value={currency} onChange={(e) => setCurrency(e.target.value)} className="bg-input border-border" data-testid="resp-currency" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">MOQ</Label>
                        <Input type="number" value={moq} onChange={(e) => setMoq(e.target.value)} className="bg-input border-border" data-testid="resp-moq" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Shipping time (days)</Label>
                        <Input type="number" value={shippingTime} onChange={(e) => setShippingTime(e.target.value)} className="bg-input border-border" data-testid="resp-shipping" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Incoterms</Label>
                        <Select value={incoterms} onValueChange={setIncoterms}>
                          <SelectTrigger className="bg-input border-border" data-testid="resp-incoterms">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>Not specified</SelectItem>
                            {Object.values(RespondGlobalSupplyBodyIncoterms).map((v) => (
                              <SelectItem key={v} value={v}>{INCOTERMS_LABELS[v] ?? v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Delivery estimate</Label>
                      <Input value={deliveryEstimate} onChange={(e) => setDeliveryEstimate(e.target.value)} placeholder="e.g. 4-6 weeks" className="bg-input border-border" data-testid="resp-delivery" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Message</Label>
                      <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="bg-input border-border" data-testid="resp-message" />
                    </div>
                  </>
                )}
              </div>

              {/* Marketplace disclaimer */}
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-200/90">
                  BANCO is a marketplace that connects buyers and sellers; deals, payments and shipping happen directly
                  between the parties. Verify counterparties and do your own due diligence.
                </p>
              </div>
            </div>

            {canRespond && (
              <SheetFooter>
                <Button
                  className="bg-primary hover:bg-primary/90 text-white w-full"
                  onClick={handleSubmit}
                  disabled={respond.isPending}
                  data-testid="btn-submit-response"
                >
                  {respond.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {myResponse ? "Update Response" : "Submit Response"}
                </Button>
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function GlobalSupplyPage() {
  const { user } = useClerk();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useListGlobalSupply(
    { limit: 50, status: "open" },
    { query: { enabled: !!user, queryKey: getListGlobalSupplyQueryKey({ limit: 50, status: "open" }) } },
  );

  const requests = data?.data ?? [];

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Global Supply Board</h1>
          <p className="text-muted-foreground mt-2">Open sourcing requests from buyers — respond with a structured quote.</p>
        </div>

        {isLoading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : requests.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.map((req: GlobalSupplyRequest) => (
              <Card
                key={req.id}
                className="bg-card border-card-border hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => setSelectedId(req.id)}
                data-testid={`global-supply-${req.id}`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <Globe className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">{req.product_text}</div>
                        <div className="text-xs text-muted-foreground truncate">{req.buyer_name || "Buyer"}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className={STATUS_STYLES[req.status] ?? "border-muted-foreground text-muted-foreground"}>
                      {req.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {(req.quantity || req.unit) && (
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />{`${req.quantity ?? ""} ${req.unit ?? ""}`.trim()}
                      </span>
                    )}
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{req.destination_country}</span>
                    {req.industry && <span>{req.industry}</span>}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />{req.response_count} response{req.response_count !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-primary flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />View &amp; respond
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-card border-card-border">
            <CardContent className="py-10 text-center text-muted-foreground">
              No open sourcing requests right now.
            </CardContent>
          </Card>
        )}
      </div>

      {selectedId && <GlobalSupplyDetailSheet requestId={selectedId} onClose={() => setSelectedId(null)} />}
    </SidebarLayout>
  );
}
