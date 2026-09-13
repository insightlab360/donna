import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { handleApiError } from "@/lib/api-error";
import { setUnlimited } from "@/lib/membership/actions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile: actor } = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const admin = createAdminClient();
    const profile = await setUnlimited(admin, actor.id, id, body);
    return NextResponse.json({ profile });
  } catch (err) {
    return handleApiError(err);
  }
}
