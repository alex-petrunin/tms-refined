import type { HttpResponse } from "../types/backend.global";

/**
 * Helper function to send a successful JSON response
 */
export function successResponse<R>(ctx: { response: HttpResponse<R> }, data: R): void {
    ctx.response.json(data);
}

/**
 * Helper function to send an internal error response
 */
export function internalError(ctx: { response: HttpResponse }, error: unknown): void {
    const message = error instanceof Error ? error.message : 'Internal server error';
    ctx.response.code = 500;
    ctx.response.json({ error: message } as any);
}

