import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { handleApiError } from "@/lib/api-error";
import { sendSupportEmail } from "@/lib/email/send";
import { supportReplyHtml, supportReplySubject } from "@/lib/email/supportTemplates";
import type { Profile, SupportInquiry } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile: actor } = await requireAdmin();
    const { id } = await params;
    const { reply } = (await request.json()) as { reply: string };
    if (!reply || !reply.trim()) {
      return NextResponse.json({ error: "답변 내용을 입력해주세요" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: inquiry, error: inquiryError } = await admin
      .from("support_inquiries")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (inquiryError) throw inquiryError;
    if (!inquiry) return NextResponse.json({ error: "문의를 찾을 수 없습니다" }, { status: 404 });

    const typedInquiry = inquiry as SupportInquiry;

    const { data: userProfile } = await admin.from("profiles").select("*").eq("id", typedInquiry.user_id).maybeSingle();
    const profile = userProfile as Profile | null;

    const { error: updateError } = await admin
      .from("support_inquiries")
      .update({ admin_reply: reply, replied_at: new Date().toISOString(), replied_by: actor.id, status: "answered" })
      .eq("id", id);
    if (updateError) throw updateError;

    if (profile?.email) {
      await sendSupportEmail({
        to: profile.email,
        subject: supportReplySubject(typedInquiry.subject),
        html: supportReplyHtml({ name: profile.name, subject: typedInquiry.subject, message: typedInquiry.message, reply }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
