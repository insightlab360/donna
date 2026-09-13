import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { handleApiError } from "@/lib/api-error";
import { upsertMemberNote } from "@/lib/membership/actions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile: actor } = await requireAdmin();
    const { id } = await params;
    const body = (await request.json()) as { memo1?: string };

    const admin = createAdminClient();
    const note = await upsertMemberNote(admin, actor.id, id, { memo1: body.memo1 ?? "" });
    return NextResponse.json({ note });
  } catch (err) {
    return handleApiError(err);
  }
}
