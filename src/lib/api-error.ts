import { NextResponse } from "next/server";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/admin";

export function handleApiError(err: unknown) {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  const message = err instanceof Error ? err.message : "서버 오류가 발생했습니다";
  return NextResponse.json({ error: message }, { status: 400 });
}
