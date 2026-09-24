import type { ApiResponse } from '../types/api';

/**
 * Pulls `data` out of the REST envelope, turning `success: false` into a
 * thrown error so callers only ever deal with payloads or exceptions.
 */
export function unwrap<T>(envelope: ApiResponse<T>): T {
  if (!envelope || envelope.success !== true) {
    const failure = envelope as { error?: string; message?: string } | undefined;
    throw new Error(failure?.message || failure?.error || 'Request failed');
  }
  return envelope.data;
}
