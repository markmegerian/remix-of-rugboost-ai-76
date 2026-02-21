/**
 * Retry a function with exponential backoff.
 * @param fn - async function to retry
 * @param maxRetries - max number of retries (default 2, so 3 total attempts)
 * @param baseDelay - initial delay in ms (default 1000)
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelay = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`[retryWithBackoff] Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}
