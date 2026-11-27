export type GatewayEnvironment = "test" | "live";

export type GatewayConnectionState =
  | "NOT_CONFIGURED"
  | "CONFIGURED"
  | "CONNECTION_FAILED"
  | "VERIFIED"
  | "ACTIVE"
  | "DISABLED";

export interface RazorpayGatewayConfig {
  provider: "razorpay";
  enabled: boolean;
  activeEnvironment: GatewayEnvironment | null;
  testStatus: GatewayConnectionState;
  liveStatus: GatewayConnectionState;
  testConfigured: boolean;
  liveConfigured: boolean;
  testKeyId: string | null;
  liveKeyId: string | null;
  testSecretReference: string | null;
  liveSecretReference: string | null;
  testWebhookSecretReference: string | null;
  liveWebhookSecretReference: string | null;
  testWebhookConfigured: boolean;
  liveWebhookConfigured: boolean;
  testWebhookVerified: boolean;
  liveWebhookVerified: boolean;
  testPaymentFlowVerified: boolean;
  livePaymentFlowVerified: boolean;
  liveMerchantApproved: boolean;
  lastTestConnectionAt: string | null;
  lastLiveConnectionAt: string | null;
  lastTestWebhookAt: string | null;
  lastLiveWebhookAt: string | null;
  lastPaymentEventAt: string | null;
  lastError: string | null;
  configVersion: number;
  updatedAt: string;
  updatedBy: string;
}

export interface GatewayConfigHistoryRecord {
  id: string;
  configVersion: number;
  environment: GatewayEnvironment | "platform";
  action: string;
  actorUid: string;
  summary: string;
  createdAt: string;
}

export type WebhookProcessingStatus =
  "received" | "processed" | "duplicate" | "failed" | "rejected";

export interface WebhookEventRecord {
  id: string;
  eventId: string;
  eventType: string;
  environment: GatewayEnvironment;
  paymentId: string | null;
  orderId: string | null;
  status: WebhookProcessingStatus;
  failureReason: string | null;
  receivedAt: string;
  processedAt: string | null;
}

export type PaymentOrderStatus =
  | "created"
  | "pending"
  | "authorized"
  | "captured"
  | "failed"
  | "partially_refunded"
  | "refunded";

export interface PaymentOrderRecord {
  orderId: string;
  internalPaymentId: string;
  receiptNumber?: string;
  planId?: string | null;
  environment: GatewayEnvironment;
  instituteId: string;
  actorUid: string;
  amountPaise: number;
  bonusPaise?: number;
  refundedAmountPaise: number;
  currency: "INR";
  status: PaymentOrderStatus;
  razorpayPaymentId: string | null;
  webhookConfirmed: boolean;
  bonusGranted?: boolean;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}
