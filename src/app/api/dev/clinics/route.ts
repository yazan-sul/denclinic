import { NextResponse } from 'next/server';
import { MOCK_CLINICS } from '@/lib/mockData';
import { getApiRuntimeMode } from '@/lib/apiMode';

export async function GET() {
  const mode = getApiRuntimeMode();

  if (mode === 'strict-production') {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Sandbox routes are disabled in production',
          code: 'FORBIDDEN',
        },
      },
      { status: 403 }
    );
  }

  const response = NextResponse.json({
    success: true,
    data: MOCK_CLINICS,
    sandbox: true,
  });

  response.headers.set('x-den-runtime-mode', mode);
  response.headers.set('x-den-sandbox', 'true');
  return response;
}
