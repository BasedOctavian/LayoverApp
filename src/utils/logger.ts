/**
 * Centralized Logging Utility
 * Provides safe logging that only outputs in development mode
 * In production, can be extended to send to a logging service
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
  enableConsole: boolean;
  enableRemote: boolean;
  minLevel: LogLevel;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const config: LogConfig = {
  enableConsole: __DEV__,
  enableRemote: !__DEV__,
  minLevel: __DEV__ ? 'debug' : 'warn',
};

/**
 * Send log to remote logging service (placeholder for future implementation)
 */
const sendToRemoteLogger = async (
  level: LogLevel,
  message: string,
  data?: any
): Promise<void> => {
  // TODO: Implement remote logging service (e.g., Sentry, LogRocket, Firebase Crashlytics)
  // For now, this is a no-op
  if (config.enableRemote && LOG_LEVELS[level] >= LOG_LEVELS.error) {
    // Only log errors to remote in production
    // await crashlytics().log(`[${level.toUpperCase()}] ${message}`);
  }
};

/**
 * Main logging function
 */
const log = (level: LogLevel, message: string, data?: any): void => {
  if (LOG_LEVELS[level] < LOG_LEVELS[config.minLevel]) {
    return;
  }

  if (config.enableConsole) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'debug':
        console.log(prefix, message, data || '');
        break;
      case 'info':
        console.info(prefix, message, data || '');
        break;
      case 'warn':
        console.warn(prefix, message, data || '');
        break;
      case 'error':
        console.error(prefix, message, data || '');
        break;
    }
  }

  // Send to remote logger if enabled
  if (config.enableRemote) {
    sendToRemoteLogger(level, message, data).catch(() => {
      // Silently fail if remote logging fails
    });
  }
};

/**
 * Logger utility with typed methods
 */
export const Logger = {
  debug: (message: string, data?: any) => log('debug', message, data),
  info: (message: string, data?: any) => log('info', message, data),
  warn: (message: string, data?: any) => log('warn', message, data),
  error: (message: string, data?: any) => log('error', message, data),
  
  /**
   * Log an error with stack trace
   */
  exception: (error: Error, context?: string) => {
    const message = context ? `${context}: ${error.message}` : error.message;
    log('error', message, {
      stack: error.stack,
      name: error.name,
    });
  },
};

/**
 * Performance logging utility
 */
export const PerformanceLogger = {
  start: (label: string): (() => void) => {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      Logger.debug(`Performance: ${label}`, { duration: `${duration}ms` });
    };
  },
};

export default Logger;

