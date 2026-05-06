export interface PasswordResetRequestResult {
  message: string;
}

export interface ChangePasswordInput {
  identifier?: string | null;
  currentPassword: string;
  newPassword: string;
}

type ApiPayload = {
  success?: boolean;
  message?: string;
  error?: { message?: string };
  token?: string;
  resetToken?: string;
};

async function parseApiResponse<T extends ApiPayload>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T;

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error?.message || payload.message || 'Could not complete the request.');
  }

  return payload;
}

export async function requestPasswordReset(email: string): Promise<PasswordResetRequestResult> {
  const response = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await parseApiResponse<ApiPayload>(response);

  return {
    message: data.message || 'If an account exists for this email, a password reset code has been sent.',
  };
}

export async function verifyPasswordResetCode({
  email,
  code,
}: {
  email: string;
  code: string;
}): Promise<{ token: string }> {
  const normalizedCode = code.trim();

  if (!/^\d{6}$/.test(normalizedCode)) {
    throw new Error('Enter the 6-digit verification code.');
  }

  const response = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp: normalizedCode }),
  });

  const data = await parseApiResponse<ApiPayload>(response);
  const token = data.resetToken || data.token;

  if (!token) {
    throw new Error('The code was verified, but the reset token was missing.');
  }

  return { token };
}

export async function resetPasswordWithToken(
  email: string,
  resetToken: string,
  newPassword: string,
): Promise<string> {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, resetToken, newPassword }),
  });

  const data = await parseApiResponse<ApiPayload>(response);
  return data.message || 'Password updated successfully. Please sign in again.';
}

export async function changePassword({
  currentPassword,
  newPassword,
}: ChangePasswordInput): Promise<string> {
  const response = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const data = await parseApiResponse<ApiPayload>(response);
  return data.message || 'Password updated successfully.';
}
