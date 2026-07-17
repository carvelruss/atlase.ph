import { z } from 'zod';
import { badRequest } from './errors';

function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

/** Parse and validate a JSON request body, throwing a 400 ApiException on failure. */
export async function parseJsonBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw badRequest('Request body must be valid JSON.');
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw badRequest('The submitted data is invalid.', toFieldErrors(result.error));
  }
  return result.data;
}

/** Parse and validate URL search params. */
export function parseQuery<T extends z.ZodTypeAny>(url: URL, schema: T): z.infer<T> {
  const obj: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) obj[key] = value;
  const result = schema.safeParse(obj);
  if (!result.success) {
    throw badRequest('Invalid query parameters.', toFieldErrors(result.error));
  }
  return result.data;
}
