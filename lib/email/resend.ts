import { Resend } from "resend";

export function hasResendConfig() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(input: { to: string[]; subject: string; html: string; text?: string }) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error("Email delivery is not configured. Add RESEND_API_KEY and EMAIL_FROM to Vercel environment variables.");
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}

export function announcementHtml(title: string, body: string) {
  const safeTitle = title.replace(/[<>]/g, "");
  const safeBody = body.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />");
  return `
  <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a">
    <div style="border:1px solid #e2e8f0;border-radius:20px;padding:24px;background:#ffffff">
      <p style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#2563eb;text-transform:uppercase;margin:0 0 12px">Horizons</p>
      <h1 style="font-size:28px;line-height:1.1;margin:0 0 14px;color:#07111f">${safeTitle}</h1>
      <p style="font-size:16px;line-height:1.7;color:#334155;margin:0">${safeBody}</p>
    </div>
    <p style="font-size:12px;color:#64748b;margin-top:14px">You received this message from your school through Horizons.</p>
  </div>`;
}
