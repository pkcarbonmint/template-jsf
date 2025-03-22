import winston from 'winston';

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'error', // Set initial level to error
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    // Uncomment to add file logging if needed
    // new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Add a simple way to enable/disable debug logs
let debugMode = false; // Track debug mode state

export function setDebugMode(enable: boolean): void {
  debugMode = enable;
  logger.level = enable ? 'debug' : 'info';
  logger.debug(`Debug mode set to ${enable}`);
}

export function isDebugMode(): boolean {
    return debugMode;
}

export default logger;
