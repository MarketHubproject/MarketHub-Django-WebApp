/**
 * Centralized logger utility for consistent logging throughout the app
 * Use this instead of direct console.warn/console.error calls
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

class Logger {
  private level: LogLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.WARN;
  private context: LogContext = {};

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Set global context that will be included in all logs
   */
  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear global context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Log debug messages (development only)
   */
  debug(message: string, data?: any, context?: LogContext): void {
    if (this.level <= LogLevel.DEBUG) {
      this.log("DEBUG", message, data, context);
    }
  }

  /**
   * Log info messages
   */
  info(message: string, data?: any, context?: LogContext): void {
    if (this.level <= LogLevel.INFO) {
      this.log("INFO", message, data, context);
    }
  }

  /**
   * Log warning messages (replaces console.warn)
   */
  warn(message: string, data?: any, context?: LogContext): void {
    if (this.level <= LogLevel.WARN) {
      this.log("WARN", message, data, context);
    }
  }

  /**
   * Log error messages (replaces console.error)
   */
  error(message: string, error?: Error | any, context?: LogContext): void {
    if (this.level <= LogLevel.ERROR) {
      this.log("ERROR", message, error, context);
    }
  }

  /**
   * Internal logging method
   */
  private log(
    level: string,
    message: string,
    data?: any,
    context?: LogContext
  ): void {
    const timestamp = new Date().toISOString();
    const mergedContext = { ...this.context, ...context };

    // Create formatted message
    const prefix = `[${timestamp}] [${level}]`;
    const contextInfo =
      Object.keys(mergedContext).length > 0
        ? ` [${JSON.stringify(mergedContext)}]`
        : "";
    const fullMessage = `${prefix}${contextInfo} ${message}`;

    // Use appropriate console method based on level
    switch (level) {
      case "DEBUG":
      case "INFO":
        console.log(fullMessage, data || "");
        break;
      case "WARN":
        console.warn(fullMessage, data || "");
        break;
      case "ERROR":
        console.error(fullMessage, data || "");
        break;
    }

    // In production, you could send logs to a remote service here
    if (!__DEV__ && (level === "ERROR" || level === "WARN")) {
      this.sendToRemoteLogging(level, message, data, mergedContext);
    }
  }

  /**
   * Send logs to remote logging service (placeholder for production)
   */
  private sendToRemoteLogging(
    level: string,
    message: string,
    data?: any,
    context?: LogContext
  ): void {
    // In a real app, this would send logs to services like:
    // - Sentry, Bugsnag, LogRocket, etc.
    // For now, this is just a placeholder
    // Example implementation:
    // try {
    //   LoggingService.send({
    //     level,
    //     message,
    //     data,
    //     context,
    //     timestamp: new Date().toISOString(),
    //     platform: Platform.OS,
    //     appVersion: DeviceInfo.getVersion(),
    //   });
    // } catch (err) {
    //   // Fail silently for logging errors
    // }
  }

  /**
   * Create a scoped logger with predefined context
   */
  scope(context: LogContext): Logger {
    const scopedLogger = new Logger();
    scopedLogger.level = this.level;
    scopedLogger.context = { ...this.context, ...context };
    return scopedLogger;
  }

  /**
   * Log API errors with standardized format
   */
  apiError(
    method: string,
    url: string,
    status?: number,
    error?: any,
    context?: LogContext
  ): void {
    const apiContext = {
      ...context,
      component: context?.component || "API",
      action: `${method} ${url}`,
      metadata: {
        ...context?.metadata,
        status,
        url,
        method,
      },
    };

    this.error(`API request failed: ${method} ${url}`, error, apiContext);
  }

  /**
   * Log network connectivity errors
   */
  networkError(message: string, error?: any, context?: LogContext): void {
    const networkContext = {
      ...context,
      component: context?.component || "Network",
      action: "connectivity_check",
    };

    this.error(`Network error: ${message}`, error, networkContext);
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
export { Logger, LogLevel };
export type { LogContext };
