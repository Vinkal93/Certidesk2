import { createHmac, timingSafeEqual } from "crypto";

export function computeHmacSha256Hex(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function safeCompareHex(expectedHex: string, actualHex: string): boolean {
  if (!expectedHex || !actualHex || expectedHex.length !== actualHex.length) {
    return false;
  }
  const expectedBuf = Buffer.from(expectedHex, "utf8");
  const actualBuf = Buffer.from(actualHex, "utf8");
  return timingSafeEqual(expectedBuf, actualBuf);
}

export function verifyRazorpayCheckoutSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  const expected = computeHmacSha256Hex(
    `${params.orderId}|${params.paymentId}`,
    params.keySecret
  );
  return safeCompareHex(expected, params.signature);
}

export function verifyRazorpayWebhookSignature(params: {
  rawBody: string;
  signature: string;
  webhookSecret: string;
}): boolean {
  const expected = computeHmacSha256Hex(params.rawBody, params.webhookSecret);
  return safeCompareHex(expected, params.signature);
}
