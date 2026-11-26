import "server-only";
import type { CollectionReference, DocumentData } from "firebase-admin/firestore";
import { getAdminFirestore } from "./admin";
import type {
  AuditLogRecord,
  InstituteRecord,
  LoginIdentifierMapping,
  StudentRecord,
  UserProfileRecord,
  WalletTransactionRecord,
} from "@/types/domain";
import type {
  GatewayConfigHistoryRecord,
  PaymentOrderRecord,
  RazorpayGatewayConfig,
  WebhookEventRecord,
} from "@/types/payment";

export const COLLECTIONS = {
  INSTITUTES: "institutes",
  USERS: "users",
  STUDENTS: "students",
  LOGIN_MAPPINGS: "login_mappings",
  WALLET_TRANSACTIONS: "wallet_transactions",
  AUDIT_LOGS: "audit_logs",
  PAYMENT_ORDERS: "payment_orders",
  PAYMENT_GATEWAY_CONFIG: "paymentGatewayConfig",
  GATEWAY_CONFIG_HISTORY: "gateway_config_history",
  WEBHOOK_EVENTS: "webhook_events",
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
