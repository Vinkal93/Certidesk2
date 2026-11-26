# CertiDesk Pro — Enterprise Super Admin Control Center Audit

## 1. Existing Reusable Infrastructure

- **Authentication & Sessions**: `src/lib/security/session.ts` (`getSessionUser`, `requireSessionUser`, `requireRecentSuperAdminAuth`, `revokeSessionAndClearCookie`) using Firebase Admin SDK (`checkRevoked = true`) and HTTP-only cookies.
- **Role & Tenant Isolation**: `src/lib/security/permissions.ts` (`super_admin`, `institute_admin`, `staff`, `student`), `src/lib/security/tenant.ts` (`resolveAuthorizedInstitute`).
- **Razorpay & Secret Manager**: `src/services/gateway.service.ts`, `src/lib/gcp/secret-manager.ts`, `src/services/payment.service.ts` (Test/Live separation, raw-body HMAC-SHA256 verification, idempotent wallet credits, idempotent refunds).
- **Atomic Wallet Ledger**: `src/services/wallet.service.ts` (`applyWalletDebitInTransaction`, `creditInstituteWalletIdempotent`, integer paise).
- **Audit Logging**: `src/services/audit.service.ts` (`recordAuditLog` writing append-only records to `audit_logs`).

## 2. New Collections Introduced (Zero Duplication)

- `usageEvents`: Immutable idempotent metering events (`{instituteId}_{metricKey}_{idempotencyKey}`).
- `usageAggregates`: Monthly period rollups (`{instituteId}_{YYYY-MM}`).
- `subscriptions`: Institute-to-plan assignments with historical pricing snapshot.
- `entitlementOverrides`: Institute-specific feature/quota overrides.
- `featureFlags`: Global/plan/institute feature flags & kill switches with version history.
- `emergencyActions`: Global/scoped emergency controls (maintenance, read-only, registration pause, payment pause, expiry/rollback).
- `platformIncidents`: Incident lifecycle records (`open`, `investigating`, `resolved`).
- `securityEvents`: Security alerts, failed login spikes, and webhook rejection summaries.

## 3. Metric Source & Calculation Rules

- **Verified Payment Collections**: Sum of `amountPaise` in `payment_orders` where `environment == "live"` and `status == "captured"`.
- **Wallet Liability**: Sum of `walletBalancePaise` across all `institutes` documents.
- **Platform-Recognized Revenue**: Sum of `amountPaise` in `wallet_transactions` where `type == "debit"` (`student_admission`, `student_profile_update`, etc.). Never conflated with wallet recharges.
- **Unconfigured Providers**: Email, SMS/WhatsApp, and external Storage telemetry report `"Not configured"` unless real credentials are present.
