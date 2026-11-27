export type StudentNavIcon =
  | "layoutDashboard"
  | "user"
  | "bookOpen"
  | "calendarCheck"
  | "fileSpreadsheet"
  | "checkSquare"
  | "clipboardCheck"
  | "award"
  | "indianRupee"
  | "receipt"
  | "bell"
  | "settings"
  | "helpCircle";

export interface StudentNavItem {
  label: string;
  href: string;
  icon: StudentNavIcon;
}

export interface StudentNavGroup {
  title: string;
  items: StudentNavItem[];
}

export const studentNavGroups: StudentNavGroup[] = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", href: "/student/dashboard", icon: "layoutDashboard" },
      { label: "My Profile", href: "/student/profile", icon: "user" },
    ],
  },
  {
    title: "ACADEMICS",
    items: [
      { label: "Course & Batch", href: "/student/course", icon: "bookOpen" },
      { label: "Attendance", href: "/student/attendance", icon: "calendarCheck" },
      { label: "Examinations", href: "/student/examinations", icon: "fileSpreadsheet" },
      { label: "Online Exams", href: "/student/exams", icon: "clipboardCheck" },
      { label: "Results", href: "/student/results", icon: "checkSquare" },
      { label: "Marksheets", href: "/student/marksheets", icon: "clipboardCheck" },
      { label: "Certificates", href: "/student/certificates", icon: "award" },
    ],
  },
  {
    title: "FINANCE & ALERTS",
    items: [
      { label: "Fee Summary", href: "/student/fees", icon: "indianRupee" },
      { label: "Fee Transactions", href: "/student/fees/transactions", icon: "receipt" },
      { label: "Fee Receipts", href: "/student/fees/receipts", icon: "receipt" },
      { label: "Payment Receipts", href: "/student/payments", icon: "receipt" },
      { label: "Notifications", href: "/student/notifications", icon: "bell" },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { label: "Settings", href: "/student/settings", icon: "settings" },
      { label: "Support", href: "/student/support", icon: "helpCircle" },
    ],
  },
];

export const studentRouteTitles: Record<string, string> = {
  "/student/dashboard": "Student Dashboard",
  "/student/profile": "My Profile",
  "/student/course": "Course & Batch",
  "/student/attendance": "Attendance",
  "/student/examinations": "Examinations",
  "/student/results": "Published Results",
  "/student/marksheets": "Marksheets",
  "/student/certificates": "Certificates",
  "/student/fees": "Fee Summary",
  "/student/fees/transactions": "Fee Transactions",
  "/student/fees/receipts": "Fee Receipts",
  "/student/payments": "Payment Receipts",
  "/student/notifications": "Notifications",
  "/student/settings": "Account Settings",
  "/student/support": "Institute Support",
};
