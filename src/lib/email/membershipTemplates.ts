import { formatMonthDayKR } from "@/lib/date";
import { escapeHtml } from "./escapeHtml";

const WRAPPER_STYLE =
  "max-width:560px;margin:0 auto;padding:24px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#111;";

function wrap(title: string, bodyHtml: string): string {
  return `
  <div style="${WRAPPER_STYLE}">
    <h1 style="font-size:18px;margin:0 0 16px;">${title}</h1>
    ${bodyHtml}
    <p style="margin-top:28px;font-size:11px;color:#aaa;">My Assistant Donna · 나의 비서 도나</p>
  </div>`;
}

export function approvalSubject(): string {
  return "[My Assistant Donna] 이용이 승인되었습니다";
}

export function approvalHtml(params: { name: string | null; isTrial: boolean; startDate: string; endDate: string }): string {
  const { name, isTrial, startDate, endDate } = params;
  const greeting = name ? escapeHtml(name) : "회원";
  return wrap(
    "이용이 승인되었습니다",
    `
    <p style="font-size:14px;line-height:1.6;">${greeting}님, My Assistant Donna 이용 신청이 승인되었습니다.</p>
    <table role="presentation" width="100%" style="margin-top:16px;font-size:13px;color:#333;">
      <tr><td style="padding:4px 0;color:#888;">이용유형</td><td style="padding:4px 0;">${isTrial ? "무료체험" : "유료 이용권"}</td></tr>
      <tr><td style="padding:4px 0;color:#888;">시작일</td><td style="padding:4px 0;">${formatMonthDayKR(startDate)}</td></tr>
      <tr><td style="padding:4px 0;color:#888;">종료일</td><td style="padding:4px 0;">${formatMonthDayKR(endDate)}</td></tr>
    </table>
    `
  );
}

export function expiryWarningSubject(): string {
  return "[My Assistant Donna] 이용기간이 7일 후 종료됩니다";
}

export function expiryWarningHtml(params: { name: string | null; endDate: string }): string {
  const { name, endDate } = params;
  const greeting = name ? escapeHtml(name) : "회원";
  return wrap(
    "이용기간이 곧 종료됩니다",
    `
    <p style="font-size:14px;line-height:1.6;">
      ${greeting}님, My Assistant Donna 이용기간이 <strong>${formatMonthDayKR(endDate)}</strong>에 종료됩니다.
    </p>
    <p style="font-size:13px;line-height:1.6;color:#555;">계속 이용하시려면 앱 내 설정 화면에서 관리자에게 문의해주세요.</p>
    `
  );
}
