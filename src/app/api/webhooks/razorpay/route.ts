import { jsonError } from "@/lib/utils/api-response";

export async function POST() {
  return jsonError(
    400,
    "ENVIRONMENT_ENDPOINT_REQUIRED",
    "Use environment-specific webhook endpoints: /api/webhooks/razorpay/test or /api/webhooks/razorpay/live."
  );
}
