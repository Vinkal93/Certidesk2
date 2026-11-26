import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { requireRecentSuperAdminAuth, requireSessionUser } from "@/lib/security/session";
import {
  listFeatureFlags,
  rollbackFeatureFlag,
  upsertFeatureFlag,
} from "@/services/feature-flags.service";

const UpsertSchema = z.object({
  action: z.literal("upsert").default("upsert"),
  key: z.string().min(2).max(64),
  name: z.string().min(2).max(120),
  description: z.string().max(400).default(""),
  globalEnabled: z.boolean(),
  killSwitchActive: z.boolean(),
  planAllowlist: z.array(z.string()).optional(),
  instituteOverrides: z.record(z.string(), z.boolean()).optional(),
  reason: z.string().min(3).max(300),
});

const RollbackSchema = z.object({
  action: z.literal("rollback"),
  key: z.string().min(2).max(64),
  targetVersion: z.number().int().positive(),
  reason: z.string().min(3).max(300),
});

export async function GET() {
  try {
    const actor = await requireSessionUser("super_admin");
    const flags = await listFeatureFlags(actor);
    return jsonOk({ flags });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "rollback") {
      const parsed = RollbackSchema.parse(body);
      const flag = await rollbackFeatureFlag(
        actor,
        parsed.key,
        parsed.targetVersion,
        parsed.reason
      );
      return jsonOk({ flag });
    }

    const parsed = UpsertSchema.parse(body);
    const flag = await upsertFeatureFlag(actor, {
      key: parsed.key,
      name: parsed.name,
      description: parsed.description,
      globalEnabled: parsed.globalEnabled,
      killSwitchActive: parsed.killSwitchActive,
      ...(parsed.planAllowlist !== undefined
        ? { planAllowlist: parsed.planAllowlist }
        : {}),
      ...(parsed.instituteOverrides !== undefined
        ? { instituteOverrides: parsed.instituteOverrides }
        : {}),
      reason: parsed.reason,
    });
    return jsonOk({ flag });
  } catch (error) {
    return handleApiError(error);
  }
}
