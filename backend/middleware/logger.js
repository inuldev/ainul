import fs from "fs";
import path from "path";

// Create logs directory if it doesn't exist (skip in production)
const logsDir = path.join(process.cwd(), "logs");
if (process.env.NODE_ENV !== "production" && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || "INFO";
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta,
    };
    return JSON.stringify(logEntry) + "\n";
  }

  writeToFile(filename, content) {
    // Skip file writing in serverless environment
    if (process.env.NODE_ENV === "production") {
      return;
    }
    const filePath = path.join(logsDir, filename);
    fs.appendFileSync(filePath, content);
  }

  shouldLog(level) {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.logLevel];
  }

  error(message, meta = {}) {
    if (this.shouldLog("ERROR")) {
      const logMessage = this.formatMessage("ERROR", message, meta);
      console.error(logMessage.trim());
      this.writeToFile("error.log", logMessage);
      this.writeToFile("combined.log", logMessage);
    }
  }

  warn(message, meta = {}) {
    if (this.shouldLog("WARN")) {
      const logMessage = this.formatMessage("WARN", message, meta);
      console.warn(logMessage.trim());
      this.writeToFile("combined.log", logMessage);
    }
  }

  info(message, meta = {}) {
    if (this.shouldLog("INFO")) {
      const logMessage = this.formatMessage("INFO", message, meta);
      console.log(logMessage.trim());
      this.writeToFile("combined.log", logMessage);
    }
  }

  debug(message, meta = {}) {
    if (this.shouldLog("DEBUG")) {
      const logMessage = this.formatMessage("DEBUG", message, meta);
      console.log(logMessage.trim());
      this.writeToFile("debug.log", logMessage);
      this.writeToFile("combined.log", logMessage);
    }
  }
}

const logger = new Logger();

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, url, ip, headers } = req;

  // Log request
  logger.info("Incoming request", {
    method,
    url,
    ip,
    userAgent: headers["user-agent"],
    timestamp: new Date().toISOString(),
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - start;
    const { statusCode } = res;

    // Log response
    logger.info("Request completed", {
      method,
      url,
      ip,
      statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    // Log errors
    if (statusCode >= 400) {
      logger.warn("Request failed", {
        method,
        url,
        ip,
        statusCode,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
    }

    originalEnd.apply(this, args);
  };

  next();
};

// Error logging middleware
export const errorLogger = (err, req, res, next) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === "development";

  res.status(500).json({
    success: false,
    message: "Internal server error",
    ...(isDevelopment && { error: err.message, stack: err.stack }),
  });
};

// Assistant interaction logger
export const assistantLogger = {
  logCommand: (userId, command, response, duration) => {
    logger.info("Assistant command processed", {
      userId,
      command: command.substring(0, 100), // Limit command length in logs
      responseType: response.type,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  },

  logError: (userId, command, error) => {
    logger.error("Assistant command failed", {
      userId,
      command: command.substring(0, 100),
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  },

  logGeminiCall: (command, success, duration, retryCount = 0) => {
    logger.info("Gemini API call", {
      command: command.substring(0, 50),
      success,
      duration: `${duration}ms`,
      retryCount,
      timestamp: new Date().toISOString(),
    });
  },
};

export default logger;
