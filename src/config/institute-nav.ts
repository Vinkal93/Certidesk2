import type { StaffPermission } from "@/types/auth";

export type InstituteNavIcon =
  | "layoutDashboard"
  | "users"
  | "bookOpen"
  | "layers"
  | "userCog"
  | "calendarCheck"
  | "fileSpreadsheet"
  | "clipboardCheck"
  | "award"
  | "indianRupee"
  | "wallet"
  | "barChart3"
  | "messageSquare"
  | "settings";

export interface InstituteNavItem {
  label: string;
  href: string;
  icon: InstituteNavIcon;
  requiredPermission?: StaffPermission;
}

export interface InstituteNavGroup {
  title: string;
  items: InstituteNavItem[];
}

export const instituteNavGroups: InstituteNavGroup[] = [
  {
    title: "MAIN",
    items: [
      {
        label: "Dashboard",
        href: "/institute/dashboard",
        icon: "layoutDashboard",
      },
    ],
  },
  {
    title: "ACADEMIC MANAGEMENT",
    items: [
      {
        label: "Students",
        href: "/institute/students",
        icon: "users",
        requiredPermission: "students:read",
      },
      {
        label: "Courses",
        href: "/institute/courses",
        icon: "bookOpen",
        requiredPermission: "courses:read",
      },
      {
        label: "Batches",
        href: "/institute/batches",
        icon: "layers",
        requiredPermission: "batches:read",
      },
      {
        label: "Staff & Teachers",
        href: "/institute/staff",
        icon: "userCog",
        requiredPermission: "staff:read",
      },
      {
        label: "Attendance",
        href: "/institute/attendance",
        icon: "calendarCheck",
        requiredPermission: "attendance:read",
      },
      {
        label: "Examinations",
        href: "/institute/examinations",
        icon: "fileSpreadsheet",
        requiredPermission: "exams:read",
      },
      {
        label: "Marksheets",
        href: "/institute/marksheets",
        icon: "clipboardCheck",
        requiredPermission: "exams:read",
      },
      {
        label: "Certificates",
        href: "/institute/certificates",
        icon: "award",
        requiredPermission: "certificates:read",
      },
    ],
  },
  {
    title: "FINANCE",
    items: [
      {
        label: "Fee Management",
        href: "/institute/fees",
        icon: "indianRupee",
        requiredPermission: "fees:read",
      },
      {
        label: "Wallet & Transactions",
        href: "/institute/wallet",
        icon: "wallet",
        requiredPermission: "wallet:read",
      },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      {
        label: "Reports & Analytics",
        href: "/institute/reports",
        icon: "barChart3",
        requiredPermission: "reports:read",
      },
      {
        label: "Communication",
        href: "/institute/communication",
        icon: "messageSquare",
        requiredPermission: "communication:send",
      },
      {
        label: "Institute Settings",
        href: "/institute/settings",
        icon: "settings",
        requiredPermission: "settings:write",
      },
    ],
  },
];

export const instituteRouteTitles: Record<string, string> = {
  "/institute/dashboard": "Dashboard",
  "/institute/students": "Students",
  "/institute/students/new": "Admit Student",
  "/institute/courses": "Courses & Subjects",
  "/institute/batches": "Batches",
  "/institute/staff": "Staff & Teachers",
  "/institute/attendance": "Attendance",
  "/institute/examinations": "Examinations",
  "/institute/marksheets": "Marksheets",
  "/institute/certificates": "Certificates",
  "/institute/fees": "Fee Management",
  "/institute/wallet": "Wallet & Transactions",
  "/institute/reports": "Reports & Analytics",
  "/institute/communication": "Communication",
  "/institute/settings": "Institute Settings",
  "/institute/profile": "Institute Profile",
};
