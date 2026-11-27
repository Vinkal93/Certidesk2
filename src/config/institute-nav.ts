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
        label: "Online Exams",
        href: "/institute/exams",
        icon: "clipboardCheck",
        requiredPermission: "exams:read",
      },
      {
        label: "Question Bank",
        href: "/institute/question-bank",
        icon: "bookOpen",
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
        label: "Financial Dashboard",
        href: "/institute/finance",
        icon: "barChart3",
        requiredPermission: "fees:read",
      },
      {
        label: "Fee Management",
        href: "/institute/fees",
        icon: "indianRupee",
        requiredPermission: "fees:read",
      },
      {
        label: "Collect Fee",
        href: "/institute/fees/collect",
        icon: "indianRupee",
        requiredPermission: "fees:write",
      },
      {
        label: "Student Fee Ledger",
        href: "/institute/fees/students",
        icon: "users",
        requiredPermission: "fees:read",
      },
      {
        label: "Fee Dues",
        href: "/institute/fees/dues",
        icon: "clipboardCheck",
        requiredPermission: "fees:read",
      },
      {
        label: "Fee Receipts",
        href: "/institute/fees/receipts",
        icon: "fileSpreadsheet",
        requiredPermission: "fees:read",
      },
      {
        label: "Fee Transactions",
        href: "/institute/fees/transactions",
        icon: "layers",
        requiredPermission: "fees:read",
      },
      {
        label: "Fee Structure",
        href: "/institute/fees/structure",
        icon: "bookOpen",
        requiredPermission: "fees:read",
      },
      {
        label: "Refunds",
        href: "/institute/fees/refunds",
        icon: "indianRupee",
        requiredPermission: "fees:write",
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
    title: "ACCOUNTS",
    items: [
      {
        label: "Income",
        href: "/institute/accounts/income",
        icon: "indianRupee",
        requiredPermission: "fees:read",
      },
      {
        label: "Expenses",
        href: "/institute/accounts/expenses",
        icon: "indianRupee",
        requiredPermission: "fees:read",
      },
      {
        label: "Categories",
        href: "/institute/accounts/categories",
        icon: "layers",
        requiredPermission: "fees:read",
      },
      {
        label: "Accounts & Cash/Bank",
        href: "/institute/accounts/ledgers",
        icon: "wallet",
        requiredPermission: "fees:read",
      },
      {
        label: "Profit & Loss",
        href: "/institute/accounts/profit-loss",
        icon: "barChart3",
        requiredPermission: "fees:read",
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
        label: "Manage Logins",
        href: "/institute/logins",
        icon: "userCog",
        requiredPermission: "students:write",
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
  "/institute/logins": "Manage Logins & Passwords",
  "/institute/attendance": "Attendance",
  "/institute/examinations": "Examinations",
  "/institute/marksheets": "Marksheets",
  "/institute/certificates": "Certificates",
  "/institute/finance": "Financial Dashboard",
  "/institute/fees": "Fee Management",
  "/institute/fees/collect": "Collect Fee",
  "/institute/fees/students": "Student Fee Ledger",
  "/institute/fees/dues": "Fee Dues",
  "/institute/fees/receipts": "Fee Receipts",
  "/institute/fees/transactions": "Fee Transactions",
  "/institute/fees/structure": "Fee Structure",
  "/institute/fees/refunds": "Fee Refunds",
  "/institute/accounts/income": "Non-Fee Income",
  "/institute/accounts/expenses": "Institute Expenses",
  "/institute/accounts/categories": "Account Categories",
  "/institute/accounts/ledgers": "Cash & Bank Accounts",
  "/institute/accounts/profit-loss": "Operational Profit & Loss",
  "/institute/wallet": "Wallet & Transactions",
  "/institute/reports": "Reports & Analytics",
  "/institute/communication": "Communication",
  "/institute/settings": "Institute Settings",
  "/institute/profile": "Institute Profile",
};
