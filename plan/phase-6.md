# Phase 6 — Production Readiness

> **Goal**: Docker production config, reverse proxy with auto-SSL, monitoring, and documentation.
>
> **Phase QA Criteria**: `docker compose -f docker-compose.prod.yml up` on a fresh machine serves tenant sites over HTTPS with custom domain support.
>
> **Parallelism**: 3 streams.

---

## Step 6.1 — Docker Production Config `[DEV-1]` `[PARALLEL with 6.2, 6.3]`

### Task 6.1.1 — Create production Dockerfile
- Multi-stage build: install deps → build Next.js → slim runtime image
- Files: `Dockerfile`
- Depends on: Phase 5
- QA: `docker build .` succeeds, image runs Next.js app

### Task 6.1.2 — Create production Docker Compose
- Services: app (built image), db (Postgres with volume), minio, caddy
- Environment variable configuration
- Files: `docker-compose.prod.yml`
- Depends on: `6.1.1`
- QA: `docker compose -f docker-compose.prod.yml up` starts all services

### Task 6.1.3 — Database migration on startup
- Entrypoint script or init container that runs Drizzle migrations before app starts
- Files: update `Dockerfile` or add `scripts/migrate.sh`
- Depends on: `6.1.2`
- QA: Fresh DB → container starts → tables created automatically

---

## Step 6.2 — Reverse Proxy & SSL `[DEV-2]` `[PARALLEL with 6.1, 6.3]`

### Task 6.2.1 — Caddyfile for wildcard + custom domains
- Wildcard config for `*.platform.com`
- On-demand TLS for custom domains
- Proxy to Next.js app container
- Files: `Caddyfile`
- Depends on: Phase 5
- QA: Caddy starts, proxies requests to app, auto-provisions SSL

### Task 6.2.2 — Document DNS setup for custom domains
- Instructions for clients: CNAME record pointing to platform
- Admin UI shows DNS instructions per tenant
- Files: update `README.md`
- Depends on: `6.2.1`
- QA: Following instructions results in working custom domain

---

## Step 6.3 — Monitoring & Ops `[DEV-3]` `[PARALLEL with 6.1, 6.2]`

### Task 6.3.1 — Health check endpoint
- GET `/api/health` — checks DB connection, returns 200/503
- Files: `src/app/api/health/route.ts`
- Depends on: Phase 1
- **Unit tests** (`tests/unit/api/health.test.ts`):
  - Returns 200 with `{ status: "ok" }` when DB is reachable
  - Returns 503 with `{ status: "error" }` when DB connection fails

### Task 6.3.2 — Docker health checks
- Add health check directives to Docker Compose services
- Files: update `docker-compose.prod.yml`
- Depends on: `6.3.1`
- QA: `docker compose ps` shows health status, unhealthy triggers restart

### Task 6.3.3 — Backup strategy documentation
- Document: DB pg_dump schedule, S3 bucket replication/backup
- Files: `plan/ops-runbook.md`
- Depends on: Phase 5
- QA: Runbook covers backup, restore, and disaster recovery steps

---

## Step 6.4 — Phase 6 QA

### Task 6.4.1 — Write and pass Phase 6 unit tests

- `tests/unit/api/health.test.ts`
- **Run**: `npm test`
- **Pass criteria**: All tests green.

### Task 6.4.2 — Write Playwright E2E tests for health and production readiness

File: `tests/e2e/phase6-production.spec.ts`

**Test cases**:

1. **Health check endpoint returns 200**
   - Fetch `GET /api/health`
   - Assert: response status is 200
   - Assert: response body contains `{ "status": "ok" }` (or similar)

2. **Health check returns 503 on DB failure**
   - (Optional / manual test) — Stop the DB container, hit `/api/health`
   - Assert: response status is 503
   - Restart DB container to restore

### Task 6.4.3 — Write Playwright E2E smoke test for production Docker build

File: `tests/e2e/phase6-docker-smoke.spec.ts`

> This test runs against the production Docker Compose stack. It validates the same core user-facing behaviors work in the production build.

**Prerequisites**: `docker compose -f docker-compose.prod.yml up` is running. DB has been seeded.

**Test cases**:

1. **Tenant site renders via production build**
   - Navigate to `http://demo.localhost` (or the production URL)
   - Assert: page renders with seeded content (heading, text)
   - Assert: HTML source contains SSR content

2. **Admin panel is accessible**
   - Navigate to admin login URL
   - Assert: login form is visible

3. **Health endpoint responds**
   - Fetch `/api/health`
   - Assert: response status 200

4. **Sitemap is accessible**
   - Fetch `/sitemap.xml` for the demo tenant
   - Assert: valid XML response

### Task 6.4.4 — Full regression: run all unit tests and all Playwright tests

This is the final gate. **Every test across all phases must pass.**

- **Run**: `npm test` (all unit tests)
- **Run**: `npx playwright test` (all E2E tests)
- **Pass criteria**: Zero failures across the entire test suite.
- **Checklist**:
  - [ ] All Phase 0 unit + E2E tests pass
  - [ ] All Phase 1 unit + E2E tests pass
  - [ ] All Phase 2 unit + E2E tests pass
  - [ ] All Phase 3 unit + E2E tests pass
  - [ ] All Phase 4 unit + E2E tests pass
  - [ ] All Phase 5 unit + E2E tests pass
  - [ ] All Phase 6 unit + E2E tests pass
  - [ ] Production Docker build starts and serves content
