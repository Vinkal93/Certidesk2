"use client";

import * as React from "react";
import Link from "next/link";
import {
  Award,
  BarChart3,
  BookOpen,
  CalendarCheck,
  Download,
  ExternalLink,
  GraduationCap,
  IndianRupee,
  Printer,
  TrendingUp,
} from "lucide-react";
import { Select } from "@/components/ui/select";
import { Button, buttonVariants } from "@/components/ui/button";
import { DateRangePicker, type DateRange } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveFormModal } from "@/components/ui/responsive-form-modal";

export interface ReportSummaryRow {
  category: string;
  metric: string;
  value: string;
  detail: string;
}

export interface InstituteAnalyticsPayload {
  kpis: {
    totalStudents: number;
    activeStudents: number;
    totalCourses: number;
    activeBatches: number;
    feeCollectedPaise: number;
    pendingDuesPaise: number;
    attendancePresent: number;
    attendanceAbsent: number;
    attendanceLeave: number;
    totalCertificates: number;
    upcomingExams: number;
    walletBalancePaise: number;
  };
  receiptSeries: Array<{
    date: string;
    amountPaise: number;
  }>;
  admissionSeries: Array<{
    date: string;
  }>;
}

function formatInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ReportsClient({
  rows,
  analytics,
}: {
  rows: ReportSummaryRow[];
  analytics: InstituteAnalyticsPayload;
}) {
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [dateRange, setDateRange] = React.useState<DateRange>({
    from: null,
    to: null,
  });
  const [activeKpiModal, setActiveKpiModal] = React.useState<{
    title: string;
    category: string;
    href: string;
    hrefLabel: string;
    summary: string;
  } | null>(null);

  const categories = Array.from(new Set(rows.map((r) => r.category)));
  const filtered =
    categoryFilter === "all" ? rows : rows.filter((r) => r.category === categoryFilter);

  const rangeMetrics = React.useMemo(() => {
    const fromStr = dateRange.from ? dateRange.from.toISOString().slice(0, 10) : null;
    const toStr = dateRange.to ? dateRange.to.toISOString().slice(0, 10) : null;

    const inRange = (d: string) => {
      if (fromStr && d < fromStr) return false;
      if (toStr && d > toStr) return false;
      return true;
    };

    const filteredReceipts = analytics.receiptSeries.filter((r) => inRange(r.date));
    const filteredAdmissions = analytics.admissionSeries.filter((a) => inRange(a.date));

    const rangeCollectionPaise =
      fromStr || toStr
        ? filteredReceipts.reduce((s, r) => s + r.amountPaise, 0)
        : analytics.kpis.feeCollectedPaise;

    const rangeAdmissions =
      fromStr || toStr ? filteredAdmissions.length : analytics.kpis.totalStudents;

    // Build 14-day chart series (or up to 14 days ending at toDate / today)
    const endDate = dateRange.to ?? new Date();
    const dayMap = new Map<
      string,
      { label: string; amountPaise: number; admissions: number }
    >();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(endDate.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      dayMap.set(iso, {
        label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        amountPaise: 0,
        admissions: 0,
      });
    }

    for (const r of filteredReceipts) {
      const bucket = dayMap.get(r.date);
      if (bucket) bucket.amountPaise += r.amountPaise;
    }
    for (const a of filteredAdmissions) {
      const bucket = dayMap.get(a.date);
      if (bucket) bucket.admissions += 1;
    }

    const dailyPoints = Array.from(dayMap.entries()).map(([date, v]) => ({
      date,
      ...v,
    }));

    return {
      rangeCollectionPaise,
      rangeAdmissions,
      dailyPoints,
      maxDayCollection: Math.max(100, ...dailyPoints.map((p) => p.amountPaise)),
    };
  }, [analytics, dateRange]);

  const totalAttendance =
    analytics.kpis.attendancePresent +
    analytics.kpis.attendanceAbsent +
    analytics.kpis.attendanceLeave;
  const attendancePct =
    totalAttendance > 0
      ? Math.round((analytics.kpis.attendancePresent / totalAttendance) * 100)
      : 0;

  const totalFeePool = analytics.kpis.feeCollectedPaise + analytics.kpis.pendingDuesPaise;
  const collectionPct =
    totalFeePool > 0
      ? Math.round((analytics.kpis.feeCollectedPaise / totalFeePool) * 100)
      : 0;

  const exportCsv = () => {
    const header = ["Category", "Metric", "Value", "Detail"];
    const csvRows = filtered.map((r) => [r.category, r.metric, r.value, r.detail]);
    const csv = [header, ...csvRows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certidesk-institute-report-${categoryFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <div className="border-border bg-background flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div>
            <label className="text-muted mb-1.5 block text-xs font-medium">
              Date Range
            </label>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
          <div className="w-full sm:w-56">
            <Select
              label="Report Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { label: "All Categories", value: "all" },
                ...categories.map((cat) => ({ label: cat, value: cat })),
              ]}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}
            onClick={exportCsv}
          >
            Export CSV / Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Printer className="h-4 w-4" aria-hidden="true" />}
            onClick={() => window.print()}
          >
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards — Click any card for detailed popup */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card
          onClick={() =>
            setActiveKpiModal({
              title: "Students Overview",
              category: "Students",
              href: "/institute/students",
              hrefLabel: "Open Student Directory",
              summary: `${rangeMetrics.rangeAdmissions} students in selected range · ${analytics.kpis.activeStudents} active overall.`,
            })
          }
          className="hover:border-primary/60 cursor-pointer transition-all hover:shadow-sm"
        >
          <CardContent className="p-4">
            <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
              <GraduationCap className="text-primary h-3.5 w-3.5" aria-hidden="true" />
              Students
            </div>
            <p className="text-foreground mt-1 text-2xl font-bold">
              {rangeMetrics.rangeAdmissions}
            </p>
            <p className="text-muted text-[11px]">
              {analytics.kpis.activeStudents} active overall
            </p>
          </CardContent>
        </Card>

        <Card
          onClick={() =>
            setActiveKpiModal({
              title: "Courses & Batches",
              category: "Courses & Batches",
              href: "/institute/courses",
              hrefLabel: "Manage Courses",
              summary: `${analytics.kpis.totalCourses} courses · ${analytics.kpis.activeBatches} active batches.`,
            })
          }
          className="hover:border-primary/60 cursor-pointer transition-all hover:shadow-sm"
        >
          <CardContent className="p-4">
            <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
              <BookOpen className="text-primary h-3.5 w-3.5" aria-hidden="true" />
              Courses
            </div>
            <p className="text-foreground mt-1 text-2xl font-bold">
              {analytics.kpis.totalCourses}
            </p>
            <p className="text-muted text-[11px]">
              {analytics.kpis.activeBatches} active batches
            </p>
          </CardContent>
        </Card>

        <Card
          onClick={() =>
            setActiveKpiModal({
              title: "Fee Collection Details",
              category: "Fee Collection",
              href: "/institute/finance",
              hrefLabel: "Open Financial Dashboard",
              summary: `Collected ${formatInr(rangeMetrics.rangeCollectionPaise)} in selected period.`,
            })
          }
          className="hover:border-primary/60 cursor-pointer transition-all hover:shadow-sm"
        >
          <CardContent className="p-4">
            <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
              <IndianRupee className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              Fee Collected
            </div>
            <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatInr(rangeMetrics.rangeCollectionPaise)}
            </p>
            <p className="text-muted text-[11px]">
              {dateRange.from || dateRange.to ? "In selected range" : "Current period"}
            </p>
          </CardContent>
        </Card>

        <Card
          onClick={() =>
            setActiveKpiModal({
              title: "Pending Fee Dues",
              category: "Pending Fees",
              href: "/institute/fees/dues",
              hrefLabel: "View Fee Dues",
              summary: `Total pending student fee balance: ${formatInr(analytics.kpis.pendingDuesPaise)}.`,
            })
          }
          className="hover:border-primary/60 cursor-pointer transition-all hover:shadow-sm"
        >
          <CardContent className="p-4">
            <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
              <IndianRupee className="text-warning h-3.5 w-3.5" aria-hidden="true" />
              Pending Dues
            </div>
            <p className="text-warning mt-1 text-xl font-bold">
              {formatInr(analytics.kpis.pendingDuesPaise)}
            </p>
            <p className="text-muted text-[11px]">Student fee balance</p>
          </CardContent>
        </Card>

        <Card
          onClick={() =>
            setActiveKpiModal({
              title: "Attendance Breakdown",
              category: "Attendance",
              href: "/institute/attendance",
              hrefLabel: "Open Attendance",
              summary: `${attendancePct}% rate · Present: ${analytics.kpis.attendancePresent}, Absent: ${analytics.kpis.attendanceAbsent}, Leave: ${analytics.kpis.attendanceLeave}.`,
            })
          }
          className="hover:border-primary/60 cursor-pointer transition-all hover:shadow-sm"
        >
          <CardContent className="p-4">
            <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
              <CalendarCheck className="text-primary h-3.5 w-3.5" aria-hidden="true" />
              Attendance
            </div>
            <p className="text-foreground mt-1 text-2xl font-bold">{attendancePct}%</p>
            <p className="text-muted text-[11px]">
              {analytics.kpis.attendancePresent} present today
            </p>
          </CardContent>
        </Card>

        <Card
          onClick={() =>
            setActiveKpiModal({
              title: "Certificates & Exams",
              category: "Certificates",
              href: "/institute/certificates",
              hrefLabel: "Open Certificates",
              summary: `${analytics.kpis.totalCertificates} certificates issued · ${analytics.kpis.upcomingExams} upcoming exams.`,
            })
          }
          className="hover:border-primary/60 cursor-pointer transition-all hover:shadow-sm"
        >
          <CardContent className="p-4">
            <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
              <Award className="text-primary h-3.5 w-3.5" aria-hidden="true" />
              Certificates
            </div>
            <p className="text-foreground mt-1 text-2xl font-bold">
              {analytics.kpis.totalCertificates}
            </p>
            <p className="text-muted text-[11px]">
              {analytics.kpis.upcomingExams} upcoming exams
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="text-primary h-4 w-4" aria-hidden="true" />
              14-Day Fee Collection Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-2 flex h-48 items-end gap-1.5 sm:gap-2">
              {rangeMetrics.dailyPoints.map((point) => {
                const heightPct = Math.max(
                  point.amountPaise > 0 ? 12 : 4,
                  Math.round((point.amountPaise / rangeMetrics.maxDayCollection) * 100)
                );
                return (
                  <div
                    key={point.date}
                    className="group flex flex-1 flex-col items-center gap-1.5"
                    title={`${point.label}: ${formatInr(point.amountPaise)} (${point.admissions} admissions)`}
                  >
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="text-primary h-4 w-4" aria-hidden="true" />
              Financial &amp; Attendance Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground font-semibold">
                  Fee Collection Recovery Ratio
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {collectionPct}%
                </span>
              </div>
              <div className="bg-surface h-3 w-full overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.max(collectionPct, 2)}%` }}
                />
              </div>
              <p className="text-muted text-[11px]">
                Collected {formatInr(analytics.kpis.feeCollectedPaise)} vs Pending{" "}
                {formatInr(analytics.kpis.pendingDuesPaise)}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground font-semibold">
                  Today&apos;s Attendance Rate
                </span>
                <span className="text-primary font-bold">{attendancePct}%</span>
              </div>
              <div className="bg-surface h-3 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${Math.max(attendancePct, 2)}%` }}
                />
              </div>
              <p className="text-muted text-[11px]">
                Present: {analytics.kpis.attendancePresent} · Absent:{" "}
                {analytics.kpis.attendanceAbsent} · Leave:{" "}
                {analytics.kpis.attendanceLeave}
              </p>
            </div>

            <div className="border-border bg-surface flex items-center justify-between rounded-xl border p-3 text-xs">
              <span className="text-muted font-medium">Available Platform Wallet</span>
              <span className="text-foreground text-sm font-bold">
                {formatInr(analytics.kpis.walletBalancePaise)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Institutional Analytics Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Institutional Analytics Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-border text-muted border-b text-xs uppercase">
                <tr>
                  <th className="py-3 pr-4">Category</th>
                  <th className="py-3 pr-4">Metric</th>
                  <th className="py-3 pr-4">Value</th>
                  <th className="py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {filtered.map((row) => (
                  <tr key={`${row.category}-${row.metric}`}>
                    <td className="text-primary py-3 pr-4 font-medium">{row.category}</td>
                    <td className="text-foreground py-3 pr-4">{row.metric}</td>
                    <td className="text-foreground py-3 pr-4 font-semibold">
                      {row.value}
                    </td>
                    <td className="text-muted py-3 text-xs">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ResponsiveFormModal
        open={Boolean(activeKpiModal)}
        onClose={() => setActiveKpiModal(null)}
        title={activeKpiModal?.title ?? "Report Details"}
        subtitle={activeKpiModal?.summary ?? ""}
      >
        {activeKpiModal && (
          <div className="space-y-4">
            <div className="border-border overflow-x-auto rounded-xl border">
              <table className="w-full text-left text-xs">
                <thead className="border-border bg-surface text-muted border-b">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Metric</th>
                    <th className="px-3 py-2 font-semibold">Value</th>
                    <th className="px-3 py-2 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {rows
                    .filter((r) => r.category === activeKpiModal.category)
                    .map((r) => (
                      <tr key={r.metric}>
                        <td className="px-3 py-2 font-medium">{r.metric}</td>
                        <td className="text-primary px-3 py-2 font-bold">{r.value}</td>
                        <td className="text-muted px-3 py-2">{r.detail}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveKpiModal(null)}
              >
                Close
              </Button>
              <Link
                href={activeKpiModal.href}
                className={buttonVariants({ variant: "primary", size: "sm" })}
              >
                {activeKpiModal.hrefLabel}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        )}
      </ResponsiveFormModal>
    </div>
  );
}
