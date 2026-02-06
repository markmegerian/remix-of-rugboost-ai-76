/**
 * Error Monitoring Utilities for Edge Functions
 * 
 * Provides structured error logging and monitoring for beta testing.
 * Logs are accessible via Supabase Dashboard > Edge Functions > Logs
 */

export interface ErrorContext {
  functionName: string;
  userId?: string;
  companyId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface MonitoredError {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  functionName: string;
  message: string;
  errorType?: string;
  stack?: string;
  context: ErrorContext;
}

/**
 * Log a structured error with full context
 */
export function logError(
  error: Error | unknown,
  context: ErrorContext
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  const logEntry: MonitoredError = {
    timestamp: new Date().toISOString(),
    level: 'error',
    functionName: context.functionName,
    message: errorObj.message,
    errorType: errorObj.name,
    stack: errorObj.stack,
    context,
  };

  // Structured JSON logging for easy parsing
  console.error(JSON.stringify(logEntry));
}

/**
 * Log a warning with context
 */
export function logWarning(
  message: string,
  context: ErrorContext
): void {
  const logEntry: MonitoredError = {
    timestamp: new Date().toISOString(),
    level: 'warn',
    functionName: context.functionName,
    message,
    context,
  };

  console.warn(JSON.stringify(logEntry));
}

/**
 * Log an info message with context
 */
export function logInfo(
  message: string,
  context: ErrorContext
): void {
  const logEntry: MonitoredError = {
    timestamp: new Date().toISOString(),
    level: 'info',
    functionName: context.functionName,
    message,
    context,
  };

  console.log(JSON.stringify(logEntry));
}

/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Wrapper to catch and log errors in edge function handlers
 */
export function withErrorMonitoring(
  functionName: string,
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      logInfo(`Request started`, {
        functionName,
        requestId,
        metadata: {
          method: req.method,
          url: req.url,
        },
      });

      const response = await handler(req);

      logInfo(`Request completed`, {
        functionName,
        requestId,
        metadata: {
          duration: Date.now() - startTime,
          status: response.status,
        },
      });

      return response;
    } catch (error) {
      logError(error, {
        functionName,
        requestId,
        metadata: {
          duration: Date.now() - startTime,
          method: req.method,
          url: req.url,
        },
      });

      // Re-throw to let the edge function handle the error response
      throw error;
    }
  };
}

/**
 * Extract user context from Supabase auth
 */
export function extractUserContext(
  user: { id: string } | null,
  companyId?: string
): Partial<ErrorContext> {
  return {
    userId: user?.id,
    companyId,
  };
}
