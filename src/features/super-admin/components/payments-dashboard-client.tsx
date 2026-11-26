"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PaymentOrderRecord } from "@/types/payment";

interface EnvStats {
  totalCapturedCount: number;
  totalFailedCount: number;
  totalCapturedPaise: number;
  totalRefundedPaise: number;
}

export function PaymentsDashboardClient({
  initialItems,
  initialStats,
}: {
  initialItems: PaymentOrderRecord[];
  initialStats: { test: EnvStats; live: EnvStats };
}) {
  const [items, setItems] = React.useState(initialItems);
  const [stats, setStats] = React.useState(initialStats);
  const [environment, setEnvironment] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const applyFilter = async (nextEnv = environment, nextStatus = status) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        environment: nextEnv,
        status: nextStatus,
      });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/super-admin/payments?${params.toString()}`);
      const json = (await res.json()) as {
        ok: boolean;
        data?: { items: PaymentOrderRecord[]; stats: { test: EnvStats; live: EnvStats } };
      };
      if (res.ok && json.ok && json.data) {
        setItems(json.data.items);
        setStats(json.data.stats);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-border border-b pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Live Revenue Metrics</CardTitle>
              <Badge variant="success">LIVE</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-4">
            <div>
              <p className="text-muted text-xs">Captured</p>
              <p className="text-lg font-bold">{stats.live.totalCapturedCount}</p>
            </div>
            <div>
              <p className="text-muted text-xs">Failed</p>
              <p className="text-danger text-lg font-bold">
                {stats.live.totalFailedCount}
              </p>
            </div>
            <div>
              <p className="text-muted text-xs">Captured Amt</p>
              <p className="text-lg font-bold">
                ₹{(stats.live.totalCapturedPaise / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-muted text-xs">Refunds</p>
              <p className="text-lg font-bold">
                ₹{(stats.live.totalRefundedPaise / 100).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-border border-b pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Test / Sandbox Metrics</CardTitle>
              <Badge variant="outline">TEST</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-4">
            <div>
              <p className="text-muted text-xs">Captured</p>
              <p className="text-lg font-bold">{stats.test.totalCapturedCount}</p>
            </div>
            <div>
              <p className="text-muted text-xs">Failed</p>
              <p className="text-danger text-lg font-bold">
                {stats.test.totalFailedCount}
              </p>
            </div>
            <div>
              <p className="text-muted text-xs">Simulated Amt</p>
              <p className="text-lg font-bold">
                ₹{(stats.test.totalCapturedPaise / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-muted text-xs">Refunds</p>
              <p className="text-lg font-bold">
                ₹{(stats.test.totalRefundedPaise / 100).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Search Payments"
            placeholder="Order ID, Payment ID, or Institute ID..."
            leftAddon={<Search className="h-4 w-4" aria-hidden="true" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            label="Environment"
            value={environment}
            onChange={(e) => {
              setEnvironment(e.target.value);
              void applyFilter(e.target.value, status);
            }}
            options={[
              { label: "All", value: "all" },
              { label: "Live Only", value: "live" },
              { label: "Test Only", value: "test" },
            ]}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              void applyFilter(environment, e.target.value);
            }}
            options={[
              { label: "All Statuses", value: "all" },
              { label: "Captured", value: "captured" },
              { label: "Authorized", value: "authorized" },
              { label: "Created", value: "created" },
              { label: "Failed", value: "failed" },
              { label: "Refunded", value: "refunded" },
            ]}
          />
        </div>
        <Button variant="outline" loading={loading} onClick={() => applyFilter()}>
          Apply
        </Button>
      </div>

      <div className="border-border bg-background overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-border bg-surface/60 text-muted border-b text-xs font-semibold uppercase">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Env</th>
              <th className="px-4 py-3">Order / Payment ID</th>
              <th className="px-4 py-3">Institute</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-border/70 divide-y">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted px-4 py-8 text-center">
                  No payment records match the selected filters.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.orderId} className="hover:bg-surface/40">
                  <td className="text-muted px-4 py-3 font-mono text-xs">
                    {item.createdAt.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={item.environment === "live" ? "navy" : "outline"}>
                      {item.environment.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    <p className="text-foreground font-medium">{item.orderId}</p>
                    <p className="text-muted">{item.razorpayPaymentId ?? "—"}</p>
                  </td>
                  <td className="text-muted px-4 py-3 font-mono text-xs">
                    {item.instituteId}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    ₹{(item.amountPaise / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        item.status === "captured"
                          ? "success"
                          : item.status === "failed"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/su/payments/${item.orderId}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Inspect
                    </Link>
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
