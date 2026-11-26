export type SuNavIcon =
  | "layoutDashboard"
  | "barChart3"
  | "building2"
  | "userCheck"
  | "users"
  | "userCog"
  | "layers"
  | "repeat"
  | "sliders"
  | "tag"
  | "receipt"
  | "creditCard"
  | "wallet"
  | "arrowLeftRight"
  | "rotateCcw"
  | "trendingUp"
  | "gauge"
  | "cpu"
  | "bell"
  | "flag"
  | "box"
  | "megaphone"
  | "settings"
  | "shield"
  | "logIn"
  | "keyRound"
  | "lock"
  | "fileText"
  | "alertTriangle"
  | "siren"
  | "wrench"
  | "shieldAlert"
  | "ban"
  | "lifeBuoy"
  | "activity"
  | "database"
  | "server"
  | "hardDrive"
  | "clock"
  | "plug"
  | "webhook"
  | "mail"
  | "messageSquare"
  | "fileBarChart";

export interface SuNavItem {
  label: string;
  href: string;
  icon: SuNavIcon;
}

export interface SuNavGroup {
  title: string;
  items: SuNavItem[];
}

export const suNavGroups: SuNavGroup[] = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", href: "/su/dashboard", icon: "layoutDashboard" },
      { label: "Platform Analytics", href: "/su/analytics", icon: "barChart3" },
    ],
  },
  {
    title: "BUSINESS MANAGEMENT",
    items: [
      { label: "Institutes", href: "/su/institutes", icon: "building2" },
      { label: "Institute Owners", href: "/su/owners", icon: "userCheck" },
      { label: "Students", href: "/su/students", icon: "users" },
      { label: "Staff", href: "/su/staff", icon: "userCog" },
    ],
  },
  {
    title: "PLANS & BILLING",
    items: [
      { label: "Plan Management", href: "/su/plans", icon: "layers" },
      { label: "Subscriptions", href: "/su/subscriptions", icon: "repeat" },
      { label: "Feature Entitlements", href: "/su/entitlements", icon: "sliders" },
      { label: "Pricing & Charges", href: "/su/pricing", icon: "tag" },
      { label: "Invoices", href: "/su/invoices", icon: "receipt" },
    ],
  },
  {
    title: "FINANCE",
    items: [
      { label: "Payments", href: "/su/payments", icon: "creditCard" },
      { label: "Wallet Management", href: "/su/wallets", icon: "wallet" },
      { label: "Platform Transactions", href: "/su/transactions", icon: "arrowLeftRight" },
      { label: "Refund Management", href: "/su/refunds", icon: "rotateCcw" },
      { label: "Revenue Reports", href: "/su/reports/financial", icon: "trendingUp" },
    ],
  },
  {
    title: "USAGE CONTROL",
    items: [
      { label: "Usage Overview", href: "/su/usage", icon: "gauge" },
      { label: "Institute Usage", href: "/su/usage/institutes", icon: "building2" },
      { label: "Resource Consumption", href: "/su/usage/resources", icon: "cpu" },
      { label: "Quota Management", href: "/su/usage/quotas", icon: "sliders" },
      { label: "Usage Alerts", href: "/su/usage/alerts", icon: "bell" },
    ],
  },
  {
    title: "PRODUCT CONTROL",
    items: [
      { label: "Feature Flags", href: "/su/feature-flags", icon: "flag" },
      { label: "Module Management", href: "/su/modules", icon: "box" },
      { label: "Announcements", href: "/su/announcements", icon: "megaphone" },
      { label: "Global Configuration", href: "/su/settings", icon: "settings" },
    ],
  },
  {
    title: "SECURITY CENTER",
    items: [
      { label: "Security Dashboard", href: "/su/security", icon: "shield" },
      { label: "Login Activity", href: "/su/security/logins", icon: "logIn" },
      { label: "Session Management", href: "/su/security/sessions", icon: "lock" },
      { label: "Access Control", href: "/su/settings/security", icon: "keyRound" },
      { label: "Audit Logs", href: "/su/audit-logs", icon: "fileText" },
      { label: "Security Alerts", href: "/su/security/alerts", icon: "alertTriangle" },
    ],
  },
  {
    title: "EMERGENCY OPERATIONS",
    items: [
      { label: "Emergency Dashboard", href: "/su/emergency", icon: "siren" },
      { label: "Maintenance Mode", href: "/su/emergency/maintenance", icon: "wrench" },
      { label: "Platform Lockdown", href: "/su/emergency/lockdown", icon: "shieldAlert" },
      { label: "Service Restrictions", href: "/su/emergency/restrictions", icon: "ban" },
      { label: "Incident Management", href: "/su/emergency/incidents", icon: "alertTriangle" },
      { label: "Recovery Operations", href: "/su/emergency/recovery", icon: "lifeBuoy" },
    ],
  },
  {
    title: "INFRASTRUCTURE",
    items: [
      { label: "System Health", href: "/su/system-health", icon: "activity" },
      { label: "Firebase Monitoring", href: "/su/infrastructure/firebase", icon: "database" },
      { label: "API Monitoring", href: "/su/infrastructure/api", icon: "server" },
      { label: "Storage Monitoring", href: "/su/infrastructure/storage", icon: "hardDrive" },
      { label: "Background Jobs", href: "/su/infrastructure/jobs", icon: "clock" },
      { label: "Integration Health", href: "/su/infrastructure/integrations", icon: "plug" },
    ],
  },
  {
    title: "INTEGRATIONS",
    items: [
      { label: "Razorpay", href: "/su/settings/payment-gateway/razorpay", icon: "creditCard" },
      { label: "Webhooks", href: "/su/integrations/webhooks", icon: "webhook" },
      { label: "Email Provider", href: "/su/integrations/email", icon: "mail" },
      { label: "WhatsApp/SMS Provider", href: "/su/integrations/messaging", icon: "messageSquare" },
    ],
  },
  {
    title: "REPORTS",
    items: [
      { label: "Business Reports", href: "/su/reports/business", icon: "fileBarChart" },
      { label: "Financial Reports", href: "/su/reports/financial", icon: "trendingUp" },
      { label: "Usage Reports", href: "/su/reports/usage", icon: "gauge" },
      { label: "Security Reports", href: "/su/reports/security", icon: "shield" },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      { label: "General Settings", href: "/su/settings", icon: "settings" },
      { label: "Security Policies", href: "/su/settings/security", icon: "shield" },
      { label: "Notifications", href: "/su/settings/notifications", icon: "bell" },
      { label: "Data Retention", href: "/su/settings/retention", icon: "database" },
    ],
  },
];

export const suRouteTitles: Record<string, string> = {
  "/su/dashboard": "Platform Dashboard",
  "/su/analytics": "Platform Analytics",
  "/su/institutes": "Institutes",
  "/su/institutes/new": "Register Institute",
  "/su/owners": "Institute Owners",
  "/su/students": "Global Student Directory",
  "/su/staff": "Global Staff Directory",
  "/su/plans": "Plan Management",
  "/su/subscriptions": "Subscriptions",
  "/su/entitlements": "Feature Entitlements",
  "/su/pricing": "Pricing & Charges",
  "/su/invoices": "Invoices & Receipts",
  "/su/payments": "Payments",
  "/su/wallets": "Wallet Management",
  "/su/transactions": "Platform Transactions",
  "/su/refunds": "Refund Management",
  "/su/usage": "Usage Overview",
  "/su/usage/institutes": "Institute Usage",
  "/su/usage/resources": "Resource Consumption",
  "/su/usage/quotas": "Quota Management",
  "/su/usage/alerts": "Usage Alerts",
  "/su/feature-flags": "Feature Flags",
  "/su/modules": "Module Management",
  "/su/announcements": "Announcements",
  "/su/security": "Security Dashboard",
  "/su/security/logins": "Login Activity",
  "/su/security/sessions": "Session Management",
  "/su/security/alerts": "Security Alerts",
  "/su/emergency": "Emergency Operations Center",
  "/su/emergency/maintenance": "Maintenance Mode",
  "/su/emergency/lockdown": "Platform Lockdown",
  "/su/emergency/restrictions": "Service Restrictions",
  "/su/emergency/incidents": "Incident Management",
  "/su/emergency/recovery": "Recovery Operations",
  "/su/system-health": "System Health",
  "/su/infrastructure/firebase": "Firebase Monitoring",
  "/su/infrastructure/api": "API Monitoring",
  "/su/infrastructure/storage": "Storage Monitoring",
  "/su/infrastructure/jobs": "Background Jobs",
  "/su/infrastructure/integrations": "Integration Health",
  "/su/integrations/webhooks": "Webhook Logs",
  "/su/integrations/email": "Email Provider",
  "/su/integrations/messaging": "WhatsApp / SMS Provider",
  "/su/reports/business": "Business Reports",
  "/su/reports/financial": "Financial Reports",
  "/su/reports/usage": "Usage Reports",
  "/su/reports/security": "Security Reports",
  "/su/settings": "Platform Settings",
  "/su/settings/security": "Security Policies",
  "/su/settings/payment-gateway": "Payment Gateway",
  "/su/settings/payment-gateway/razorpay": "Razorpay Control Center",
  "/su/settings/notifications": "Notification Rules",
  "/su/settings/retention": "Data Retention Policies",
  "/su/audit-logs": "Audit Logs",
};
