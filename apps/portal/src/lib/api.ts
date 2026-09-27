import { clearSession, getSession, type Merchant, type Session, type User } from "./session";

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3200").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (!(init.body instanceof FormData) && init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  const session = getSession();
  if (session) headers.set("Authorization", `Bearer ${session.token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (res.status === 401 && session && getSession()?.token === session.token) {
    clearSession();
    window.location.assign(window.location.pathname.startsWith("/admin") ? "/admin/login" : "/merchant/login");
  }

  if (res.status === 204) return undefined as T;

  const data = (await res.json().catch(() => ({}))) as { error?: string; errors?: Record<string, string[]> } & T;
  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`, data.errors);
  }
  return data;
}

export type BatchStatus = "importing" | "needs_review" | "ready" | "routed" | "failed";

export type Batch = {
  id: number;
  name: string;
  status: BatchStatus;
  source: string;
  delivery_date: string;
  original_filename: string | null;
  row_count: number;
  ready_count: number;
  problem_count: number;
  routed_count: number;
  error_message: string | null;
  imported_at: string | null;
  created_at: string;
  created_by: string | null;
};

export type Order = {
  id: number;
  row_number: number;
  external_id: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_email: string | null;
  address_line: string | null;
  unit: string | null;
  city: string | null;
  postal_code: string | null;
  full_address: string;
  notes: string | null;
  quantity: number;
  leave_at_door: boolean;
  status: "pending" | "problem" | "ready" | "routed" | "delivered" | "failed";
  settled_price_cents: number | null;
  problems: string[];
  lat: number | null;
  lng: number | null;
  geocode_precision: "exact" | "interpolated" | "approximate" | "none" | null;
  route_id: number | null;
  route_number: number | null;
  stop_position: number | null;
};

export type RouteStatus = "planned" | "offered" | "assigned" | "in_progress" | "completed" | "cancelled";
export type CourierBrief = { id: number; name: string; vehicle_type: string } | null;

export type RouteSummary = {
  id: number;
  route_number: number;
  display_name: string;
  status: RouteStatus;
  engine: string;
  delivery_date: string;
  stop_count: number;
  distance_km: number;
  duration_minutes: number;
  start_at: string;
  start_lat: number;
  start_lng: number;
  pay_cents: number;
  courier: CourierBrief;
  offered_at: string | null;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  delivered_count: number;
  failed_count: number;
};

export type RouteOffer = {
  id: number;
  status: "offered" | "accepted" | "declined" | "expired" | "withdrawn";
  courier: CourierBrief;
  expires_at: string;
  responded_at: string | null;
};

export type RouteStop = {
  position: number;
  order_id: number;
  batch_id: number;
  recipient_name: string | null;
  address: string;
  quantity: number;
  leave_at_door: boolean;
  lat: number;
  lng: number;
  leg_km: number;
  eta: string;
  status: "pending" | "delivered" | "failed";
  completed_at: string | null;
  failure_reason: string | null;
  note: string | null;
  has_photo: boolean;
};

export type BatchDetail = Batch & { orders: Order[]; routes: RouteSummary[] };

export type MerchantBrief = {
  id: number;
  business_name: string;
  slug: string;
  cutoff_time: string;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
};
export type AdminBatch = Batch & { merchant: MerchantBrief };
export type AdminBatchDetail = BatchDetail & { merchant: MerchantBrief };
export type Pricing = {
  default_per_stop_price_cents: number;
  merchants: Array<{
    id: number;
    business_name: string;
    per_stop_price_cents: number | null;
    effective_per_stop_price_cents: number;
  }>;
};
export type RouteDetail = RouteSummary & { merchant: MerchantBrief; stops: RouteStop[]; offers: RouteOffer[]; pay_breakdown: { label: string; cents: number }[] };

export type RoutePlan = {
  status: "queued" | "running" | "done" | "failed";
  engine: string | null;
  routes_count: number;
  stops_count: number;
  unassigned_count: number;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  requested_by: string | null;
};

export type MerchantRouting = {
  merchant: MerchantBrief;
  ready_unrouted: number;
  unplaced: number;
  routed: number;
  problems: number;
  plan: RoutePlan | null;
  routes: RouteDetail[];
};

export type AdminRoutesResponse = {
  date: string;
  engine: string;
  totals: { merchants: number; routes: number; stops: number; unrouted: number; building: number };
  merchants: MerchantRouting[];
};

export type AdminBatchesResponse = {
  date: string;
  totals: { batches: number; merchants: number; orders: number; ready: number; problems: number; importing: number; failed: number };
  batches: AdminBatch[];
};

export type MerchantRoutingResponse = {
  date: string;
  ready_unrouted: number;
  unplaced: number;
  routed: number;
  plan: RoutePlan | null;
  routes: RouteSummary[];
};

export type DeliveryServiceType = "same_day" | "next_day" | "return_pickup" | "redelivery";
export type AllowanceUsage = { limit: number; used: number; remaining: number };
export type DeliveryAllowance = {
  service_type: DeliveryServiceType;
  label: string;
  description: string;
  enabled: boolean;
  unit: "jobs";
  merchant: AllowanceUsage;
  // A null limit means no personal cap; zero blocks personal bookings.
  personal: { limit: number | null; used: number; remaining: number | null };
  available_to_you: number;
  blocked_by: ("service_disabled" | "merchant_limit" | "personal_limit")[];
};
export type DeliveryAllowancesResponse = {
  period_start: string;
  resets_on: string;
  timezone: string;
  merchant: { id: number; name: string };
  user: { id: number; name: string };
  allowances: DeliveryAllowance[];
};
export type DeliveryReservation = {
  id: number;
  service_type: DeliveryServiceType;
  units: number;
  period_start: string;
  request_key: string;
  cancelled_at: string | null;
};

export const api = {
  merchant: {
    deliveryAllowances() {
      return request<DeliveryAllowancesResponse>("/api/v1/merchant/delivery_allowances");
    },
    reserveDeliveryAllowance(input: { service_type: DeliveryServiceType; units: number; request_key: string }) {
      return request<{ reservation: DeliveryReservation; balance: DeliveryAllowancesResponse }>("/api/v1/merchant/delivery_reservations", {
        method: "POST", body: JSON.stringify(input),
      });
    },
    cancelDeliveryReservation(id: number) {
      return request<void>(`/api/v1/merchant/delivery_reservations/${id}`, { method: "DELETE" });
    },
    routing(date: string) {
      return request<MerchantRoutingResponse>(`/api/v1/merchant/routes?date=${encodeURIComponent(date)}`);
    },
    buildRoutes(date: string) {
      return request<{ plan: RoutePlan }>("/api/v1/merchant/routes/build", { method: "POST", body: JSON.stringify({ date }) }).then((r) => r.plan);
    },
  },
  signIn(email: string, password: string) {
    return request<Session>("/api/v1/session", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  signOut() {
    return request<void>("/api/v1/session", { method: "DELETE" });
  },
  me() {
    return request<{ user: User; merchant: Merchant | null }>("/api/v1/me");
  },
  listBatches() {
    return request<{ batches: Batch[] }>("/api/v1/merchant/batches").then((r) => r.batches);
  },
  getBatch(id: number | string) {
    return request<{ batch: BatchDetail }>(`/api/v1/merchant/batches/${id}`).then((r) => r.batch);
  },
  admin: {
    pricing() {
      return request<{ pricing: Pricing }>("/api/v1/admin/pricing").then((r) => r.pricing);
    },
    updatePricing(input: { default_per_stop_price_cents?: number; merchant_prices?: Array<{ merchant_id: number; per_stop_price_cents: number | null }> }) {
      return request<{ pricing: Pricing }>("/api/v1/admin/pricing", { method: "PATCH", body: JSON.stringify(input) }).then((r) => r.pricing);
    },
    listBatches(date: string) {
      return request<AdminBatchesResponse>(`/api/v1/admin/batches?date=${encodeURIComponent(date)}`);
    },
    getBatch(id: number | string) {
      return request<{ batch: AdminBatchDetail }>(`/api/v1/admin/batches/${id}`).then((r) => r.batch);
    },
    listMerchants() {
      return request<{ merchants: Merchant[] }>("/api/v1/admin/merchants").then((r) => r.merchants);
    },
    listRoutes(date: string) {
      return request<AdminRoutesResponse>(`/api/v1/admin/routes?date=${encodeURIComponent(date)}`);
    },
    getRoute(id: number | string) {
      return request<{ route: RouteDetail }>(`/api/v1/admin/routes/${id}`).then((r) => r.route);
    },
    offerRoute(routeId: number) {
      return request<{ route: RouteDetail }>(`/api/v1/admin/routes/${routeId}/offer`, { method: "POST", body: "{}" }).then((r) => r.route);
    },
    buildRoutes(merchantId: number, date: string) {
      return request<{ plan: RoutePlan }>("/api/v1/admin/routes/build", {
        method: "POST",
        body: JSON.stringify({ merchant_id: merchantId, date }),
      }).then((r) => r.plan);
    },
  },
  createBatch(input: { file: File; delivery_date?: string; name?: string }) {
    const body = new FormData();
    body.append("file", input.file);
    if (input.delivery_date) body.append("delivery_date", input.delivery_date);
    if (input.name) body.append("name", input.name);
    return request<{ batch: Batch }>("/api/v1/merchant/batches", { method: "POST", body }).then((r) => r.batch);
  },
};