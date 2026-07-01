import winston from 'winston';
import { env } from './env';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) => {
    return `${ts} [${level}]: ${stack || message}`;
  })
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
  // In development surface HTTP access logs; production honours LOG_LEVEL.
  level: env.isProduction ? env.logLevel : 'http',
  format: env.isProduction ? prodFormat : devFormat,
  defaultMeta: { service: 'internbridge-backend' },
  transports: [new winston.transports.Console()],
  exitOnError: false,
});

// Stream adapter so Morgan writes HTTP access logs through Winston.
export const stream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};

export default logger;
