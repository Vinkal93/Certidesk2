import { randomBytes } from "crypto";

/**
 * Generates a cryptographically random temporary password for one-time handoff.
 * Never persisted in plaintext in Firestore.
 */
export function generateTemporaryPassword(length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    const byte = bytes[i] ?? 0;
    result += alphabet[byte % alphabet.length];
  }
  return result;
}
