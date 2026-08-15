/**
 * Standard API response helpers.
 */

export function ok(data: unknown, meta?: Record<string, unknown>) {
  return Response.json({ success: true, data, ...(meta ? { meta } : {}) });
}

export function created(data: unknown) {
  return Response.json({ success: true, data }, { status: 201 });
}

export function error(message: string, status = 400) {
  return Response.json({ success: false, error: message }, { status });
}

export function unauthorized(message = 'Authentication required') {
  return Response.json({ success: false, error: message }, { status: 401 });
}

export function forbidden(message = 'Insufficient permissions') {
  return Response.json({ success: false, error: message }, { status: 403 });
}

export function notFound(message = 'Resource not found') {
  return Response.json({ success: false, error: message }, { status: 404 });
}

export function serverError(message = 'Internal server error') {
  return Response.json({ success: false, error: message }, { status: 500 });
}
