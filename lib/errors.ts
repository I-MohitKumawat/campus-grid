/**
 * lib/errors.ts
 *
 * Typed application error classes. Every throw in the codebase should use
 * one of these instead of a generic Error so that route handlers can respond
 * with the correct HTTP status code automatically.
 */

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ── 401 ──────────────────────────────────────────────────────────────────────
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required.') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

// ── 403 ──────────────────────────────────────────────────────────────────────
export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message, 403, 'FORBIDDEN');
  }
}

// ── 404 ──────────────────────────────────────────────────────────────────────
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found.`, 404, 'NOT_FOUND');
  }
}

// ── 409 ──────────────────────────────────────────────────────────────────────
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

// ── 422 ──────────────────────────────────────────────────────────────────────
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

// ── 429 ──────────────────────────────────────────────────────────────────────
export class TooManyRequestsError extends AppError {
  constructor(message = 'Rate limit exceeded. Please try again later.') {
    super(message, 429, 'RATE_LIMITED');
  }
}
