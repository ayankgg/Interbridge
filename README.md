# InternBridge

**AI-powered internship discovery & matching platform.** InternBridge connects early-career students with companies through trajectory-aware matching, transparent skill-gap analysis, and an AI Resume Intelligence engine — built to serve the students most platforms filter out: 1st/2nd-year and beginners with potential but a thin résumé.

Full-stack TypeScript monorepo: an Express/MongoDB API and a Next.js 15 web app.

---

## ✨ Features

**Students**
- Profile, résumé upload, skills, projects, certifications, photo
- Internship search with rich filters, save/bookmark, one-click apply
- Application tracking, notifications, referrals
- **AI Resume Intelligence** — upload a PDF/DOCX and get an ATS-grade report: overall score, 17 scored dimensions, ATS checks, section analysis, skill categorization, keyword match, grammar review, prioritized fixes, version history + charts, and an AI rewrite
- Explainable match scores + skill-gap analysis + recommendations

**Companies**
- Company profile + verification workflow
- Post internships, applicant pipeline (Kanban), analytics
- Candidate recommendations, real-time chat, interview scheduling (.ics), issue certificates

**Admin**
- User management, company verification, moderation, reports, platform analytics, audit logs

**Platform**
- JWT auth (rotating refresh tokens + reuse detection), RBAC, rate limiting
- Real-time chat (Socket.IO), in-app + email notifications
- Security hardening (Helmet, CSRF guard, NoSQL-injection & XSS protection, magic-byte file validation)
- Structured logging, health/readiness/metrics endpoints, background jobs

---

## 🧱 Tech Stack

| Layer | Tech |
|---|---|
| **Backend** | Node.js, Express, TypeScript, MongoDB + Mongoose, Zod, JWT, Socket.IO, Winston |
| **Frontend** | Next.js 15, React 19, TanStack Query, Zustand, Tailwind CSS, shadcn/ui, Recharts |
| **AI** | Google Gemini (optional) with a comprehensive deterministic fallback engine |
| **Storage** | Cloudinary (optional) — résumé/image storage degrades gracefully if unset |
| **Testing** | Jest, Supertest (backend); Vitest, Testing Library (frontend) |

---

## 📁 Repository Structure

```
inter bridge/
├── backend/          Express + TypeScript API
│   ├── src/
│   │   ├── config/          env, db, logger, cloudinary, gemini, metrics
│   │   ├── models/          Mongoose schemas
│   │   ├── repositories/    data-access layer
│   │   ├── services/        business logic
│   │   ├── controllers/     HTTP handlers
│   │   ├── routes/          endpoint wiring
│   │   ├── middleware/      auth, validate, errorHandler, rateLimiter, csrf, upload
│   │   ├── validators/      Zod request schemas
│   │   ├── utils/           jwt, matching, resume parser & scoring engine, etc.
│   │   ├── jobs/            cron jobs + seed
│   │   └── socket/          real-time chat
│   ├── tests/               unit + integration
│   └── docs/                architecture, audit, deployment, SDP, roadmaps
└── frontend/         Next.js 15 web app
    ├── app/                 routes (auth, student, api)
    ├── components/          ui + shared + layout
    ├── features/            feature modules
    ├── services/ hooks/ store/ lib/ types/
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18
- **MongoDB** running locally (or a MongoDB Atlas connection string)

### 1. Backend

```bash
cd backend
cp .env.example .env          # then fill in values (see below)
npm install
npm run seed                  # optional: create demo data
npm run dev                   # → http://localhost:5000/api/v1
```

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install --legacy-peer-deps   # React 19 RC requires this flag
npm run dev                      # → http://localhost:3000
```

Open **http://localhost:3000**.

### Demo accounts (after `npm run seed`)
All use password **`Password123`**:

| Role | Email |
|---|---|
| Student | `student@example.com` |
| Company | `company@example.com` |
| Admin | `admin@internbridge.com` |

---

## 🔑 Environment Variables

The API validates required vars at boot and refuses to start in production with default secrets. Full reference: **[backend/docs/ENVIRONMENT.md](backend/docs/ENVIRONMENT.md)**.

Minimum to run locally (backend `.env`):

```env
MONGODB_URI=mongodb://127.0.0.1:27017/internbridge
JWT_ACCESS_SECRET=<random>
JWT_REFRESH_SECRET=<random>
JWT_RESET_SECRET=<random>
CLIENT_URL=http://localhost:3000
```

Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

**Optional (features degrade gracefully if unset):**
- `GEMINI_API_KEY` — unlocks AI narratives & résumé rewrite (otherwise the deterministic engine runs)
- `CLOUDINARY_*` — file/image storage (otherwise résumé analysis still works; avatars store inline)
- `SMTP_*` — real emails (otherwise emails are logged to the console)

Frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

---

## 🧪 Scripts

**Backend**
```bash
npm run dev          # dev server (nodemon + ts-node)
npm run build        # compile to dist/
npm start            # run compiled build
npm test             # jest
npm run seed         # seed demo data
```

**Frontend**
```bash
npm run dev          # next dev
npm run build        # next build
npm run type-check   # tsc --noEmit
npm test             # vitest
```

---

## 📚 Documentation

Detailed design & engineering docs live in [`backend/docs/`](backend/docs):

- **[V2-ROADMAP.md](backend/docs/V2-ROADMAP.md)** — feature designs & prioritization
- **[AUDIT.md](backend/docs/AUDIT.md)** — production-readiness audit & scorecard
- **[FINAL-REVIEW.md](backend/docs/FINAL-REVIEW.md)** — code review findings & fixes
- **[SDP.md](backend/docs/SDP.md)** — software development plan (milestones, sprints, git strategy)
- **[DEPLOYMENT.md](backend/docs/DEPLOYMENT.md)** — Docker, K8s probes, CI, prod checklist
- **[ENVIRONMENT.md](backend/docs/ENVIRONMENT.md)** — every env var explained

---

## 🗺️ Status

Actively developed. The backend is feature-complete and tested (45 tests); the frontend covers the full student portal with the AI Resume Intelligence dashboard. Company/admin portals and further polish are on the roadmap.

## 📄 License

MIT
