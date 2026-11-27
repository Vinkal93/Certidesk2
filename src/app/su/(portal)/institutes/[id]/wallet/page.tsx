import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AuthError, getSessionUser } from "@/lib/security/session";
import { getInstituteById, getInstituteTransactions } from "@/services/institute.service";
import { buildPrivateNoIndexMetadata } from "@/lib/seo/metadata";
import { SuWalletsClient } from "@/features/super-admin/components/wallets-client";

export const metadata: Metadata = buildPrivateNoIndexMetadata("Institute Wallet Control");

export default async function SuperAdminInstituteWalletPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    redirect("/su");
  }

  const { id } = await params;

  let institute;
  try {
    institute = await getInstituteById(id);
  } catch (error) {
    if (error instanceof AuthError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const transactions = await getInstituteTransactions(institute.id);

  return (
    <div className="space-y-6">
      <div className="border-border flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div>
          <Link
            href={`/su/institutes/${institute.id}`}
            className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to {institute.name}
          </Link>
          <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight">
            {institute.name} — Wallet &amp; Ledger Control
          </h1>
          <p className="text-muted mt-0.5 font-mono text-xs">
            {institute.code} · {institute.id}
          </p>
        </div>
      </div>

      <SuWalletsClient
        initialInstitutes={[institute]}
        initialTransactions={transactions}
      />
    </div>
  );
}
