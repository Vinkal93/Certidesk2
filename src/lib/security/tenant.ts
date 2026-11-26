import "server-only";
import { institutesCollection } from "@/lib/firebase/firestore";
import type { SessionUser } from "@/types/auth";
import type { InstituteRecord } from "@/types/domain";
import { AuthError } from "./session";

/**
 * Resolves the tenant (institute) strictly from the server-verified SessionUser claims.
 * Never accepts or trusts an instituteId supplied by the browser.
 */
export async function resolveAuthorizedInstitute(
  user: SessionUser
): Promise<InstituteRecord> {
  if (user.role === "super_admin") {
    throw new AuthError(
      403,
      "TENANT_CONTEXT_INVALID",
      "Super Admin must use platform-level endpoints with explicit target selection."
    );
  }

  if (!user.instituteId) {
    throw new AuthError(
      403,
      "INSTITUTE_UNASSIGNED",
      "No institute is associated with this account."
    );
  }

  const doc = await institutesCollection().doc(user.instituteId).get();
  const institute = doc.data();

  if (!doc.exists || !institute) {
    throw new AuthError(403, "INSTITUTE_NOT_FOUND", "Associated institute not found.");
  }

  if (institute.status !== "active") {
    throw new AuthError(
      423,
      "INSTITUTE_SUSPENDED",
      "This institute account is currently suspended."
    );
  }

  return institute;
}
