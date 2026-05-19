/**
 * lib/response.ts
 *
 * Standardised API response factory functions.
 *
 * All route handlers MUST use these helpers to guarantee the shape:
 *   { success: boolean, data?: T, error?: string, code?: string, meta?: PaginationMeta }
 *
 * This prevents response shape drift as the API grows.
 */

export interface PaginationMeta {
  total?: number;
  page?: number;
  limit?: number;
  cursor?: string | null;
  hasMore?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  meta?: PaginationMeta;
}

/**
 * Build a successful JSON Response.
 * @param data     - The response payload
 * @param status   - HTTP status code (default 200)
 * @param meta     - Optional pagination metadata
 */
export function successResponse<T>(
  data: T,
  status = 200,
  meta?: PaginationMeta
): Response {
  const body: ApiResponse<T> = { success: true, data };
  if (meta) body.meta = meta;
  return Response.json(body, { status });
}

/**
 * Build an error JSON Response.
 * @param message  - Human-readable error description
 * @param status   - HTTP status code (default 500)
 * @param code     - Machine-readable error code (e.g. 'UNAUTHORIZED')
 */
export function errorResponse(
  message: string,
  status = 500,
  code = 'INTERNAL_ERROR'
): Response {
  const body: ApiResponse<never> = { success: false, error: message, code };
  return Response.json(body, { status });
}
