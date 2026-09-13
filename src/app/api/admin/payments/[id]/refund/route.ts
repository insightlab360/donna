import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { handleApiError } from "@/lib/api-error";
import { refundPayment } from "@/lib/membership/actions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile: actor } = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const admin = createAdminClient();
    await refundPayment(admin, actor.id, {
      paymentId: id,
      refundAmount: body.refundAmount,
      refundType: body.refundType,
      periodAdjustment: body.periodAdjustment,
      newAccessEndAt: body.newAccessEndAt,
      memo: body.memo,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
