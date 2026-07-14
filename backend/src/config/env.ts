import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
}

const IS_PRODUCTION = optional('NODE_ENV', 'development') === 'production';

/**
 * Secret resolver. In development a dev fallback is allowed for convenience,
 * but in production the variable MUST be set and MUST NOT equal the known dev
 * default — otherwise the app would boot with publicly-known signing keys,
 * enabling token forgery / admin takeover. Fail fast instead.
 */
function secret(key: string, devFallback: string): string {
  const value = process.env[key];
  if (IS_PRODUCTION) {
    if (!value || value === devFallback) {
      throw new Error(`Refusing to start: ${key} must be set to a strong, non-default value in production`);
    }
    return value;
  }
  return value && value !== '' ? value : devFallback;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  isProduction: IS_PRODUCTION,
  port: parseInt(optional('PORT', '5000'), 10),
  apiPrefix: optional('API_PREFIX', '/api/v1'),
  clientUrl: optional('CLIENT_URL', 'http://localhost:3000'),

  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/internbridge'),

  jwt: {
    accessSecret: secret('JWT_ACCESS_SECRET', 'dev_access_secret_change_me'),
    refreshSecret: secret('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me'),
    resetSecret: secret('JWT_RESET_SECRET', 'dev_reset_secret_change_me'),
    accessExpiresIn: optional('JWT_ACCESS_EXPIRES_IN', '15m'),
    refreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '7d'),
    resetExpiresIn: optional('JWT_RESET_EXPIRES_IN', '15m'),
  },

  bcryptSaltRounds: parseInt(optional('BCRYPT_SALT_ROUNDS', '12'), 10),

  cookie: {
    domain: optional('COOKIE_DOMAIN', 'localhost'),
    secure: optional('COOKIE_SECURE', 'false') === 'true',
  },

  cloudinary: {
    cloudName: optional('CLOUDINARY_CLOUD_NAME', ''),
    apiKey: optional('CLOUDINARY_API_KEY', ''),
    apiSecret: optional('CLOUDINARY_API_SECRET', ''),
    folder: optional('CLOUDINARY_FOLDER', 'internbridge'),
  },

  gemini: {
    apiKey: optional('GEMINI_API_KEY', ''),
    model: optional('GEMINI_MODEL', 'gemini-1.5-flash'),
  },

  smtp: {
    host: optional('SMTP_HOST', ''),
    port: parseInt(optional('SMTP_PORT', '587'), 10),
    secure: optional('SMTP_SECURE', 'false') === 'true',
    user: optional('SMTP_USER', ''),
    pass: optional('SMTP_PASS', ''),
    from: optional('EMAIL_FROM', 'InternBridge <no-reply@internbridge.com>'),
  },

  whatsapp: {
    accountSid: optional('TWILIO_ACCOUNT_SID', ''),
    authToken: optional('TWILIO_AUTH_TOKEN', ''),
    // Twilio WhatsApp sender, e.g. "whatsapp:+14155238886"
    fromNumber: optional('TWILIO_WHATSAPP_FROM', ''),
  },

  rateLimit: {
    windowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '900000'), 10),
    max: parseInt(optional('RATE_LIMIT_MAX', '200'), 10),
    authMax: parseInt(optional('AUTH_RATE_LIMIT_MAX', '20'), 10),
  },

  logLevel: optional('LOG_LEVEL', 'info'),

  // Run scheduled cron jobs on this instance. In multi-instance deployments set
  // this to 'true' on exactly ONE instance (or a dedicated worker) to avoid
  // duplicate notifications / double execution.
  enableScheduledJobs: optional('ENABLE_SCHEDULED_JOBS', 'true') === 'true',
};

export default env;
