import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { listAuditLogs } from "@/services/institute.service";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Audit Logs",
  robots: { index: false, follow: false },
};

export default async function SuperAdminAuditLogsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    redirect("/su");
  }

  const logs = await listAuditLogs();

  return (
    <PageContainer>
      <Section spacing="sm" background="surface">
        <Container>
          <div className="border-border mb-6 border-b pb-5">
            <Link
              href="/su/dashboard"
              className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Dashboard
            </Link>
            <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight">
              Audit Logs
            </h1>
            <p className="text-muted mt-1 text-sm">
              Latest 100 security, institute, student, and wallet events.
            </p>
          </div>

          <div className="border-border bg-background overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-border bg-surface/60 text-muted border-b text-xs font-semibold uppercase">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Actor Role</th>
                  <th className="px-4 py-3">Institute</th>
                  <th className="px-4 py-3">Target</th>
                </tr>
              </thead>
              <tbody className="divide-border/70 divide-y">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-muted px-4 py-8 text-center">
                      No audit logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td className="text-muted px-4 py-3 font-mono text-xs">
                        {log.createdAt.replace("T", " ").slice(0, 19)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{log.action}</Badge>
                      </td>
                      <td className="text-foreground px-4 py-3">{log.actorRole}</td>
                      <td className="text-muted px-4 py-3 font-mono text-xs">
                        {log.instituteId ?? "—"}
                      </td>
                      <td className="text-muted px-4 py-3 font-mono text-xs">
                        {log.targetId ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Container>
      </Section>
    </PageContainer>
  );
}
