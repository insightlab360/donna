import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendAdminNotification } from "@/lib/email/send";
import { newInquiryAdminHtml, newInquiryAdminSubject } from "@/lib/email/supportTemplates";
import { INQUIRY_CATEGORIES, type InquiryCategory } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const body = (await request.json()) as { category: InquiryCategory; subject: string; message: string };
  if (!INQUIRY_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: "문의유형이 올바르지 않습니다" }, { status: 400 });
  }
  if (!body.subject?.trim() || !body.message?.trim()) {
    return NextResponse.json({ error: "제목과 문의내용을 입력해주세요" }, { status: 400 });
  }

  const { data: inquiry, error } = await supabase
    .from("support_inquiries")
    .insert({ user_id: user.id, category: body.category, subject: body.subject.trim(), message: body.message.trim() })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Best-effort internal alert — never lets a failure roll back the saved inquiry.
  sendAdminNotification({
    subject: newInquiryAdminSubject(body.category),
    html: newInquiryAdminHtml({
      userEmail: user.email ?? "",
      category: body.category,
      subject: body.subject.trim(),
      message: body.message.trim(),
    }),
  }).catch(() => {});

  return NextResponse.json({ inquiry });
}
