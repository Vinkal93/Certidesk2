import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listInstituteOwners } from "@/services/su-platform.service";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Institute Owners",
  robots: { index: false, follow: false },
};

export default async function SuOwnersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    redirect("/su");
  }

  const { search } = await searchParams;
  const owners = await listInstituteOwners(user, search);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Institute Owners
        </h2>
        <p className="text-muted text-sm">
          Manage institute administrator accounts, status, and password recovery.
        </p>
      </div>

      <div className="border-border bg-background overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-border bg-surface/60 text-muted border-b text-xs font-semibold uppercase">
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Institute</th>
              <th className="px-4 py-3">Account Status</th>
              <th className="px-4 py-3 text-right">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-border/70 divide-y">
            {owners.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted px-4 py-8 text-center">
                  No institute owners found.
                </td>
              </tr>
            ) : (
              owners.map((owner) => (
                <tr key={owner.uid}>
                  <td className="px-4 py-3">
                    <p className="text-foreground font-medium">{owner.displayName}</p>
                    <p className="text-muted text-xs">{owner.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{owner.instituteName}</p>
                    <p className="text-muted font-mono text-xs">{owner.instituteCode}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={owner.disabled ? "danger" : "success"}>
                      {owner.disabled ? "Disabled" : "Active"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {owner.instituteId && (
                      <Link
                        href={`/su/institutes/${owner.instituteId}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Open Institute
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
