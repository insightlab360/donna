import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { handleApiError } from "@/lib/api-error";
import { addMemberPaymentNote } from "@/lib/membership/actions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile: actor } = await requireAdmin();
    const { id } = await params;
    const { content } = (await request.json()) as { content: string };

    const admin = createAdminClient();
    const note = await addMemberPaymentNote(admin, actor.id, id, content);
    return NextResponse.json({ note });
  } catch (err) {
    return handleApiError(err);
  }
}
