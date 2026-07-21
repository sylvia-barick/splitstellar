import { logger } from "./logger";
import * as Sentry from "@sentry/nextjs";

export interface ErrorReport {
  id: string;
  source: "frontend" | "backend" | "wallet" | "rpc" | "soroban";
  error: string;
  stack?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

class ErrorMonitor {
  private errors: ErrorReport[] = [];

  public captureException(
    err: unknown,
    source: "frontend" | "backend" | "wallet" | "rpc" | "soroban" = "frontend",
    metadata?: Record<string, unknown>
  ): ErrorReport {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;

    const report: ErrorReport = {
      id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      source,
      error: errorMsg,
      stack,
      timestamp: new Date().toISOString(),
      metadata,
    };

    this.errors.unshift(report);
    if (this.errors.length > 100) this.errors.pop();

    logger.error(`Sentry:${source}`, errorMsg, metadata);

    // Capture exception using real Sentry SDK
    Sentry.withScope((scope) => {
      scope.setTag("source", source);
      if (metadata) {
        scope.setExtras(metadata);
      }
      if (err instanceof Error) {
        Sentry.captureException(err);
      } else {
        Sentry.captureMessage(errorMsg, {
          level: "error",
        });
      }
    });

    return report;
  }

  public getRecentErrors(): ErrorReport[] {
    return this.errors;
  }
}

export const errorMonitor = new ErrorMonitor();

