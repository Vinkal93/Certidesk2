"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  Building2,
  ClipboardCheck,
  GraduationCap,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  DailyActivityPoint,
  InstituteUsageBreakdown,
  UsageAggregateRecord,
  UsageEventRecord,
} from "@/services/metering.service";

interface Props {
  billingPeriod: string;
  thresholds: number[];
  summary: {
    totalInstitutes: number;
    activeInstitutes: number;
    totalStudents: number;
    totalStaff: number;
    totalCourses: number;
    totalExams: number;
    totalCertificates: number;
    totalReceipts: number;
    totalWalletTx: number;
  };
  instituteBreakdown: InstituteUsageBreakdown[];
  dailySeries: DailyActivityPoint[];
  aggregates: Array<UsageAggregateRecord & { instituteName: string }>;
  recentEvents: UsageEventRecord[];
}

type MetricFilter =
  "totalUnits" | "students" | "courses" | "exams" | "certificates" | "feeReceipts";

const METRIC_LABELS: Record<MetricFilter, string> = {
  totalUnits: "Total Activity Units",
  students: "Students",
  courses: "Courses",
  exams: "Examinations",
  certificates: "Certificates",
  feeReceipts: "Fee Receipts",
};

export function UsageOverviewClient({
  billingPeriod,
  thresholds,
  summary,
  instituteBreakdown,
  dailySeries,
  aggregates,
  recentEvents,
}: Props) {
  const [selectedMetric, setSelectedMetric] = React.useState<MetricFilter>("totalUnits");
  const [search, setSearch] = React.useState("");

  const maxInstituteMetric = React.useMemo(() => {
    const vals = instituteBreakdown.map((i) => i[selectedMetric]);
    return Math.max(1, ...vals);
  }, [instituteBreakdown, selectedMetric]);

  const maxDailyTotal = React.useMemo(() => {
    return Math.max(1, ...dailySeries.map((d) => d.total));
  }, [dailySeries]);

  const filteredInstitutes = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return instituteBreakdown;
    return instituteBreakdown.filter(
      (i) =>
        i.instituteName.toLowerCase().includes(q) ||
        i.instituteCode.toLowerCase().includes(q)
    );
  }, [instituteBreakdown, search]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="border-border bg-background flex flex-col justify-between gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
              Platform Usage &amp; Resource Analytics
            </h1>
            <Badge variant="primary">Live Metering • {billingPeriod}</Badge>
          </div>
          <p className="text-muted mt-1 text-xs sm:text-sm">
            Real-time resource utilization across institutes, students, courses, exams,
            certificates, and wallet transactions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Quota Thresholds: {thresholds.join("%, ")}%</Badge>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
              <Building2 className="text-primary h-3.5 w-3.5" aria-hidden="true" />
              Institutes
            </div>
            <p className="text-foreground mt-1 text-2xl font-bold">
              {summary.totalInstitutes}
            </p>
            <p className="text-muted text-[11px]">{summary.activeInstitutes} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
              <GraduationCap className="text-primary h-3.5 w-3.5" aria-hidden="true" />
              Students
            </div>
            <p className="text-foreground mt-1 text-2xl font-bold">
              {summary.totalStudents}
            </p>
            <p className="text-muted text-[11px]">Enrolled across platform</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
              <Users className="text-primary h-3.5 w-3.5" aria-hidden="true" />
              Staff
            </div>
            <p className="text-foreground mt-1 text-2xl font-bold">
              {summary.totalStaff}
            </p>
            <p className="text-muted text-[11px]">Active staff accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
              <BookOpen className="text-primary h-3.5 w-3.5" aria-hidden="true" />
              Courses
            </div>
            <p className="text-foreground mt-1 text-2xl font-bold">
              {summary.totalCourses}
            </p>
            <p className="text-muted text-[11px]">{summary.totalExams} exams created</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
              <Award className="text-primary h-3.5 w-3.5" aria-hidden="true" />
              Certificates
            </div>
            <p className="text-foreground mt-1 text-2xl font-bold">
              {summary.totalCertificates}
            </p>
            <p className="text-muted text-[11px]">Issued credentials</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
              <ClipboardCheck className="text-primary h-3.5 w-3.5" aria-hidden="true" />
              Ledger Ops
            </div>
            <p className="text-foreground mt-1 text-2xl font-bold">
              {summary.totalReceipts + summary.totalWalletTx}
            </p>
            <p className="text-muted text-[11px]">
              {summary.totalReceipts} receipts · {summary.totalWalletTx} wallet tx
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 14-Day Activity Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="text-primary h-4 w-4" aria-hidden="true" />
                14-Day Platform Activity Trend
              </CardTitle>
              <span className="text-muted text-xs">
                Admissions, Receipts &amp; Wallet
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mt-2 flex h-52 items-end gap-1.5 sm:gap-2">
              {dailySeries.map((point) => {
                const heightPct = Math.max(
                  point.total > 0 ? 10 : 4,
                  Math.round((point.total / maxDailyTotal) * 100)
                );
                return (
                  <div
                    key={point.date}
                    className="group flex flex-1 flex-col items-center gap-1.5"
                    title={`${point.label}: ${point.total} total (${point.admissions} admissions, ${point.receipts} receipts, ${point.transactions} wallet tx)`}
                  >
                    <span className="text-muted text-[10px] font-medium opacity-0 transition group-hover:opacity-100">
                      {point.total}
                    </span>
                    <div className="bg-surface flex h-36 w-full items-end overflow-hidden rounded-t-md">
                      <div
                        className="bg-primary group-hover:bg-primary-dark w-full rounded-t-md transition-all"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-muted text-[10px] whitespace-nowrap">
                      {point.label.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Per-Institute Resource Bar Comparison */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="text-primary h-4 w-4" aria-hidden="true" />
                Institute Resource Comparison
              </CardTitle>
              <select
                aria-label="Select usage metric"
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as MetricFilter)}
                className="border-border bg-background text-foreground h-8 rounded-lg border px-2.5 text-xs"
              >
                {Object.entries(METRIC_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {instituteBreakdown.length === 0 ? (
              <p className="text-muted py-12 text-center text-sm">
                No institutes registered yet.
              </p>
            ) : (
              <div className="space-y-3 pt-2">
                {instituteBreakdown.slice(0, 6).map((inst) => {
                  const val = inst[selectedMetric];
                  const pct = Math.max(
                    val > 0 ? 6 : 2,
                    Math.round((val / maxInstituteMetric) * 100)
                  );
                  return (
                    <div key={inst.instituteId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <Link
                          href={`/su/institutes/${inst.instituteId}/impression`}
                          className="text-foreground hover:text-primary truncate font-medium"
                        >
                          {inst.instituteName}{" "}
                          <span className="text-muted">({inst.instituteCode})</span>
                        </Link>
                        <span className="text-foreground font-semibold">{val}</span>
                      </div>
                      <div className="bg-surface h-2.5 w-full overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Institute Usage Matrix */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="text-primary h-4 w-4" aria-hidden="true" />
              Institute Consumption Matrix ({filteredInstitutes.length})
            </CardTitle>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter institute..."
              className="border-border bg-surface text-foreground h-9 w-full rounded-lg border px-3 text-xs sm:w-64"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-border bg-surface text-muted border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Institute</th>
                  <th className="px-4 py-3 font-semibold">Students</th>
                  <th className="px-4 py-3 font-semibold">Staff</th>
                  <th className="px-4 py-3 font-semibold">Courses</th>
                  <th className="px-4 py-3 font-semibold">Exams</th>
                  <th className="px-4 py-3 font-semibold">Certs</th>
                  <th className="px-4 py-3 font-semibold">Receipts</th>
                  <th className="px-4 py-3 text-right font-semibold">Impression</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {filteredInstitutes.map((inst) => (
                  <tr key={inst.instituteId} className="hover:bg-surface/60 transition">
                    <td className="px-4 py-3">
                      <p className="text-foreground font-semibold">
                        {inst.instituteName}
                      </p>
                      <p className="text-muted text-xs">{inst.instituteCode}</p>
                    </td>
                    <td className="px-4 py-3 font-medium">{inst.students}</td>
                    <td className="px-4 py-3">{inst.staff}</td>
                    <td className="px-4 py-3">{inst.courses}</td>
                    <td className="px-4 py-3">{inst.exams}</td>
                    <td className="px-4 py-3">{inst.certificates}</td>
                    <td className="px-4 py-3">{inst.feeReceipts}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/su/institutes/${inst.instituteId}/impression`}
                        className="text-primary font-semibold hover:underline"
                      >
                        Live View &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Metered Usage Aggregates & Events */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Metered Billing Aggregates ({aggregates.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {aggregates.length === 0 ? (
              <p className="text-muted text-xs">
                No metered event counters recorded for {billingPeriod} yet; live database
                counts above reflect real active records.
              </p>
            ) : (
              aggregates.map((agg) => (
                <div key={agg.id} className="border-border rounded-lg border p-3 text-xs">
                  <div className="text-foreground font-semibold">{agg.instituteName}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {Object.entries(agg.counters).map(([k, v]) => (
                      <Badge key={k} variant="primary">
                        {k}: {v}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Recent Usage Events ({recentEvents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentEvents.length === 0 ? (
              <p className="text-muted text-xs">No metered usage events recorded yet.</p>
            ) : (
              recentEvents.slice(0, 10).map((ev) => (
                <div
                  key={ev.id}
                  className="border-border flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                >
                  <div>
                    <p className="text-foreground font-medium">{ev.metricKey}</p>
                    <p className="text-muted">{ev.sourceOperation}</p>
                  </div>
                  <Badge variant="outline">
                    +{ev.quantity} {ev.unit}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
