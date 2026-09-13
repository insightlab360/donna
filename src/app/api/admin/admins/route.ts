import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { handleApiError } from "@/lib/api-error";
import { setRole } from "@/lib/membership/actions";
import type { Role } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { profile: actor } = await requireSuperAdmin();
    const body = (await request.json()) as { userId: string; role: Role };

    const admin = createAdminClient();
    const profile = await setRole(admin, actor.id, body.userId, body.role);
    return NextResponse.json({ profile });
  } catch (err) {
    return handleApiError(err);
  }
}
