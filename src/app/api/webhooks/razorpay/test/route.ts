import { NextRequest } from "next/server";
import { processEnvironmentWebhook } from "@/services/payment.service";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const eventIdHeader = request.headers.get("x-razorpay-event-id");
    const result = await processEnvironmentWebhook({
      environment: "test",
      rawBody,
      signature,
      eventIdHeader,
    });
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
