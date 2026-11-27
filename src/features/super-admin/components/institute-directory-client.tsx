"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EnterLivePortalButton } from "./enter-live-portal-button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { InstituteRecord } from "@/types/domain";

export function InstituteDirectoryClient({
  initialItems,
  initialTotal,
  initialTotalPages,
}: {
  initialItems: InstituteRecord[];
  initialTotal: number;
  initialTotalPages: number;
}) {
  const [items, setItems] = React.useState<InstituteRecord[]>(initialItems);
  const [total, setTotal] = React.useState(initialTotal);
  const [totalPages, setTotalPages] = React.useState(initialTotalPages);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [loading, setLoading] = React.useState(false);

  const fetchDirectory = React.useCallback(
    async (nextPage: number, nextSearch: string, nextStatus: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          status: nextStatus,
        });
        if (nextSearch.trim()) {
          params.set("search", nextSearch.trim());
        }
        const res = await fetch(`/api/su/institutes?${params.toString()}`);
        const json = (await res.json()) as {
          ok: boolean;
          data?: {
            items: InstituteRecord[];
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
    },
    []
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Search Institutes"
            placeholder="Search by name, Institute ID, owner, or email..."
            leftAddon={<Search className="h-4 w-4" aria-hidden="true" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            label="Status"
            value={status}
            onChange={(e) => {
              const next = e.target.value;
              setStatus(next);
              void fetchDirectory(1, search, next);
            }}
            options={[
              { label: "All Statuses", value: "all" },
              { label: "Active", value: "active" },
              { label: "Suspended", value: "suspended" },
            ]}
          />
        </div>
        <Button
          variant="outline"
          loading={loading}
          onClick={() => fetchDirectory(1, search, status)}
        >
          Apply
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No institutes found"
          description="Try adjusting your search query or register a new institute."
          action={
            <Link
              href="/su/institutes/new"
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              Register Institute
            </Link>
          }
        />
      ) : (
        <div className="border-border bg-background overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-border bg-surface/60 text-muted border-b text-xs font-semibold uppercase">
                <th className="px-4 py-3">Institute ID</th>
                <th className="px-4 py-3">Institute Name</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Wallet</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-border/70 divide-y">
              {items.map((inst) => (
                <tr key={inst.id} className="hover:bg-surface/40">
                  <td className="text-foreground px-4 py-3.5 font-mono text-xs font-medium">
                    {inst.code}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-foreground font-medium">{inst.name}</p>
                    <p className="text-muted text-xs">{inst.email}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-foreground">{inst.ownerName}</p>
                    <p className="text-muted text-xs">{inst.phone}</p>
                  </td>
                  <td className="text-foreground px-4 py-3.5 font-medium">
                    ₹{(inst.walletBalancePaise / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={inst.status === "active" ? "success" : "danger"}>
                      {inst.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <EnterLivePortalButton
                        instituteId={inst.id}
                        label="Live Portal"
                        size="sm"
                      />
                      <Link
                        href={`/su/institutes/${inst.id}/impression`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Snapshot
                      </Link>
                      <Link
                        href={`/su/institutes/${inst.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Manage
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
          Total: {total} institute(s) &bull; Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => fetchDirectory(page - 1, search, status)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => fetchDirectory(page + 1, search, status)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
