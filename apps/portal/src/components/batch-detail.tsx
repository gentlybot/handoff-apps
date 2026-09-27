import { useState, type ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { AlertTriangle, Loader2 } from "lucide-react";
import { BatchStatusBadge } from "@/components/batch-status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BatchMap, type MapPickup } from "@/components/batch-map";
import type { BatchDetail as BatchDetailData, Order } from "@/lib/api";
import { STOP_PROBLEM, STOP_READY, routeColor } from "@/lib/colors";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";

type Props = {
  batch: BatchDetailData;
  back: { to: LinkProps["to"]; label: string; search?: LinkProps["search"] };
  /** Rendered under the title. The ops view puts the merchant here. */
  context?: ReactNode;
  /** What to offer when the file could not be read. Merchants can re-upload; ops cannot. */
  retry?: ReactNode;
  /** Guidance shown when rows need fixing. */
  problemHint: string;
  /** The merchant's pickup point, drawn on the map. */
  pickup?: MapPickup | null;
  /** Page-specific actions, shown between the stats and the map. */
  actions?: ReactNode;
};

export function BatchDetail({ batch, back, context, retry, problemHint, pickup, actions }: Props) {
  const [problemsOnly, setProblemsOnly] = useState(false);
  const orders = problemsOnly ? batch.orders.filter((o) => o.problems) : batch.orders;

  const placed = batch.orders.filter((o) => o.lat !== null && o.lng !== null);
  const unplaced = batch.orders.length - placed.length;
  const routeIndex = new Map(batch.routes.map((r, i) => [r.id, i]));
  const colorFor = (o: Order) => {
    if (o.problems.length > 0) return STOP_PROBLEM;
    if (o.route_id !== null && routeIndex.has(o.route_id)) return routeColor(routeIndex.get(o.route_id) as number);
    return STOP_READY;
  };
  const mapStops = placed.map((o) => ({
    id: o.id,
    lat: o.lat as number,
    lng: o.lng as number,
    label: String(o.stop_position ?? o.row_number),
    title: o.recipient_name ?? "No name",
    subtitle: o.route_number ? `${o.full_address}. Route ${o.route_number}, stop ${o.stop_position}` : o.full_address,
    color: colorFor(o),
  }));
  const mapRoutes = batch.routes.map((r, i) => {
    const stops = placed
      .filter((o) => o.route_id === r.id)
      .sort((a, b) => (a.stop_position ?? 0) - (b.stop_position ?? 0))
      .map((o) => [o.lat as number, o.lng as number] as [number, number]);
    const points: [number, number][] = pickup ? [[pickup.lat, pickup.lng], ...stops] : stops;
    return { id: r.id, color: routeColor(i), points, label: `${r.display_name}: ${r.stop_count} stops, ${r.distance_km} km` };
  });

  return (
    <div className="space-y-6">
      <div>
        <Link to={back.to} search={back.search} className="text-sm text-muted-foreground hover:text-foreground">
          ← {back.label}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{batch.name}</h1>
          <BatchStatusBadge status={batch.status} />
        </div>
        {context}
        <p className="mt-1 text-sm text-muted-foreground">
          Delivery {formatDate(batch.delivery_date)}. Uploaded {formatDateTime(batch.created_at)}
          {batch.created_by ? ` by ${batch.created_by}` : ""}
          {batch.original_filename ? ` from ${batch.original_filename}` : ""}.
        </p>
      </div>

      {batch.status === "importing" && (
        <Card>
          <CardContent className="flex items-center gap-3 py-6">
            <Loader2 className="size-5 animate-spin text-primary" />
            <div>
              <p className="font-medium">Checking the file</p>
              <p className="text-sm text-muted-foreground">Reading each row and checking addresses. This usually takes a few seconds.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {batch.status === "failed" && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>This file could not be read</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>{batch.error_message}</span>
            {retry}
          </AlertDescription>
        </Alert>
      )}

      {(batch.status === "ready" || batch.status === "needs_review" || batch.status === "routed") && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Orders" value={batch.row_count} />
            <Stat
              label={batch.routed_count > 0 ? "Routed" : "Ready to route"}
              value={batch.routed_count > 0 ? batch.routed_count : batch.ready_count}
              tone="good"
              hint={batch.routed_count > 0 && batch.routed_count < batch.ready_count ? `${batch.ready_count - batch.routed_count} still waiting` : undefined}
            />
            <Stat label="Need attention" value={batch.problem_count} tone={batch.problem_count > 0 ? "warn" : undefined} />
          </div>

          {batch.problem_count > 0 && (
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertTitle>
                {batch.problem_count} {batch.problem_count === 1 ? "order needs" : "orders need"} a fix before pickup
              </AlertTitle>
              <AlertDescription>{problemHint}</AlertDescription>
            </Alert>
          )}

          {actions}

          {mapStops.length > 0 && (
            <Card className="overflow-hidden py-0">
              <BatchMap pickup={pickup} stops={mapStops} routes={mapRoutes} />
              <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 text-xs text-muted-foreground">
                {batch.routes.length === 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ background: STOP_READY }} /> Ready
                  </span>
                )}
                {batch.routes.map((r, i) => (
                  <span key={r.id} className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ background: routeColor(i) }} /> {r.display_name}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: STOP_PROBLEM }} /> Needs attention</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[#f2b640]" /> Pickup</span>
                {unplaced > 0 && <span className="ml-auto">{unplaced} {unplaced === 1 ? "order" : "orders"} could not be placed on the map</span>}
              </div>
            </Card>
          )}

          <div className="flex items-center justify-between gap-4">
            <h2 className="font-semibold">Orders</h2>
            {batch.problem_count > 0 && (
              <Button variant={problemsOnly ? "default" : "outline"} size="sm" onClick={() => setProblemsOnly((v) => !v)}>
                {problemsOnly ? "Showing problems only" : "Show problems only"}
              </Button>
            )}
          </div>

          <Card className="overflow-hidden py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Locked price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <OrderRow key={o.id} order={o} />
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone, hint }: { label: string; value: number; tone?: "good" | "warn"; hint?: string }) {
  const color = tone === "good" ? "text-primary" : tone === "warn" ? "text-[#9a5b00]" : "";
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`mt-1 text-3xl font-semibold tabular-nums ${color}`}>{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function OrderRow({ order }: { order: Order }) {
  const hasProblems = order.problems.length > 0;
  return (
    <TableRow className={hasProblems ? "bg-[#fff8e6]" : undefined}>
      <TableCell className="text-muted-foreground tabular-nums">{order.row_number}</TableCell>
      <TableCell>
        <p className="font-medium">{order.recipient_name ?? <span className="text-muted-foreground">No name</span>}</p>
        <p className="text-xs text-muted-foreground">{order.recipient_phone ?? order.recipient_email ?? "No contact"}</p>
        {order.external_id && <p className="text-xs text-muted-foreground">Ref {order.external_id}</p>}
      </TableCell>
      <TableCell>
        <p>{order.full_address || <span className="text-muted-foreground">No address</span>}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {order.leave_at_door && <Badge variant="outline">Leave at door</Badge>}
          {order.notes && <span className="text-xs text-muted-foreground">{order.notes}</span>}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">{order.quantity}</TableCell>
      <TableCell className="text-right tabular-nums">
        {order.settled_price_cents === null ? <span className="text-muted-foreground">—</span> : formatMoney(order.settled_price_cents)}
      </TableCell>
      <TableCell>
        {hasProblems ? (
          <ul className="space-y-0.5 text-sm text-[#9a5b00]">
            {order.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : order.route_number ? (
          <span className="text-sm">
            Route {order.route_number}, stop {order.stop_position}
          </span>
        ) : (
          <span className="text-sm text-primary">Ready</span>
        )}
      </TableCell>
    </TableRow>
  );
}