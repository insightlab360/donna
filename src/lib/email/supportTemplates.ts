import { escapeHtml } from "./escapeHtml";

const WRAPPER_STYLE =
  "max-width:560px;margin:0 auto;padding:24px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#111;";

export function supportReplySubject(subject: string): string {
  return `[My Assistant Donna] 문의하신 "${subject}"에 대한 답변입니다`;
}

export function supportReplyHtml(params: { name: string | null; subject: string; message: string; reply: string }): string {
  const { name, subject, message, reply } = params;
  const greeting = name ? escapeHtml(name) : "회원";
  return `
  <div style="${WRAPPER_STYLE}">
    <h1 style="font-size:18px;margin:0 0 16px;">문의 답변 안내</h1>
    <p style="font-size:14px;line-height:1.6;">${greeting}님, 문의하신 내용에 대한 답변입니다.</p>
    <div style="margin-top:16px;padding:12px 14px;background:#f7f7f7;border-radius:6px;">
      <p style="font-size:12px;color:#888;margin:0 0 4px;">문의 내용 · ${escapeHtml(subject)}</p>
      <p style="font-size:13px;color:#333;white-space:pre-wrap;margin:0;">${escapeHtml(message)}</p>
    </div>
    <div style="margin-top:16px;padding:12px 14px;border:1px solid #eee;border-radius:6px;">
      <p style="font-size:12px;color:#888;margin:0 0 4px;">답변</p>
      <p style="font-size:14px;color:#111;white-space:pre-wrap;margin:0;">${escapeHtml(reply)}</p>
    </div>
    <p style="margin-top:28px;font-size:11px;color:#aaa;">My Assistant Donna Support</p>
  </div>`;
}

export function newInquiryAdminSubject(category: string): string {
  return `[My Assistant Donna 관리자 알림] 새 문의 (${category})`;
}

export function newInquiryAdminHtml(params: { userEmail: string; category: string; subject: string; message: string }): string {
  const { userEmail, category, subject, message } = params;
  return `
  <div style="${WRAPPER_STYLE}">
    <h1 style="font-size:16px;margin:0 0 12px;">새 문의가 등록되었습니다</h1>
    <table role="presentation" width="100%" style="font-size:13px;color:#333;">
      <tr><td style="padding:4px 0;color:#888;">보낸 사람</td><td style="padding:4px 0;">${escapeHtml(userEmail)}</td></tr>
      <tr><td style="padding:4px 0;color:#888;">유형</td><td style="padding:4px 0;">${escapeHtml(category)}</td></tr>
      <tr><td style="padding:4px 0;color:#888;">제목</td><td style="padding:4px 0;">${escapeHtml(subject)}</td></tr>
    </table>
    <p style="font-size:13px;color:#333;white-space:pre-wrap;margin-top:12px;">${escapeHtml(message)}</p>
    <p style="margin-top:20px;font-size:11px;color:#aaa;">/admin/inquiries 에서 답변할 수 있습니다.</p>
  </div>`;
}
