import { NextResponse } from 'next/server';

export type ApiRuntimeMode = 'strict-production' | 'strict-development';

export function getApiRuntimeMode(): ApiRuntimeMode {
  return process.env.NODE_ENV === 'production' ? 'strict-production' : 'strict-development';
}

export function isSandboxEnabled(): boolean {
  return getApiRuntimeMode() !== 'strict-production';
}

export function createSandboxForbiddenResponse() {
  const response = NextResponse.json(
    {
      success: false,
      error: {
        message: 'Sandbox routes are disabled in production',
        code: 'FORBIDDEN',
      },
    },
    { status: 403 }
  );

  response.headers.set('x-den-runtime-mode', getApiRuntimeMode());
  return response;
}

export function applySandboxHeaders(response: NextResponse) {
  response.headers.set('x-den-runtime-mode', getApiRuntimeMode());
  response.headers.set('x-den-sandbox', 'true');
  return response;
}

export function buildDbUnavailableResponse(serviceName: string, error: unknown) {
  const mode = getApiRuntimeMode();

  if (mode === 'strict-production') {
    const response = NextResponse.json(
      {
        success: false,
        error: {
          message: `${serviceName} غير متاحة حالياً`,
          code: 'SERVICE_UNAVAILABLE',
        },
      },
      { status: 503 }
    );

    response.headers.set('x-den-runtime-mode', mode);
    return response;
  }

  const debugMessage = error instanceof Error ? error.message : 'Unknown database error';
  const response = NextResponse.json(
    {
      success: false,
      error: {
        message: `${serviceName} غير متاحة حالياً`,
        code: 'DB_ERROR',
        detail: debugMessage,
        hint: 'Check database connection, run migrations, and verify seed data.',
      },
    },
    { status: 503 }
  );

  response.headers.set('x-den-runtime-mode', mode);
  response.headers.set('x-den-db-observable', 'true');
  return response;
}
