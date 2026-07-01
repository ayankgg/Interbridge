# InternBridge — Backend API

AI-powered internship discovery & matching platform. Node.js · Express · TypeScript · MongoDB · Mongoose · JWT · Cloudinary · Gemini.

## Quick Start

```bash
cd backend
cp .env.example .env          # fill in secrets
npm install
npm run seed                  # optional: demo data
npm run dev                   # http://localhost:5000/api/v1
```

Production:

```bash
npm run build && npm start
```

Demo accounts (after `npm run seed`, password `Password123`):
`admin@internbridge.com` · `student@example.com` · `company@example.com`

## Architecture

```
Request → Helmet/CORS/Sanitize → RateLimit → Router
        → authenticate (JWT) → authorize (RBAC) → validate (Zod)
        → Controller → Service → Mongoose Model
        → ApiResponse → errorHandler
```

Layered: **routes → controllers → services → models**. Controllers stay thin; business logic lives in services; cross-cutting concerns are middleware.

## Folder Structure

```
src/
├── app.ts              Express app + global middleware
├── server.ts           Bootstrap, graceful shutdown
├── config/             env, db, logger, cloudinary, gemini
├── models/             Mongoose schemas (8 collections + ActivityLog)
├── middleware/         auth (JWT+RBAC), validate, errorHandler, rateLimiter, upload, requestLogger
├── validators/         Zod request schemas
├── services/           Business logic
├── controllers/        HTTP handlers
├── routes/             Route definitions
├── utils/              jwt, password, AppError, ApiResponse, matching, pagination
├── jobs/               cron jobs + seed
└── types/              shared enums + Express augmentation
```

## Authentication

- **Access token** — JWT, 15 min, sent in `Authorization: Bearer <token>`.
- **Refresh token** — JWT, 7 days, stored as an httpOnly cookie; hash persisted on the user; **rotated on every refresh** with reuse detection (revokes all sessions via `tokenVersion`).
- **bcrypt** hashing (configurable rounds). Reset tokens are single-use, hashed, 15 min TTL.

## Roles (RBAC)

`student` · `company` · `admin` — enforced by `authorize(...roles)` plus ownership/org scope checks inside services. Suspended/banned users are rejected and force-logged-out.

## API Reference (base `/api/v1`)

### Auth
| Method | Path | Access |
|---|---|---|
| POST | `/auth/register` | public |
| POST | `/auth/login` | public |
| POST | `/auth/refresh` | cookie |
| POST | `/auth/logout` | auth |
| POST | `/auth/forgot-password` | public |
| POST | `/auth/reset-password` | public |
| GET | `/auth/me` | auth |

### Students
| Method | Path | Access |
|---|---|---|
| GET/PUT | `/students/me` | student |
| POST | `/students/me/resume` | student (multipart `resume`) |
| GET | `/students/me/dashboard` | student |
| GET | `/students/me/applications` | student |
| GET/POST/DELETE | `/students/me/saved[/:internshipId]` | student |
| GET | `/students/me/recommendations` | student |
| GET | `/students/me/skill-gap` | student |

### Companies
| Method | Path | Access |
|---|---|---|
| GET | `/companies/:id` | public |
| GET/PUT | `/companies` | company |
| POST | `/companies/logo` | company (multipart `logo`) |
| POST | `/companies/verification` | company |
| GET | `/companies/me/analytics` | company |
| GET | `/companies/me/applicants` | company |

### Internships
| Method | Path | Access |
|---|---|---|
| GET | `/internships` | public — filters: `q, skills, city, remote, minStipend, year, company, sort, page, limit` |
| GET | `/internships/:id` | public |
| POST | `/internships` | company (verified) |
| PUT/DELETE | `/internships/:id` | owner/admin |
| POST | `/internships/:id/apply` | student |
| GET | `/internships/:id/applications` | owner/admin |

### Applications
| Method | Path | Access |
|---|---|---|
| GET | `/applications/me` | student |
| DELETE | `/applications/:id` | student (withdraw) |
| PATCH | `/applications/:id/status` | company/admin |
| POST | `/applications/:id/notes` | company/admin |

Statuses: `pending · shortlisted · rejected · hired · withdrawn`.

### AI (Gemini, with deterministic fallback)
| Method | Path | Access |
|---|---|---|
| GET | `/ai/match/:id` | student — resume↔internship match score |
| GET | `/ai/skill-gap` | student — `?role=` or `?internshipId=` |
| GET | `/ai/recommendations` | student |
| GET | `/ai/resume-feedback` | student |
| GET | `/ai/candidates/:id` | company/admin |

### Notifications
| Method | Path | Access |
|---|---|---|
| GET | `/notifications` | auth — `?unread=true` |
| PATCH | `/notifications/:id/read` | auth |
| PATCH | `/notifications/read-all` | auth |

### Admin
| Method | Path |
|---|---|
| GET | `/admin/users` · PATCH `/admin/users/:id/status` |
| GET | `/admin/companies/pending` · PATCH `/admin/companies/:id/verify` |
| PATCH | `/admin/internships/:id/moderate` |
| GET | `/admin/analytics` |

## Response Envelope

```jsonc
// success
{ "success": true, "data": {…}, "meta": { "page":1, "limit":20, "total":42, "totalPages":3 } }
// error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [...] } }
```

Error codes: `VALIDATION_ERROR(400) · UNAUTHENTICATED(401) · FORBIDDEN(403) · NOT_FOUND(404) · CONFLICT(409) · UNPROCESSABLE(422) · RATE_LIMITED(429) · INTERNAL(500) · AI_UNAVAILABLE(503)`.

## Security

Helmet · strict CORS allowlist · `express-mongo-sanitize` (NoSQL injection) · `hpp` · Zod validation on every endpoint · global + per-route rate limiting (auth & AI throttled harder) · bcrypt · JWT refresh rotation with reuse detection · file type/size validation on uploads · centralized error handling · structured Winston logging · audit logs for admin actions.

## AI Design

Each AI feature computes a **deterministic, explainable** result (skill coverage, proficiency fit, project relevance, eligibility) and optionally enriches it with a **Gemini**-generated explanation/learning path. If `GEMINI_API_KEY` is unset or the call fails, the system degrades gracefully to the deterministic output — AI is never on the critical path.

## Background Jobs

`node-cron`: hourly close of expired internships; daily deadline reminders for saved internships.

## Monitoring

| Path | Purpose |
|---|---|
| `GET /health/live` | Liveness (process up) |
| `GET /health/ready` | Readiness (pings MongoDB; `503` when not ready) |
| `GET /health/metrics` | Admin-only request/latency/error snapshot |

HTTP access logs via **Morgan → Winston**; in-process metrics in `src/config/metrics.ts`.

## Testing

```bash
npm test            # jest (unit + middleware/API contract) — 26 tests
npm run test:coverage
```

- `tests/unit/**` — pure logic (matching, completeness, pagination, JWT, hashing, XSS escaping).
- `tests/integration/**` — middleware chain, error envelope, validation, auth guard (DB-free).

## Documentation

- [docs/AUDIT.md](docs/AUDIT.md) — production-readiness audit, findings, scorecard.
- [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) — every env var explained.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Docker, K8s probes, CI, prod checklist.

## Project Structure Guide

```
src/
├── app.ts / server.ts      composition root + bootstrap
├── config/                 env, db, logger, cloudinary, gemini, metrics
├── models/                 Mongoose schemas (data shape + indexes)
├── repositories/           data-access layer (Repository Pattern)
├── services/               business logic (no HTTP, no raw queries where migrated)
├── controllers/            HTTP glue (req → service → response)
├── routes/                 endpoint wiring + middleware composition
├── middleware/             auth, validate, errorHandler, rateLimiter, csrf, upload
├── validators/             Zod request schemas (single source of input truth)
├── utils/                  pure helpers (jwt, password, matching, pagination, sanitize)
├── jobs/                   cron jobs + seed
└── types/                  shared enums + Express augmentation

tests/                      unit + integration
docs/                       audit, environment, deployment
```

Dependency rule: `routes → controllers → services → repositories → models`. Lower layers never import upper ones.
