import "server-only";
import { cookies } from "next/headers";

export const IMPRESSION_COOKIE_NAME = "cd_su_impression_institute";

export async function getSuperAdminImpressionInstituteId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const val = cookieStore.get(IMPRESSION_COOKIE_NAME)?.value?.trim();
    return val || null;
  } catch {
    return null;
  }
}
