import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import morgan from 'morgan';

import { env } from './config/env';
import { stream, logger } from './config/logger';
import { metricsMiddleware } from './config/metrics';
import routes from './routes';
import healthRoutes from './routes/health.routes';
import { buildAdminRouter } from './admin/setup';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimiter';

const app: Application = express();

// Required so secure cookies / rate-limit IPs work behind a reverse proxy.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// AdminJS panel — mounted at its rootPath BEFORE helmet so its
// content-security-policy doesn't block the admin UI assets. Mounting at
// admin.options.rootPath scopes the router (and its session + auth guard) to
// /admin only, so the JSON API and health routes are untouched. AdminJS builds
// routes relative to rootPath, so it MUST be mounted this way.
// Optional: a failure here never blocks the API. Skipped under test (its dev
// bundler leaves open handles that would hang the jest run).
if (env.nodeEnv !== 'test') {
  try {
    const { admin, router: adminRouter } = buildAdminRouter();
    app.use(admin.options.rootPath, adminRouter);
  } catch (err) {
    logger.error('Failed to mount AdminJS panel', err);
  }
}

// Security headers (incl. HSTS in production)
app.use(
  helmet({
    hsts: env.isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'no-referrer' },
  })
);

// CORS — explicit allowlist, credentials enabled for the refresh cookie
app.use(
  cors({
    origin: env.clientUrl.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

// Body & cookie parsing (bounded to mitigate large-payload DoS)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// NoSQL-injection & HTTP-parameter-pollution protection
app.use(mongoSanitize());
app.use(hpp());

app.use(compression());

// HTTP access logging via Morgan → Winston
app.use(morgan(env.isProduction ? 'combined' : 'dev', { stream }));

// In-process request metrics
app.use(metricsMiddleware);

// Global rate limiting
app.use(globalLimiter);

// Health / readiness / metrics (unversioned, for orchestrators & scrapers)
app.use('/health', healthRoutes);

// Versioned API
app.use(env.apiPrefix, routes);

// 404 + centralized error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
