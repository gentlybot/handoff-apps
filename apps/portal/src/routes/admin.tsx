import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { PortalHeader } from "@/components/portal-header";
import { getSession } from "@/lib/session";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    const session = getSession();
    if (!session) throw redirect({ to: "/admin/login" });
    if (session.user.role !== "admin") throw redirect({ to: "/merchant/batches" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="min-h-dvh">
      <PortalHeader context="Crosstown ops" home="/admin/batches" signInPath="/admin/login" nav={[
          { label: "Batches", to: "/admin/batches" },
          { label: "Routes", to: "/admin/routes" },
          { label: "Pricing", to: "/admin/pricing" },
        ]} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}