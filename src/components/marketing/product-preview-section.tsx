"use client";

import * as React from "react";
import { Award, FileSpreadsheet, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";
import { SectionHeader } from "@/components/layout/section-header";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";

type PreviewTabId = "students" | "fees" | "marksheets" | "certificates";

interface PreviewTab {
  id: PreviewTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  heading: string;
  subheading: string;
  columns: string[];
  rows: {
    cells: string[];
    badge: { label: string; variant: "success" | "warning" | "primary" | "default" };
  }[];
}

const previewTabs: PreviewTab[] = [
  {
    id: "students",
    label: "Student Directory",
    icon: Users,
    heading: "Enrolled Students — Web & Data Programs",
    subheading: "Unified profiles linking batch, attendance, and fee status",
    columns: ["Enrollment ID", "Student Name", "Assigned Batch", "Attendance", "Status"],
    rows: [
      {
        cells: ["CD-2026-101", "Ananya Iyer", "Full Stack — Batch A", "96%"],
        badge: { label: "Active", variant: "success" },
      },
      {
        cells: ["CD-2026-102", "Kabir Verma", "Data Analytics — Batch B", "91%"],
        badge: { label: "Active", variant: "success" },
      },
      {
        cells: ["CD-2026-103", "Meera Joshi", "UI/UX Design — Batch C", "84%"],
        badge: { label: "Review", variant: "warning" },
      },
      {
        cells: ["CD-2026-104", "Devansh Patel", "Python Core — Batch A", "98%"],
        badge: { label: "Active", variant: "success" },
      },
    ],
  },
  {
    id: "fees",
    label: "Fee & Dues Ledger",
    icon: Wallet,
    heading: "Installment & Pending Dues Tracker",
    subheading: "Structured tuition collection with receipt references",
    columns: ["Receipt / Plan", "Student", "Total Fee", "Paid / Balance", "Status"],
    rows: [
      {
        cells: ["REC-4021", "Ananya Iyer", "$480", "$480 / $0"],
        badge: { label: "Paid", variant: "success" },
      },
      {
        cells: ["REC-4022", "Kabir Verma", "$520", "$350 / $170"],
        badge: { label: "Partial", variant: "primary" },
      },
      {
        cells: ["PLAN-4023", "Meera Joshi", "$450", "$225 / $225"],
        badge: { label: "Due Soon", variant: "warning" },
      },
      {
        cells: ["REC-4024", "Devansh Patel", "$480", "$480 / $0"],
        badge: { label: "Paid", variant: "success" },
      },
    ],
  },
  {
    id: "marksheets",
    label: "Exam Marksheets",
    icon: FileSpreadsheet,
    heading: "Subject-Wise Evaluation Summary",
    subheading: "Theory and practical marks aggregated into term transcripts",
    columns: ["Subject Code", "Subject Name", "Theory", "Practical", "Grade"],
    rows: [
      {
        cells: ["CS-101", "Programming Foundations", "76 / 80", "19 / 20"],
        badge: { label: "95% • A+", variant: "success" },
      },
      {
        cells: ["CS-102", "Relational Databases", "71 / 80", "18 / 20"],
        badge: { label: "89% • A", variant: "success" },
      },
      {
        cells: ["CS-103", "Web Architecture", "66 / 80", "17 / 20"],
        badge: { label: "83% • A", variant: "primary" },
      },
      {
        cells: ["CS-104", "Applied Capstone", "74 / 80", "19 / 20"],
        badge: { label: "93% • A+", variant: "success" },
      },
    ],
  },
  {
    id: "certificates",
    label: "Certificate Registry",
    icon: Award,
    heading: "Issued Completion & Merit Certificates",
    subheading: "Serialized credentials tied to verified academic completion",
    columns: ["Certificate ID", "Recipient", "Program", "Issue Date", "Verification"],
    rows: [
      {
        cells: ["CERT-2026-0891", "Ananya Iyer", "Diploma in Python", "Mar 18, 2026"],
        badge: { label: "Verified", variant: "success" },
      },
      {
        cells: ["CERT-2026-0892", "Kabir Verma", "Data Analytics", "Mar 19, 2026"],
        badge: { label: "Verified", variant: "success" },
      },
      {
        cells: ["CERT-2026-0893", "Meera Joshi", "UI/UX Foundations", "Pending"],
        badge: { label: "In Review", variant: "warning" },
      },
      {
        cells: ["CERT-2026-0894", "Devansh Patel", "Full Stack Web", "Mar 22, 2026"],
        badge: { label: "Verified", variant: "success" },
      },
    ],
  },
];

export function ProductPreviewSection() {
  const [activeTab, setActiveTab] = React.useState<PreviewTabId>("students");
  const current = previewTabs.find((tab) => tab.id === activeTab) ?? previewTabs[0]!;

  return (
    <Section id="preview" spacing="md" background="surface">
      <Container>
        <SectionHeader
          eyebrow="Product Interface Preview"
          title="Designed for clarity across every campus role"
          description="Explore how CertiDesk organizes student rosters, installment ledgers, subject-wise marksheets, and serialized certificates in one clean interface."
        />

        <div className="border-border bg-background mt-10 rounded-2xl border shadow-lg">
          <div
            role="tablist"
            aria-label="Product interface modules"
            className="border-border bg-surface/70 flex flex-wrap gap-2 border-b p-3 sm:px-6"
          >
            {previewTabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  aria-selected={isSelected}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors sm:text-sm",
                    isSelected
                      ? "bg-navy text-white shadow-xs"
                      : "text-muted hover:bg-background hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div role="tabpanel" className="p-5 sm:p-8">
            <div className="border-border flex flex-col justify-between gap-3 border-b pb-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-foreground text-lg font-semibold">
                  {current.heading}
                </h3>
                <p className="text-muted text-sm">{current.subheading}</p>
              </div>
              <Badge variant="primary">Illustrative Workspace Data</Badge>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-border text-muted border-b text-xs font-semibold tracking-wider uppercase">
                    {current.columns.map((col) => (
                      <th key={col} className="py-3 pr-4">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-border/70 divide-y">
                  {current.rows.map((row) => (
                    <tr key={row.cells[0]} className="hover:bg-surface/60">
                      {row.cells.map((cell, index) => (
                        <td
                          key={`${row.cells[0]}-${index}`}
                          className={cn(
                            "py-3.5 pr-4",
                            index === 0
                              ? "text-foreground font-mono text-xs font-medium"
                              : "text-foreground"
                          )}
                        >
                          {cell}
                        </td>
                      ))}
                      <td className="py-3.5">
                        <Badge variant={row.badge.variant}>{row.badge.label}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
