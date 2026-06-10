import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "TA/DA Tracker <noreply@10minuteschool.com>";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

type SendArgs = {
  to: string;
  subject: string;
  type: string;
  requestId?: string;
  html: string;
};

export async function sendEmail({ to, subject, type, requestId, html }: SendArgs) {
  let error: string | null = null;
  try {
    if (!resend) {
      // Dev/local: skip real send, just log.
      console.log(`[email skipped — no RESEND_API_KEY] to=${to} subject=${subject}`);
    } else {
      const res = await resend.emails.send({
        from: EMAIL_FROM,
        to,
        subject,
        html,
      });
      if (res.error) {
        error = res.error.message ?? "Unknown send error";
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  await prisma.emailLog.create({
    data: { to, subject, type, requestId, error },
  });

  return { ok: !error, error };
}

export function emailLayout(title: string, body: string, ctaUrl?: string, ctaText?: string) {
  const cta = ctaUrl
    ? `<p style="margin:24px 0"><a href="${ctaUrl}" style="background:#dc2626;color:white;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">${ctaText ?? "Open in TA/DA Tracker"}</a></p>`
    : "";
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#0a0a0a;max-width:560px;margin:0 auto;padding:24px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
      <div style="width:32px;height:32px;background:#dc2626;border-radius:6px;color:white;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">10</div>
      <strong>10 Minute School · TA/DA Tracker</strong>
    </div>
    <h2 style="font-size:18px;margin:0 0 12px">${title}</h2>
    ${body}
    ${cta}
    <p style="color:#737373;font-size:12px;margin-top:32px">This is an automated notification. Reply to your line manager for questions.</p>
  </body></html>`;
}

export function requestUrl(requestId: string) {
  return `${APP_URL}/requests/${requestId}`;
}

export function approvalUrl(requestId: string) {
  return `${APP_URL}/approvals/${requestId}`;
}
