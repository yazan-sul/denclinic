import { Resend } from 'resend';

export class EmailConfigurationError extends Error {
  constructor() {
    super('Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM in .env.');
    this.name = 'EmailConfigurationError';
  }
}

type SendHtmlEmailInput = {
  to: string;
  subject: string;
  html: string;
};

type SendOtpEmailInput = {
  to: string;
  otp: string;
};

export function isEmailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

function getResendConfig() {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    throw new EmailConfigurationError();
  }

  return {
    resend: new Resend(process.env.RESEND_API_KEY),
    from: process.env.EMAIL_FROM,
  };
}

export async function sendHtmlEmail({ to, subject, html }: SendHtmlEmailInput) {
  const { resend, from } = getResendConfig();
  await resend.emails.send({ from, to, subject, html });
}

function brandedShell(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#2563eb;padding:28px 32px;text-align:center;">
              <div style="color:#ffffff;font-size:24px;font-weight:700;">DenClinic</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.35;color:#111827;">${title}</h1>
              ${body}
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:18px 32px;text-align:center;color:#6b7280;font-size:12px;line-height:1.6;">
              If you did not request this email, you can safely ignore it.<br>
              &copy; ${new Date().getFullYear()} DenClinic
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetOtpEmail({ to, otp }: SendOtpEmailInput) {
  const appUrl = getAppUrl();
  const html = brandedShell(
    'Password Reset Code',
    `<p style="margin:0 0 18px;color:#374151;line-height:1.7;">Use this code to reset your DenClinic password. It expires in 5 minutes.</p>
     <div style="margin:0 auto 22px;text-align:center;">
       <div style="display:inline-block;background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:18px 28px;">
         <span style="color:#1d4ed8;font-size:34px;font-weight:800;letter-spacing:10px;">${otp}</span>
       </div>
     </div>
     <p style="margin:0 0 22px;color:#6b7280;font-size:14px;line-height:1.7;">For security, never share this code with anyone.</p>
     <p style="margin:0;text-align:center;">
       <a href="${appUrl}/auth/signin" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:10px;padding:12px 20px;font-weight:700;">Open DenClinic</a>
     </p>`,
  );

  await sendHtmlEmail({
    to,
    subject: 'Password Reset Code',
    html,
  });
}

export async function sendEmailOtpEmail({ to, otp }: SendOtpEmailInput) {
  const html = brandedShell(
    'Email Verification Code',
    `<p style="margin:0 0 18px;color:#374151;line-height:1.7;">Use this code to verify your email address. It expires in 10 minutes.</p>
     <div style="margin:0 auto 22px;text-align:center;">
       <div style="display:inline-block;background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:18px 28px;">
         <span style="color:#1d4ed8;font-size:34px;font-weight:800;letter-spacing:10px;">${otp}</span>
       </div>
     </div>`,
  );

  await sendHtmlEmail({
    to,
    subject: 'Email Verification Code',
    html,
  });
}
