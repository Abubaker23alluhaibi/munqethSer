/**
 * Logger موحد للـ Backend
 * يخفي console logs في production mode تلقائياً
 * 
 * الاستخدام:
 * const logger = require('./utils/logger');
 * 
 * logger.debug('Debug message');  // يظهر فقط في development
 * logger.info('Info message');    // يظهر فقط في development
 * logger.warn('Warning message'); // يظهر في development و production
 * logger.error('Error message');  // يظهر في development و production
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

class Logger {
  /**
   * Debug log - يظهر فقط في development
   */
  debug(...args) {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  }

  /**
   * Info log - يظهر فقط في development
   */
  info(...args) {
    if (isDevelopment) {
      console.log('[INFO]', ...args);
    }
  }

  /**
   * Warning log - يظهر في development و production
   */
  warn(...args) {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    } else {
      // في production، نطبع warnings فقط كـ console.log بسيط
      console.log('[WARN]', ...args);
    }
  }

  /**
   * Error log - يظهر دائماً (في development و production)
   */
  error(...args) {
    if (isDevelopment) {
      console.error('[ERROR]', ...args);
    } else {
      // في production، نطبع errors دائماً
      console.error('[ERROR]', ...args);
    }
  }

  /**
   * Success log - يظهر فقط في development
   */
  success(...args) {
    if (isDevelopment) {
      console.log('[SUCCESS]', ...args);
    }
  }

  /**
   * Log with custom prefix - يظهر فقط في development
   */
  log(prefix, ...args) {
    if (isDevelopment) {
      console.log(`[${prefix}]`, ...args);
    }
  }
}

// Export singleton instance
module.exports = new Logger();


