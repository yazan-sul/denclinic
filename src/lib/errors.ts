import { NextResponse } from 'next/server';

/**
 * Custom API error class for consistent error handling
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Validation error - 400 Bad Request
 */
export class ValidationError extends ApiError {
  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(400, message, code);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error - 404 Not Found
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found', code: string = 'NOT_FOUND') {
    super(404, message, code);
    this.name = 'NotFoundError';
  }
}

/**
 * Unauthorized error - 401 Unauthorized
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED') {
    super(401, message, code);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error - 403 Forbidden
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden', code: string = 'FORBIDDEN') {
    super(403, message, code);
    this.name = 'ForbiddenError';
  }
}

/**
 * Conflict error - 409 Conflict
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict', code: string = 'CONFLICT') {
    super(409, message, code);
    this.name = 'ConflictError';
  }
}

/**
 * Standardized error response handler
 * Use this in all API route catch blocks for consistent error responses
 *
 * @example
 * try {
 *   const data = await prisma.clinic.findUnique({ where: { id: 1 } });
 *   if (!data) throw new NotFoundError('Clinic not found');
 *   return NextResponse.json(data);
 * } catch (error) {
 *   return handleApiError(error);
 * }
 */
export function handleApiError(error: unknown) {
  // Handle custom API errors
  if (error instanceof ApiError) {
    console.error(`[${error.name}] ${error.code}: ${error.message}`);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message,
          code: error.code,
        },
      },
      { status: error.status }
    );
  }

  // Handle Prisma errors
  if (error instanceof Error && error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    console.error('[Prisma Error]', prismaError.code, prismaError.message);

    // Map common Prisma error codes
    switch (prismaError.code) {
      case 'P2025': // Record not found
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'Resource not found',
              code: 'NOT_FOUND',
            },
          },
          { status: 404 }
        );
      case 'P2002': // Unique constraint violation
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'Resource already exists',
              code: 'CONFLICT',
            },
          },
          { status: 409 }
        );
      case 'P2003': // Foreign key constraint violation
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'Invalid reference',
              code: 'VALIDATION_ERROR',
            },
          },
          { status: 400 }
        );
    }
  }

  // Handle JSON parsing errors
  if (error instanceof SyntaxError) {
    console.error('[Syntax Error]', error.message);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Invalid request format',
          code: 'INVALID_JSON',
        },
      },
      { status: 400 }
    );
  }

  // Fallback for unexpected errors
  const message = error instanceof Error ? error.message : 'Unknown error occurred';
  console.error('[Unexpected Error]', message);

  return NextResponse.json(
    {
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    },
    { status: 500 }
  );
}

/**
 * Type for consistent API responses
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}
