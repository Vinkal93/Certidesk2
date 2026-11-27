import "server-only";
import { NextResponse } from "next/server";
import { AuthError } from "@/lib/security/session";
import { InsufficientWalletBalanceError } from "@/services/wallet.service";

export interface ApiErrorBody {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, number | string>;
  };
}

export interface ApiSuccessBody<T> {
  ok: true;
  data: T;
}

export function jsonOk<T>(data: T, status = 200): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json({ ok: true, data }, { status });
}

export function jsonError(
  status: number,
  code: string,
  message: string
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message },
    },
    { status }
  );
}

export function handleApiError(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof InsufficientWalletBalanceError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          details: {
            requiredPaise: error.requiredPaise,
            availablePaise: error.availablePaise,
            shortfallPaise: error.shortfallPaise,
          },
        },
      },
      { status: error.status }
    );
  }
  if (error instanceof AuthError) {
    return jsonError(error.status, error.code, error.message);
  }
  console.error("[API_ERROR]", error);
  return jsonError(500, "INTERNAL_ERROR", "An unexpected server error occurred.");
}
