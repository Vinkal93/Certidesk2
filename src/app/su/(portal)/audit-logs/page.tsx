import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listAuditLogsPaginated } from "@/services/security-center.service";
import { SecurityAuditLogsClient } from "@/features/super-admin/components/security-audit-logs-client";

export const metadata: Metadata = {
  title: "Audit Logs",
  robots: { index: false, follow: false },
};

export default async function SuperAdminAuditLogsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    redirect("/su");
  }

  const result = await listAuditLogsPaginated(user, { page: 1, pageSize: 25 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Immutable Audit Logs</h1>
        <p className="text-muted-foreground text-sm">
          Append-only administrative and security audit trail with secret redaction.
        </p>
      </div>
      <SecurityAuditLogsClient
        initialLogs={result.items}
        initialTotal={result.total}
        initialTotalPages={result.totalPages}
      />
    </div>
  );
}
