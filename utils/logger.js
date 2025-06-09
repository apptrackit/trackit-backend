const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  defaultMeta: { service: 'trackit-backend' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, service, stack }) => {
          const serviceTag = service ? `[${service}]` : '';
          const logMessage = stack || message;
          return `${timestamp} ${level} ${serviceTag} --- ${logMessage}`;
        })
      )
    })
  ]
});

module.exports = logger;