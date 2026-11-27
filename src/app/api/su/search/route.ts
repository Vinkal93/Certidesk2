import { NextRequest } from "next/server";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { requireSessionUser } from "@/lib/security/session";
import {
  institutesCollection,
  studentsCollection,
  usersCollection,
} from "@/lib/firebase/firestore";
import { suNavGroups } from "@/config/su-nav";

export interface GlobalSearchResult {
  id: string;
  category: "institute" | "user" | "student" | "page";
  title: string;
  subtitle: string;
  href: string;
}

export async function GET(req: NextRequest) {
  try {
    await requireSessionUser("super_admin");
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
    if (!q) {
      return jsonOk({ results: [] as GlobalSearchResult[] });
    }

    const [instSnap, usersSnap, studentsSnap] = await Promise.all([
      institutesCollection().get(),
      usersCollection().get(),
      studentsCollection().get(),
    ]);

    const results: GlobalSearchResult[] = [];

    for (const doc of instSnap.docs) {
      const i = doc.data();
      if (
        i.name.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q) ||
        i.ownerName.toLowerCase().includes(q) ||
        i.phone.toLowerCase().includes(q)
      ) {
        results.push({
          id: `inst-${i.id}`,
          category: "institute",
          title: `${i.name} (${i.code})`,
          subtitle: `Owner: ${i.ownerName} • ${i.status} • Live Impression`,
          href: `/su/institutes/${i.id}/impression`,
        });
      }
      if (results.length >= 6) break;
    }

    let userMatches = 0;
    for (const doc of usersSnap.docs) {
      const u = doc.data();
      if (
        (u.displayName ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      ) {
        results.push({
          id: `user-${u.uid}`,
          category: "user",
          title: u.displayName || u.email,
          subtitle: `${u.role} • ${u.email}${u.disabled ? " • Blocked" : ""}`,
          href: `/su/users`,
        });
        userMatches += 1;
        if (userMatches >= 5) break;
      }
    }

    let stuMatches = 0;
    for (const doc of studentsSnap.docs) {
      const s = doc.data();
      if (
        s.fullName.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      ) {
        results.push({
          id: `stu-${s.id}`,
          category: "student",
          title: `${s.fullName} (${s.studentCode})`,
          subtitle: `Student • ${s.email}`,
          href: `/su/users`,
        });
        stuMatches += 1;
        if (stuMatches >= 4) break;
      }
    }

    for (const group of suNavGroups) {
      for (const item of group.items) {
        if (item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q)) {
          results.push({
            id: `page-${item.href}`,
            category: "page",
            title: item.label,
            subtitle: `${group.title} • ${item.href}`,
            href: item.href,
          });
        }
      }
    }

    return jsonOk({ results: results.slice(0, 15) });
  } catch (error) {
    return handleApiError(error);
  }
}
