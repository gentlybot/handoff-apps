import { queryOptions } from "@tanstack/react-query";
import { api } from "./api";

export const deliveryAllowancesQuery = (userId: number) =>
  queryOptions({
    queryKey: ["merchant", "delivery-allowances", userId],
    queryFn: api.merchant.deliveryAllowances,
    staleTime: 0,
  });

export const adminPricingQuery = queryOptions({
  queryKey: ["admin", "pricing"],
  queryFn: api.admin.pricing,
});

export const batchesQuery = queryOptions({
  queryKey: ["batches"],
  queryFn: api.listBatches,
});

export const batchQuery = (id: string) =>
  queryOptions({
    queryKey: ["batches", id],
    queryFn: () => api.getBatch(id),
    // Poll while the import job is running, then stop.
    refetchInterval: (query) => (query.state.data?.status === "importing" ? 1500 : false),
  });

export const adminBatchesQuery = (date: string) =>
  queryOptions({
    queryKey: ["admin", "batches", { date }],
    queryFn: () => api.admin.listBatches(date),
    refetchInterval: (query) => (query.state.data?.totals.importing ? 1500 : false),
  });

export const adminBatchQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "batches", id],
    queryFn: () => api.admin.getBatch(id),
    refetchInterval: (query) => (query.state.data?.status === "importing" ? 1500 : false),
  });

export const adminRoutesQuery = (date: string) =>
  queryOptions({
    queryKey: ["admin", "routes", { date }],
    queryFn: () => api.admin.listRoutes(date),
    // Poll while any merchant's routes are being built.
    refetchInterval: (query) => (query.state.data && query.state.data.totals.building > 0 ? 1500 : false),
  });

export const merchantRoutingQuery = (date: string) =>
  queryOptions({
    queryKey: ["merchant", "routing", { date }],
    queryFn: () => api.merchant.routing(date),
    refetchInterval: (query) => {
      const status = query.state.data?.plan?.status;
      return status === "queued" || status === "running" ? 1500 : false;
    },
  });