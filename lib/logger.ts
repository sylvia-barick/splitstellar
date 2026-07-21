export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  context: string;
  message: string;
  data?: unknown;
}

class Logger {
  private format(entry: LogEntry): string {
    return `[${entry.timestamp}] [${entry.level}] [${entry.context}]: ${entry.message}`;
  }

  public info(context: string, message: string, data?: unknown) {
    const entry: LogEntry = {
      level: "INFO",
      timestamp: new Date().toISOString(),
      context,
      message,
      data,
    };
    console.log(this.format(entry), data ? data : "");
  }

  public warn(context: string, message: string, data?: unknown) {
    const entry: LogEntry = {
      level: "WARN",
      timestamp: new Date().toISOString(),
      context,
      message,
      data,
    };
    console.warn(this.format(entry), data ? data : "");
  }

  public error(context: string, message: string, data?: unknown) {
    const entry: LogEntry = {
      level: "ERROR",
      timestamp: new Date().toISOString(),
      context,
      message,
      data,
    };
    console.error(this.format(entry), data ? data : "");
  }

  public debug(context: string, message: string, data?: unknown) {
    if (process.env.NODE_ENV !== "production") {
      const entry: LogEntry = {
        level: "DEBUG",
        timestamp: new Date().toISOString(),
        context,
        message,
        data,
      };
      console.debug(this.format(entry), data ? data : "");
    }
  }
}

export const logger = new Logger();
