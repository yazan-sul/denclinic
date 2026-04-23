import { NextResponse } from 'next/server';
import { MOCK_CLINICS } from '@/lib/mockData';
import { applySandboxHeaders, createSandboxForbiddenResponse, isSandboxEnabled } from '@/lib/apiMode';

export async function GET() {
  if (!isSandboxEnabled()) {
    return createSandboxForbiddenResponse();
  }

  return applySandboxHeaders(NextResponse.json({
    success: true,
    data: MOCK_CLINICS,
    sandbox: true,
  }));
}
