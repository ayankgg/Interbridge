import { Request, Response, NextFunction } from 'express';

/**
 * Lightweight, dependency-free in-process metrics. For multi-instance
 * deployments scrape these per-pod or swap this module for prom-client.
 */
interface RouteStat {
  count: number;
  totalMs: number;
  errors: number;
}

const startedAt = Date.now();
let totalRequests = 0;
let totalErrors = 0;
const byStatus: Record<string, number> = {};
const byRoute = new Map<string, RouteStat>();

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    totalRequests += 1;

    const statusBucket = `${Math.floor(res.statusCode / 100)}xx`;
    byStatus[statusBucket] = (byStatus[statusBucket] ?? 0) + 1;
    if (res.statusCode >= 500) totalErrors += 1;

    // Use the matched route template to avoid unbounded label cardinality.
    const route = `${req.method} ${req.route?.path ?? req.baseUrl ?? 'unmatched'}`;
    const stat = byRoute.get(route) ?? { count: 0, totalMs: 0, errors: 0 };
    stat.count += 1;
    stat.totalMs += durationMs;
    if (res.statusCode >= 500) stat.errors += 1;
    byRoute.set(route, stat);
  });
  next();
}

export function getMetricsSnapshot() {
  const routes = [...byRoute.entries()]
    .map(([route, s]) => ({
      route,
      count: s.count,
      avgMs: Number((s.totalMs / s.count).toFixed(2)),
      errors: s.errors,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  return {
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    totalRequests,
    totalErrors,
    byStatus,
    memoryMb: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(1)),
    topRoutes: routes,
  };
}
