import {
  getAppUrl,
  isEmailDeliveryConfigured,
  sendEmailOtpEmail,
  sendHtmlEmail,
} from '@/services/email/resend';

export { EmailConfigurationError } from '@/services/email/resend';

function shell(title: string, body: string) {
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

function verificationHtml(name: string, verifyUrl: string) {
  return shell(
    `Welcome to DenClinic, ${name}`,
    `<p style="margin:0 0 18px;color:#374151;line-height:1.7;">Your account was created successfully. Confirm your email address to activate all account features.</p>
     <p style="margin:0;text-align:center;">
       <a href="${verifyUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:10px;padding:12px 20px;font-weight:700;">Verify Email</a>
     </p>
     <p style="margin:22px 0 0;color:#6b7280;font-size:14px;line-height:1.7;">This link expires in 24 hours.</p>`,
  );
}

function welcomeHtml(name: string) {
  return shell(
    `Welcome to DenClinic, ${name}`,
    '<p style="margin:0;color:#374151;line-height:1.7;">Your account was created successfully. You can now manage your appointments and clinic profile.</p>',
  );
}

export async function sendWelcomeEmail({
  to,
  name,
  verificationToken,
}: {
  to: string;
  name: string;
  verificationToken?: string;
}) {
  if (!isEmailDeliveryConfigured()) return;

  const verifyUrl = verificationToken
    ? `${getAppUrl()}/auth/verify-email?token=${verificationToken}`
    : null;

  await sendHtmlEmail({
    to,
    subject: verifyUrl ? 'Welcome to DenClinic - verify your account' : 'Welcome to DenClinic',
    html: verifyUrl ? verificationHtml(name, verifyUrl) : welcomeHtml(name),
  });
}

export async function sendOtpEmail({ to, otp }: { to: string; otp: string }) {
  await sendEmailOtpEmail({ to, otp });
}

export async function sendVerificationEmail({
  to,
  name,
  verificationToken,
}: {
  to: string;
  name: string;
  verificationToken: string;
}) {
  if (!isEmailDeliveryConfigured()) return;

  const verifyUrl = `${getAppUrl()}/auth/verify-email?token=${verificationToken}`;

  await sendHtmlEmail({
    to,
    subject: 'Verify your email - DenClinic',
    html: verificationHtml(name, verifyUrl),
  });
}
