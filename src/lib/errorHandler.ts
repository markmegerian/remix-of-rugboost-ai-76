import { toast } from 'sonner';

export function handleMutationError(error: unknown, context: string): void {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  console.error(`[${context}]`, error);
  toast.error(message);
}

export function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
