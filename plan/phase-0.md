# Phase 0 — Thin Slice: "Hello World from JSON"

> **Goal**: Prove the full pipeline end-to-end: `HTTP request → resolve tenant → fetch JSON from DB → render component tree → SSR HTML response`. One developer can complete this in ~1 day. Everything else builds on this.
>
> **Phase QA Criteria**: Run `docker compose up`, visit `http://demo.localhost:3000`, see a styled "Hello World" page whose content was stored as JSON in PostgreSQL.

---

## Step 0.1 — Project Scaffolding `[BLOCKING]`

### Task 0.1.1 — Initialize Next.js project
- Run `create-next-app` with TypeScript, Tailwind, App Router, `src/` directory
- Files: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`
- QA: `npm run dev` starts without errors, browser shows default Next.js page

### Task 0.1.2 — Add Docker Compose for dev environment
- PostgreSQL 16 container with volume, port 5432
- `.env.example` with `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/flightapp`
- Files: `docker-compose.yml`, `.env.example`, `.gitignore` (add `.env`)
- Depends on: `0.1.1`
- QA: `docker compose up db` starts Postgres, `psql` can connect

### Task 0.1.3 — Install and configure Drizzle ORM
- Install `drizzle-orm`, `drizzle-kit`, `postgres` (driver)
- Create Drizzle config and client
- Files: `drizzle.config.ts`, `src/lib/db/index.ts`
- Depends on: `0.1.2`
- QA: `npx drizzle-kit generate` runs without errors

### Task 0.1.4 — Install and configure test infrastructure
- Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `playwright`, `@playwright/test`
- Create `vitest.config.ts` with path aliases matching `tsconfig.json`
- Create `playwright.config.ts` with `baseURL: 'http://localhost:3000'`, projects for chromium
- Add npm scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:e2e": "playwright test"`, `"test:e2e:ui": "playwright test --ui"`
- Create directories: `tests/unit/`, `tests/e2e/`
- Create a trivial passing unit test (`tests/unit/smoke.test.ts`) and Playwright test (`tests/e2e/smoke.spec.ts`) to validate both runners work
- Files: `vitest.config.ts`, `playwright.config.ts`, `tests/unit/smoke.test.ts`, `tests/e2e/smoke.spec.ts`, update `package.json`
- Depends on: `0.1.1`
- QA: `npm test` runs and passes. `npx playwright test` runs and passes.

---

## Step 0.2 — Minimal Schema & Seed `[BLOCKING]`

### Task 0.2.1 — Create tenants table schema
- Drizzle schema for `tenants` table: `id` (UUID), `name`, `slug` (unique), `custom_domain` (unique nullable), `theme` (JSONB), `created_at`, `updated_at`
- Skip `enabled_addons` for now
- Files: `src/lib/db/schema/tenants.ts`, `src/lib/db/schema/index.ts`
- Depends on: `0.1.3`
- QA: Schema file exports valid Drizzle table definition, TypeScript compiles

### Task 0.2.2 — Create pages table schema
- Drizzle schema for `pages` table: `id` (UUID), `tenant_id` (FK), `slug`, `title`, `content` (JSONB), `published` (bool), `sort_order`, `created_at`, `updated_at`
- Skip `meta` JSONB for now
- Files: `src/lib/db/schema/pages.ts` (update `index.ts`)
- Depends on: `0.2.1`
- QA: Schema compiles, FK relationship to tenants is correct

### Task 0.2.3 — Run first migration
- Generate and apply migration for tenants + pages
- Depends on: `0.2.2`
- QA: `npx drizzle-kit push` (or generate+migrate) creates tables in Postgres, visible via `psql \dt`

### Task 0.2.4 — Create seed script with demo tenant + page
- Seed: 1 tenant (`slug: "demo"`, `name: "Demo Business"`, minimal theme)
- Seed: 1 page (`slug: ""` (homepage), title: "Hello World", content: simple component tree with `Heading` + `Text`)
- **Incremental seed pattern**: create a seed runner (`src/lib/db/seed.ts`) that calls phase-specific seed modules. Phase 0 seed (`src/lib/db/seeds/phase-0.ts`) only uses `Heading` + `Text`. Later phases add their own seed modules that layer on additional components without blocking on unfinished work.
- Files: `src/lib/db/seed.ts`, `src/lib/db/seeds/phase-0.ts`
- Depends on: `0.2.3`
- QA: Run `npx tsx src/lib/db/seed.ts`, query DB shows tenant and page rows

---

## Step 0.3 — Minimal Rendering Pipeline `[BLOCKING]`

### Task 0.3.1 — Define ComponentNode TypeScript type
- `type ComponentNode = { type: string; props?: Record<string, unknown>; children?: ComponentNode[] }`
- Files: `src/lib/types/component.ts`, `src/lib/types/index.ts`
- Depends on: `0.1.1`
- QA: Type compiles, can type a sample JSON tree without errors

### Task 0.3.2 — Create component registry with Heading and Text
- Registry: `Record<string, React.ComponentType<any>>`
- **Auto-discovery pattern**: each component directory (`content/`, `layout/`, `interactive/`) exports its own partial registry map via a barrel file (`index.ts`). The top-level `registry.ts` merges them (`{ ...contentRegistry, ...layoutRegistry, ...interactiveRegistry }`). This avoids merge conflicts when multiple devs add components simultaneously.
- `Heading` component: renders `<h1>`–`<h6>` based on `level` prop, displays `text` prop
- `Text` component: renders `<p>` with `content` prop
- Files: `src/components/cms/content/Heading.tsx`, `src/components/cms/content/Text.tsx`, `src/components/cms/content/index.ts` (barrel), `src/components/cms/registry.ts`
- Depends on: `0.3.1`
- **Unit tests** (`tests/unit/components/heading.test.tsx`, `tests/unit/components/text.test.tsx`):
  - Heading: renders correct tag level (`<h1>` through `<h6>`) based on `level` prop
  - Heading: renders `text` prop as text content
  - Heading: defaults to `<h1>` when no `level` provided
  - Text: renders `<p>` tag with `content` prop as text content
  - Registry: `registry["Heading"]` and `registry["Text"]` return defined React components
  - Registry: unknown key returns `undefined`

### Task 0.3.3 — Create renderComponentTree function
- Recursive function: takes `ComponentNode` + registry → React element
- Handles: missing type (skip with console.warn), props passthrough, recursive children
- **Structural validation on each node before rendering**:
  - `type` must be a non-empty string — skip node with warning if missing or wrong type
  - `props` must be a plain object if present — skip node with warning if it's a string, number, or array
  - `children` must be an array if present — skip node with warning if it's a string, object, or number
  - Validation errors in a child node must not crash the parent — siblings continue rendering
- Files: `src/lib/renderer/index.ts`
- Depends on: `0.3.1`, `0.3.2`
- **Unit tests** (`tests/unit/renderer/render-component-tree.test.tsx`):
  - Renders a single node (Heading) to correct HTML string
  - Renders nested tree (Section > Heading + Text) with correct parent/child structure
  - Skips unknown component types without crashing (returns null, logs warning)
  - Passes props through to the component
  - Handles empty children array
  - Handles node with no props
  - Handles deeply nested tree (3+ levels)
  - **Malformed JSON resilience**:
    - Node missing `type` field entirely → skips node, logs warning, does not crash
    - Node with `type: null` or `type: 123` → skips node, logs warning
    - Node with `props` as a string instead of object → skips node, logs warning
    - Node with `props` as an array instead of object → skips node, logs warning
    - Node with `children` as a string instead of array → skips node, logs warning
    - Node with `children` as an object instead of array → skips node, logs warning
    - Sibling nodes render normally when one sibling has malformed structure
    - Parent renders normally when one deeply nested child (3+ levels) is malformed
    - Completely empty object `{}` as a node → skips, does not crash
    - `null` or `undefined` in children array → skips that entry, renders other children

---

## Step 0.4 — Tenant Resolution & SSR Page `[BLOCKING]`

### Task 0.4.1 — Create resolveTenant utility
- `resolveTenant(hostname: string): Promise<Tenant | null>`
- Logic: check `custom_domain` first, then parse subdomain from hostname and match `slug`
- Files: `src/lib/tenant/resolve.ts`
- Depends on: `0.2.3`
- **Unit tests** (`tests/unit/tenant/resolve.test.ts`):
  - Returns tenant when hostname matches `custom_domain` field
  - Returns tenant when subdomain portion of hostname matches `slug`
  - Returns `null` when no tenant matches hostname
  - Custom domain match takes priority over slug match
  - Handles `localhost` subdomains (e.g., `demo.localhost` → slug `demo`)
  - Handles bare hostname with no subdomain (e.g., `localhost`) → returns null or platform root

### Task 0.4.2 — Create Next.js middleware for tenant resolution
- Extract hostname from `request.headers`, call `resolveTenant`, store tenant ID in request header (e.g., `x-tenant-id`) for downstream use
- If no tenant found, rewrite to a 404 page
- Files: `src/middleware.ts`
- Depends on: `0.4.1`
- Testing covered by E2E tests in Step 0.5 (middleware is best tested via real HTTP requests)

### Task 0.4.3 — Create tenant page route with SSR rendering
- Catch-all route `(tenant)/[[...slug]]/page.tsx`
- Server component: read tenant ID from headers, fetch tenant + page from DB, render component tree
- Tenant layout `(tenant)/layout.tsx`: basic HTML wrapper
- Files: `src/app/(tenant)/[[...slug]]/page.tsx`, `src/app/(tenant)/layout.tsx`
- Depends on: `0.4.2`, `0.3.3`, `0.2.4`
- Testing covered by E2E tests in Step 0.5

### Task 0.4.4 — Create basic not-found page
- Next.js `not-found.tsx` inside the `(tenant)` route group
- Displays a simple "Page not found" message with a link back to the homepage
- Used when: unknown tenant (middleware rewrite), unknown page slug (`notFound()` call from page route)
- Files: `src/app/(tenant)/not-found.tsx`
- Depends on: `0.4.3`
- Testing covered by E2E tests in Step 0.5

---

## Step 0.5 — Phase 0 QA `[BLOCKING]`

> **Test files**: `tests/e2e/phase0-tenant-rendering.spec.ts`
>
> **Prerequisites**: Docker Compose services running, DB seeded with demo tenant + homepage.

### Task 0.5.1 — Write and pass unit tests for Phase 0

Run all unit tests created in prior steps. Every test must pass.

- `tests/unit/components/heading.test.tsx`
- `tests/unit/components/text.test.tsx`
- `tests/unit/renderer/render-component-tree.test.tsx`
- `tests/unit/tenant/resolve.test.ts`
- **Run**: `npm test`
- **Pass criteria**: All tests pass. Zero failures.

### Task 0.5.2 — Write Playwright E2E tests for tenant page rendering

File: `tests/e2e/phase0-tenant-rendering.spec.ts`

**Test cases**:

1. **Valid tenant homepage renders SSR content**
   - Navigate to `http://demo.localhost:3000/`
   - Assert: page returns HTTP 200
   - Assert: page contains an `<h1>` (or appropriate heading) with text "Hello World"
   - Assert: page contains a `<p>` tag with the expected body text from the seed
   - Assert: view page source (or `page.content()`) contains the heading text (confirming SSR, not client-only rendering)

2. **Unknown tenant returns 404 with not-found page**
   - Navigate to `http://nonexistent.localhost:3000/`
   - Assert: page returns HTTP 404
   - Assert: page displays "Page not found" message
   - Assert: does NOT render the demo tenant's content

3. **Unknown page slug returns 404 with not-found page**
   - Navigate to `http://demo.localhost:3000/does-not-exist`
   - Assert: page returns HTTP 404
   - Assert: page displays "Page not found" message with a link to the homepage

- **Run**: `npx playwright test tests/e2e/phase0-tenant-rendering.spec.ts`
- **Pass criteria**: All 3 tests pass.
