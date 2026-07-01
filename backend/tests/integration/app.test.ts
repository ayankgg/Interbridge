import request from 'supertest';
import app from '../../src/app';

/**
 * API/integration tests that exercise the full middleware chain
 * (helmet, cors, body parsing, validation, error handling) WITHOUT a
 * database — they target routes that short-circuit before any DB access.
 * DB-backed flows belong in a separate suite using mongodb-memory-server.
 */
describe('App middleware & error contract', () => {
  it('GET /health/live returns liveness', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, status: 'ok' });
  });

  it('unknown route returns the standard 404 error envelope', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects invalid register payload with 400 VALIDATION_ERROR (before DB)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: '123', role: 'student' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('rejects access to a protected route without a token (401)', async () => {
    const res = await request(app).get('/api/v1/students/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('sets security headers via helmet', async () => {
    const res = await request(app).get('/health/live');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('CSRF guard rejects /auth/refresh from a disallowed Origin (before DB)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', 'https://evil.example.com');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('CSRF guard allows /auth/refresh with no Origin (non-browser client)', async () => {
    // No Origin/Referer → treated as non-browser; passes CSRF, then fails auth
    // because no refresh cookie is present (401), proving it got past the guard.
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});
