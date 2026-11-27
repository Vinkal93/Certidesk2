import "server-only";
import type { CollectionReference, DocumentData } from "firebase-admin/firestore";
import { getAdminFirestore } from "./admin";
import type {
  AdmissionOperationRecord,
  AuditLogRecord,
  InstituteRecord,
  LoginIdentifierMapping,
  RechargePlanRecord,
  StudentRecord,
  UserProfileRecord,
  WalletBonusGrantRecord,
  WalletTransactionRecord,
} from "@/types/domain";
import type {
  GatewayConfigHistoryRecord,
  PaymentOrderRecord,
  RazorpayGatewayConfig,
  WebhookEventRecord,
} from "@/types/payment";
import type {
  SecurityAlertRecord,
  SecurityAlertRuleRecord,
  SecurityLoginEventRecord,
  SecurityPolicyConfig,
  SecuritySessionRecord,
  UserPermissionOverrideRecord,
} from "@/types/security";
import type {
  BillingCreditNoteRecord,
  BillingInvoiceRecord,
  BillingPricingRuleRecord,
  PlanVersionRecord,
} from "@/types/billing";
import type {
  FeeReceiptRecord,
  FeeRefundRecord,
  FeeStructureRecord,
  InstituteAccountRecord,
  InstituteCategoryRecord,
  InstituteLedgerEntryRecord,
} from "@/types/finance";
import type {
  ReportDefinitionRecord,
  ReportExportRecord,
  ReportScheduleRecord,
} from "@/types/reports";

export const COLLECTIONS = {
  INSTITUTES: "institutes",
  USERS: "users",
  STUDENTS: "students",
  LOGIN_MAPPINGS: "login_mappings",
  WALLET_TRANSACTIONS: "wallet_transactions",
  WALLET_BONUS_GRANTS: "wallet_bonus_grants",
  RECHARGE_PLANS: "recharge_plans",
  ADMISSION_OPERATIONS: "admission_operations",
  AUDIT_LOGS: "audit_logs",
  PAYMENT_ORDERS: "payment_orders",
  PAYMENT_GATEWAY_CONFIG: "paymentGatewayConfig",
  GATEWAY_CONFIG_HISTORY: "gateway_config_history",
  WEBHOOK_EVENTS: "webhook_events",
  SECURITY_LOGIN_EVENTS: "securityLoginEvents",
  SECURITY_SESSIONS: "securitySessions",
  SECURITY_ALERTS: "securityAlerts",
  SECURITY_ALERT_RULES: "securityAlertRules",
  SECURITY_POLICIES: "securityPolicies",
  USER_PERMISSION_OVERRIDES: "userPermissionOverrides",
  PLAN_VERSIONS: "planVersions",
  PRICING_RULES: "pricingRules",
  BILLING_INVOICES: "billingInvoices",
  CREDIT_NOTES: "creditNotes",
  REPORT_DEFINITIONS: "reportDefinitions",
  REPORT_SCHEDULES: "reportSchedules",
  REPORT_EXPORTS: "reportExports",
  FEE_STRUCTURES: "feeStructures",
  FEE_RECEIPTS: "feeReceipts",
  FEE_REFUNDS: "feeRefunds",
  INSTITUTE_CATEGORIES: "instituteCategories",
  INSTITUTE_ACCOUNTS: "instituteAccounts",
  INSTITUTE_LEDGER_ENTRIES: "instituteLedgerEntries",
} as const;

function typedCollection<T extends DocumentData>(name: string): CollectionReference<T> {
  return getAdminFirestore().collection(name) as CollectionReference<T>;
}

export function institutesCollection() {
  return typedCollection<InstituteRecord>(COLLECTIONS.INSTITUTES);
}

export function usersCollection() {
  return typedCollection<UserProfileRecord>(COLLECTIONS.USERS);
}

export function studentsCollection() {
  return typedCollection<StudentRecord>(COLLECTIONS.STUDENTS);
}

export function loginMappingsCollection() {
  return typedCollection<LoginIdentifierMapping>(COLLECTIONS.LOGIN_MAPPINGS);
}

export function walletTransactionsCollection() {
  return typedCollection<WalletTransactionRecord>(COLLECTIONS.WALLET_TRANSACTIONS);
}

export function auditLogsCollection() {
  return typedCollection<AuditLogRecord>(COLLECTIONS.AUDIT_LOGS);
}

export function paymentGatewayConfigCollection() {
  return typedCollection<RazorpayGatewayConfig>(COLLECTIONS.PAYMENT_GATEWAY_CONFIG);
}

export function gatewayConfigHistoryCollection() {
  return typedCollection<GatewayConfigHistoryRecord>(COLLECTIONS.GATEWAY_CONFIG_HISTORY);
}

export function webhookEventsCollection() {
  return typedCollection<WebhookEventRecord>(COLLECTIONS.WEBHOOK_EVENTS);
}

export function paymentOrdersCollection() {
  return typedCollection<PaymentOrderRecord>(COLLECTIONS.PAYMENT_ORDERS);
}

export function rechargePlansCollection() {
  return typedCollection<RechargePlanRecord>(COLLECTIONS.RECHARGE_PLANS);
}

export function walletBonusGrantsCollection() {
  return typedCollection<WalletBonusGrantRecord>(COLLECTIONS.WALLET_BONUS_GRANTS);
}

export function admissionOperationsCollection() {
  return typedCollection<AdmissionOperationRecord>(COLLECTIONS.ADMISSION_OPERATIONS);
}

export function securityLoginEventsCollection() {
  return typedCollection<SecurityLoginEventRecord>(COLLECTIONS.SECURITY_LOGIN_EVENTS);
}

export function securitySessionsCollection() {
  return typedCollection<SecuritySessionRecord>(COLLECTIONS.SECURITY_SESSIONS);
}

export function securityAlertsCollection() {
  return typedCollection<SecurityAlertRecord>(COLLECTIONS.SECURITY_ALERTS);
}

export function securityAlertRulesCollection() {
  return typedCollection<SecurityAlertRuleRecord>(COLLECTIONS.SECURITY_ALERT_RULES);
}

export function securityPoliciesCollection() {
  return typedCollection<SecurityPolicyConfig>(COLLECTIONS.SECURITY_POLICIES);
}

export function userPermissionOverridesCollection() {
  return typedCollection<UserPermissionOverrideRecord>(
    COLLECTIONS.USER_PERMISSION_OVERRIDES
  );
}

export function planVersionsCollection() {
  return typedCollection<PlanVersionRecord>(COLLECTIONS.PLAN_VERSIONS);
}

export function pricingRulesCollection() {
  return typedCollection<BillingPricingRuleRecord>(COLLECTIONS.PRICING_RULES);
}

export function billingInvoicesCollection() {
  return typedCollection<BillingInvoiceRecord>(COLLECTIONS.BILLING_INVOICES);
}

export function creditNotesCollection() {
  return typedCollection<BillingCreditNoteRecord>(COLLECTIONS.CREDIT_NOTES);
}

export function reportDefinitionsCollection() {
  return typedCollection<ReportDefinitionRecord>(COLLECTIONS.REPORT_DEFINITIONS);
}

export function reportSchedulesCollection() {
  return typedCollection<ReportScheduleRecord>(COLLECTIONS.REPORT_SCHEDULES);
}

export function reportExportsCollection() {
  return typedCollection<ReportExportRecord>(COLLECTIONS.REPORT_EXPORTS);
}

export function feeStructuresCollection() {
  return typedCollection<FeeStructureRecord>(COLLECTIONS.FEE_STRUCTURES);
}

export function feeReceiptsCollection() {
  return typedCollection<FeeReceiptRecord>(COLLECTIONS.FEE_RECEIPTS);
}

export function feeRefundsCollection() {
  return typedCollection<FeeRefundRecord>(COLLECTIONS.FEE_REFUNDS);
}

export function instituteCategoriesCollection() {
  return typedCollection<InstituteCategoryRecord>(COLLECTIONS.INSTITUTE_CATEGORIES);
}

export function instituteAccountsCollection() {
  return typedCollection<InstituteAccountRecord>(COLLECTIONS.INSTITUTE_ACCOUNTS);
}

export function instituteLedgerEntriesCollection() {
  return typedCollection<InstituteLedgerEntryRecord>(
    COLLECTIONS.INSTITUTE_LEDGER_ENTRIES
  );
}
