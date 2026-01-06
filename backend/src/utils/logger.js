// Production-friendly logging utility
const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = {
  info: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    const logData = {
      level: 'INFO',
      timestamp,
      message,
      ...meta,
    };
    console.log(JSON.stringify(logData));
  },

  error: (message, error = null, meta = {}) => {
    const timestamp = new Date().toISOString();
    const logData = {
      level: 'ERROR',
      timestamp,
      message,
      error: error ? {
        message: error.message,
        stack: isDevelopment ? error.stack : undefined,
        ...error,
      } : undefined,
      ...meta,
    };
    console.error(JSON.stringify(logData));
  },

  warn: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    const logData = {
      level: 'WARN',
      timestamp,
      message,
      ...meta,
    };
    console.warn(JSON.stringify(logData));
  },

  debug: (message, meta = {}) => {
    if (isDevelopment) {
      const timestamp = new Date().toISOString();
      const logData = {
        level: 'DEBUG',
        timestamp,
        message,
        ...meta,
      };
      console.log(JSON.stringify(logData));
    }
  },
};

module.exports = logger;
