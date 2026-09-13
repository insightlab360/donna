import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { handleApiError } from "@/lib/api-error";
import { setInquiryStatus } from "@/lib/membership/actions";
import { INQUIRY_STATUSES, type InquiryStatus } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile: actor } = await requireAdmin();
    const { id } = await params;
    const { status } = (await request.json()) as { status: InquiryStatus };
    if (!INQUIRY_STATUSES.includes(status)) {
      return NextResponse.json({ error: "잘못된 상태값입니다" }, { status: 400 });
    }

    const admin = createAdminClient();
    await setInquiryStatus(admin, actor.id, id, status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
