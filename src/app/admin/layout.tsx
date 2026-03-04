import { ReactNode } from "react";
import { AdminAutoRefresh } from "@/components/admin/admin-auto-refresh";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <AdminAutoRefresh intervalMs={4000} />
      {children}
    </>
  );
}