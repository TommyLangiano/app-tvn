import { NextResponse } from 'next/server';

/**
 * Error handling centralizzato per tutte le API
 * Evita exposure di dettagli sensibili in produzione
 */

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Handler centralizzato per errori API
 * - Log errori in modo sicuro (no PII)
 * - Ritorna risposte consistent
 * - Nasconde dettagli in production
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
  // Log error (in produzione usare Sentry o simili)
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorContext = context ? `[${context}]` : '';

  // Log senza PII
  console.error(`${errorContext} API Error:`, {
    message: errorMessage,
    type: error instanceof Error ? error.name : typeof error,
    // NON loggare dettagli sensibili come email, password, token
  });

  // Se è un ApiError custom, usa statusCode e message
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }

  // Altrimenti errore generico 500
  return NextResponse.json(
    {
      error: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : errorMessage
    },
    { status: 500 }
  );
}

/**
 * Helper per creare errori comuni
 */
export const ApiErrors = {
  notAuthenticated: () => new ApiError(401, 'Not authenticated'),
  notAuthorized: () => new ApiError(403, 'Unauthorized'),
  notFound: (resource: string = 'Resource') => new ApiError(404, `${resource} not found`),
  badRequest: (message: string) => new ApiError(400, message),
  conflict: (message: string) => new ApiError(409, message),
  rateLimitExceeded: (retryAfter: number) => {
    const error = new ApiError(429, 'Too many requests');
    error.details = { retryAfter };
    return error;
  },
};

/**
 * Wrapper per try-catch con error handling automatico
 */
export async function withErrorHandling<T>(
  handler: () => Promise<T>,
  context?: string
): Promise<T | NextResponse> {
  try {
    return await handler();
  } catch (error) {
    return handleApiError(error, context);
  }
}
