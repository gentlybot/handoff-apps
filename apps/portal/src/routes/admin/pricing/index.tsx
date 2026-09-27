import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { adminPricingQuery } from "@/lib/queries";

export const Route = createFileRoute("/admin/pricing/")({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(adminPricingQuery),
  pendingComponent: () => <Skeleton className="h-64 w-full" />,
  component: PricingPage,
});

function PricingPage() {
  const { data } = useSuspenseQuery(adminPricingQuery);
  const queryClient = useQueryClient();
  const [defaultPrice, setDefaultPrice] = useState(String(data.default_per_stop_price_cents));
  const [defaultDirty, setDefaultDirty] = useState(false);
  const [prices, setPrices] = useState<Record<number, string>>({});

  const save = useMutation({
    mutationFn: () => api.admin.updatePricing({
      ...(defaultDirty ? { default_per_stop_price_cents: Number(defaultPrice) } : {}),
      ...(Object.keys(prices).length > 0 ? {
        merchant_prices: data.merchants
          .filter((merchant) => merchant.id in prices)
          .map((merchant) => ({
            merchant_id: merchant.id,
            per_stop_price_cents: prices[merchant.id] === "" ? null : Number(prices[merchant.id]),
          })),
      } : {}),
    }),
    onSuccess: (pricing) => {
      queryClient.setQueryData(adminPricingQuery.queryKey, pricing);
      setDefaultPrice(String(pricing.default_per_stop_price_cents));
      setDefaultDirty(false);
      setPrices({});
      toast.success("Future stop prices saved");
    },
    onError: () => toast.error("Enter whole-cent prices greater than zero."),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Per-stop pricing</h1>
        <p className="mt-1 text-sm text-muted-foreground">Set the amount used when a stop is settled. Prices already locked on settled orders never change.</p>
      </div>

      <Card>
        <CardContent className="space-y-3 py-5">
          <Label htmlFor="default-price">Default future price (cents)</Label>
          <div className="flex max-w-sm items-center gap-3">
            <Input id="default-price" type="number" min="1" step="1" value={defaultPrice} onChange={(event) => { setDefaultPrice(event.target.value); setDefaultDirty(true); }} />
            <span className="whitespace-nowrap text-sm text-muted-foreground">{Number(defaultPrice) > 0 && formatMoney(Number(defaultPrice))}</span>
          </div>
          <p className="text-sm text-muted-foreground">This applies to merchants without an override.</p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden py-0">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">Merchant overrides</h2>
          <p className="mt-1 text-sm text-muted-foreground">Leave blank to use the global default. These changes only affect future settlements.</p>
        </div>
        <div className="divide-y">
          {data.merchants.map((merchant) => (
            <div key={merchant.id} className="grid gap-3 px-6 py-4 sm:grid-cols-[minmax(0,1fr)_12rem_10rem] sm:items-center">
              <div className="font-medium">{merchant.business_name}</div>
              <div>
                <Label className="sr-only" htmlFor={`merchant-price-${merchant.id}`}>Override price for {merchant.business_name} in cents</Label>
                <Input id={`merchant-price-${merchant.id}`} type="number" min="1" step="1" placeholder="Use default" value={prices[merchant.id] ?? merchant.per_stop_price_cents?.toString() ?? ""} onChange={(event) => setPrices((current) => ({ ...current, [merchant.id]: event.target.value }))} />
              </div>
              <p className="text-sm text-muted-foreground sm:text-right">Now: {formatMoney(merchant.effective_per_stop_price_cents)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Button onClick={() => save.mutate()} disabled={save.isPending || (!defaultDirty && Object.keys(prices).length === 0)}>{save.isPending ? "Saving…" : "Save future prices"}</Button>
    </div>
  );
}