import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { listInstituteStudentsPaginated } from "@/services/student.service";
import { buttonVariants } from "@/components/ui/button";
import { StudentsDirectoryClient } from "@/features/students/components/students-directory-client";

export const metadata: Metadata = {
  title: "Institute Students",
  robots: { index: false, follow: false },
};

export default async function InstituteStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || (user.role !== "institute_admin" && user.role !== "staff")) {
    redirect("/institute/login");
  }

  const { search } = await searchParams;
  const result = await listInstituteStudentsPaginated(user, {
    search,
    page: 1,
    pageSize: 15,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-foreground text-xl font-bold tracking-tight">
            Student Directory
          </h2>
          <p className="text-muted text-sm">
            Manage admissions, batch assignments, credentials, and student status.
          </p>
        </div>
        <Link
          href="/institute/students/new"
          className={buttonVariants({ variant: "primary", size: "sm" })}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Admit Student
        </Link>
      </div>

      <StudentsDirectoryClient
        initialItems={result.items}
        initialTotal={result.total}
        initialTotalPages={result.totalPages}
        initialSearch={search ?? ""}
      />
    </div>
  );
}
