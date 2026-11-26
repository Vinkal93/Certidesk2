"use client";

import * as React from "react";
import Link from "next/link";
import { Download, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { StudentRecord } from "@/types/domain";

export function StudentsDirectoryClient({
  initialItems,
  initialTotal,
  initialTotalPages,
  initialSearch = "",
}: {
  initialItems: StudentRecord[];
  initialTotal: number;
  initialTotalPages: number;
  initialSearch?: string;
}) {
  const [items, setItems] = React.useState(initialItems);
  const [total, setTotal] = React.useState(initialTotal);
  const [totalPages, setTotalPages] = React.useState(initialTotalPages);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState(initialSearch);
  const [status, setStatus] = React.useState("all");
  const [loading, setLoading] = React.useState(false);

  const fetchStudents = async (
    nextPage: number,
    nextSearch = search,
    nextStatus = status
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        status: nextStatus,
      });
      if (nextSearch.trim()) params.set("search", nextSearch.trim());
      const res = await fetch(`/api/institute/students?${params.toString()}`);
      const json = (await res.json()) as {
        ok: boolean;
        data?: {
          items: StudentRecord[];
          total: number;
          page: number;
          totalPages: number;
        };
      };
      if (res.ok && json.ok && json.data) {
        setItems(json.data.items);
        setTotal(json.data.total);
        setPage(json.data.page);
        setTotalPages(json.data.totalPages);
      }
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const header = [
      "Student ID",
      "Full Name",
      "Email",
      "Phone",
      "Course",
      "Batch",
      "Status",
      "Admission Date",
    ];
    const rows = items.map((s) => [
      s.studentCode,
      s.fullName,
      s.email,
      s.phone,
      s.courseName,
      s.batchName,
      s.status,
      s.admissionDate ?? s.createdAt.slice(0, 10),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Search Students"
            placeholder="Name, Student ID, email, course, or batch..."
            leftAddon={<Search className="h-4 w-4" aria-hidden="true" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              void fetchStudents(1, search, e.target.value);
            }}
            options={[
              { label: "All", value: "all" },
              { label: "Active", value: "active" },
              { label: "Disabled", value: "disabled" },
            ]}
          />
        </div>
        <Button
          variant="outline"
          loading={loading}
          onClick={() => fetchStudents(1, search, status)}
        >
          Apply
        </Button>
        <Button
          variant="outline"
          leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}
          onClick={exportCsv}
          disabled={items.length === 0}
        >
          Export CSV
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No students found"
          description="Try adjusting your filters or admit a new student."
          action={
            <Link
              href="/institute/students/new"
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Admit Student
            </Link>
          }
        />
      ) : (
        <div className="border-border bg-background overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-border bg-surface/60 text-muted border-b text-xs font-semibold uppercase">
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Course &amp; Batch</th>
                <th className="px-4 py-3">Guardian</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-border/70 divide-y">
              {items.map((stu) => (
                <tr key={stu.id} className="hover:bg-surface/40">
                  <td className="px-4 py-3.5 font-mono text-xs font-medium">
                    {stu.studentCode}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-foreground font-medium">{stu.fullName}</p>
                    <p className="text-muted text-xs">
                      {stu.email} &bull; {stu.phone}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-foreground">{stu.courseName}</p>
                    <p className="text-muted text-xs">{stu.batchName}</p>
                  </td>
                  <td className="text-muted px-4 py-3.5 text-xs">
                    {stu.guardianName || "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={stu.status === "active" ? "success" : "danger"}>
                      {stu.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex gap-2">
                      <Link
                        href={`/institute/students/${stu.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        View
                      </Link>
                      <Link
                        href={`/institute/students/${stu.id}/edit`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-muted flex items-center justify-between text-xs">
        <span>
          Total: {total} student(s) &bull; Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => fetchStudents(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => fetchStudents(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
