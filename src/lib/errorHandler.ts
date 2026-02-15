import { toast } from 'sonner';

/**
 * Extract a user-friendly message from an unknown error value.
 */
export function extractErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
}

/**
 * Standard error handler for mutations / async actions.
 * Logs with a context prefix and shows a toast to the user.
 */
export function handleMutationError(
  error: unknown,
  context: string,
  userMessage?: string,
): void {
  const message = userMessage || extractErrorMessage(error, `${context} failed`);
  console.error(`[${context}]`, error);
  toast.error(message);
}
