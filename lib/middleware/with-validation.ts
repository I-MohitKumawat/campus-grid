/**
 * lib/middleware/with-validation.ts
 *
 * `withValidation` — Higher-order function that validates a request body
 * (or query params) against a Zod schema before calling the inner handler.
 *
 * Returns 422 with field-level errors if validation fails.
 * The parsed, type-safe data is passed as the last argument to the handler.
 *
 * Usage (body validation):
 *
 *   const schema = z.object({ title: z.string().min(1) });
 *
 *   export const POST = withValidation(schema, async (req, ctx, body) => {
 *     // body is fully typed as { title: string }
 *   });
 *
 * Usage (combined auth + validation — compose both HOFs):
 *
 *   export const POST = withAuth(
 *     withValidation(schema, async (req, ctx, body, user) => { ... }),
 *     ['admin']
 *   );
 *
 * Note: For query-param validation, call validateQuery() directly inside
 * your handler — query strings do not need the same HOF treatment.
 */

import { z, ZodSchema, ZodError } from 'zod';
import type { NextRequest } from 'next/server';
import { errorResponse } from '@/lib/response';

type ValidatedHandler<TBody, TParams = Record<string, string>> = (
  req: NextRequest,
  ctx: { params: Promise<TParams> },
  body: TBody
) => Promise<Response>;

/**
 * Wraps a route handler with Zod body validation.
 *
 * @param schema  - Zod schema to validate the request body against
 * @param handler - The handler that receives the parsed body
 */
export function withValidation<TBody, TParams = Record<string, string>>(
  schema: ZodSchema<TBody>,
  handler: ValidatedHandler<TBody, TParams>
) {
  return async (
    req: NextRequest,
    ctx: { params: Promise<TParams> }
  ): Promise<Response> => {
    let rawBody: unknown;

    try {
      rawBody = await req.json();
    } catch {
      return errorResponse('Request body must be valid JSON.', 422, 'INVALID_JSON');
    }

    const result = schema.safeParse(rawBody);

    if (!result.success) {
      const fieldErrors = formatZodErrors(result.error);
      return Response.json(
        {
          success: false,
          error: 'Validation failed.',
          code: 'VALIDATION_ERROR',
          details: fieldErrors,
        },
        { status: 422 }
      );
    }

    return handler(req, ctx, result.data);
  };
}

/**
 * Validate query parameters against a Zod schema.
 * Call this inside a route handler when you need typed search params.
 *
 * @param req    - The incoming NextRequest
 * @param schema - Zod schema for query params
 * @returns Parsed data or throws a Response with 422
 */
export function parseQuery<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): { data: T } | { error: Response } {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const result = schema.safeParse(raw);

  if (!result.success) {
    const fieldErrors = formatZodErrors(result.error);
    const error = Response.json(
      {
        success: false,
        error: 'Invalid query parameters.',
        code: 'VALIDATION_ERROR',
        details: fieldErrors,
      },
      { status: 422 }
    );
    return { error };
  }

  return { data: result.data };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function formatZodErrors(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_root';
    if (!fieldErrors[key]) fieldErrors[key] = [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}
