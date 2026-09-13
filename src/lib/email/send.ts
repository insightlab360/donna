import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

async function send(params: { from: string; to: string; subject: string; html: string }) {
  const { error } = await getResend().emails.send(params);
  if (error) {
    throw new Error(typeof error === "string" ? error : error.message);
  }
}

/** General app notifications: daily digest, membership approval/expiry warnings. */
export async function sendAppEmail(params: { to: string; subject: string; html: string }) {
  const from = process.env.EMAIL_FROM || "My Assistant Donna <onboarding@resend.dev>";
  await send({ ...params, from });
}

/** Inquiry replies — always sent from the support address, never a personal admin Gmail. */
export async function sendSupportEmail(params: { to: string; subject: string; html: string }) {
  const from =
    process.env.SUPPORT_EMAIL_FROM || process.env.EMAIL_FROM || "My Assistant Donna Support <onboarding@resend.dev>";
  await send({ ...params, from });
}

/** Internal-only alert to operators (e.g. "new inquiry submitted"). Never surfaced to end users. */
export async function sendAdminNotification(params: { subject: string; html: string }) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!to) return; // optional — silently skip if not configured
  await sendAppEmail({ to, subject: params.subject, html: params.html });
}
