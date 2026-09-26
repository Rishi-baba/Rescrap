/**
 * Zod parsing helper. Rule VAL-01: validate at every boundary, and report the
 * first failing field rather than echoing the payload back.
 */
import type { z } from 'zod';
import { validationError } from './errors.js';

export function parse<S extends z.ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    throw validationError(first?.path.join('.') || 'body');
  }
  return result.data;
}
