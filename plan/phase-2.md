# Phase 2 — Admin Panel

> **Goal**: Build the operator admin interface for managing tenants, pages, themes, media, preview mode, content versioning, and tenant cloning.
>
> **Phase QA Criteria**: Log into `/admin`, create a new tenant with theme, add pages to it, upload media, preview draft pages, restore a content version, and clone a tenant — confirm everything renders correctly.
>
> **Parallelism**: 8 work streams after Step 2.1 (auth is a prerequisite).

---

## Step 2.1 — Admin Auth `[BLOCKING]`

### Task 2.1.1 — Create admin auth library
- Simple session-based auth: compare email/password against env vars (`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`)
- Use `bcrypt` for password hashing, HTTP-only cookie for session
- Files: `src/lib/auth/index.ts`
- **Unit tests** (`tests/unit/auth/auth.test.ts`):
  - `verifyCredentials` returns `true` for valid email + password combo
  - `verifyCredentials` returns `false` for wrong password
  - `verifyCredentials` returns `false` for wrong email
  - `createSession` returns a session token string
  - `validateSession` returns `true` for a valid, unexpired token
  - `validateSession` returns `false` for an invalid/tampered token

### Task 2.1.2 — Create admin login page
- Form with email + password fields, POST to auth API
- Files: `src/app/admin/login/page.tsx`
- Depends on: `2.1.1`
- Testing covered by Phase 2 Playwright tests

### Task 2.1.3 — Create admin auth API route
- POST `/api/admin/auth` — validates creds, sets session cookie
- DELETE `/api/admin/auth` — clears session (logout)
- Files: `src/app/api/admin/auth/route.ts`
- Depends on: `2.1.1`
- **Unit tests** (`tests/unit/api/admin/auth.test.ts` — using Next.js route handler test pattern):
  - POST with valid creds returns 200 and `Set-Cookie` header
  - POST with invalid creds returns 401, no cookie set
  - POST with missing fields returns 400
  - DELETE returns 200 and clears the session cookie

### Task 2.1.4 — Create rate limiting middleware
- In-memory sliding window rate limiter keyed by IP address
- Configurable per-route: window size (ms), max requests per window
- Default config: login endpoint gets strict limits (e.g., 5 attempts per 60s), other admin APIs get moderate limits (e.g., 60 requests per 60s)
- Returns `429 Too Many Requests` with `Retry-After` header when exceeded
- Files: `src/lib/rate-limit/index.ts`
- Depends on: `2.1.1`
- **Unit tests** (`tests/unit/rate-limit/rate-limit.test.ts`):
  - Allows requests under the limit
  - Returns 429 when limit is exceeded within the window
  - Resets after the window expires
  - Tracks limits per IP independently (IP A's requests don't affect IP B)
  - Returns a `Retry-After` header with the correct remaining seconds

### Task 2.1.5 — Apply rate limiter to auth API route
- Apply strict rate limiting to `POST /api/admin/auth` (login)
- Files: update `src/app/api/admin/auth/route.ts`
- Depends on: `2.1.4` (rate limiter)
- **Unit tests** (update `tests/unit/api/admin/auth.test.ts`):
  - Rapid repeated POST requests from the same IP return 429 after exceeding the limit

### Task 2.1.6 — Create admin layout with auth protection
- Admin layout checks for valid session, redirects to login if missing
- Sidebar navigation: Tenants, (later: per-tenant sub-nav)
- Files: `src/app/admin/layout.tsx`, `src/components/admin/Sidebar.tsx`
- Depends on: `2.1.3`
- Testing covered by Phase 2 Playwright tests

---

## Step 2.2 — Tenant CRUD API `[DEV-1]` `[PARALLEL with 2.3, 2.4, 2.5, 2.6]`

### Task 2.2.1 — Tenant list API endpoint
- GET `/api/admin/tenants` → returns paginated tenants
- Accepts `?limit=&offset=` query params, defaults to `limit: 50, offset: 0`
- Response shape: `{ data: Tenant[], total: number }`
- Files: `src/app/api/admin/tenants/route.ts`
- Depends on: `2.1.6`

### Task 2.2.2 — Tenant create API endpoint
- POST `/api/admin/tenants` → validates input, creates tenant, returns tenant
- Files: update `src/app/api/admin/tenants/route.ts`
- Depends on: `2.2.1`

### Task 2.2.3 — Tenant update API endpoint
- PUT `/api/admin/tenants/[id]` → updates tenant fields
- Files: `src/app/api/admin/tenants/[id]/route.ts`
- Depends on: `2.2.1`

### Task 2.2.4 — Tenant delete API endpoint
- DELETE `/api/admin/tenants/[id]` → soft or hard deletes tenant + cascade
- Files: update `src/app/api/admin/tenants/[id]/route.ts`
- Depends on: `2.2.3`

**Unit tests for all of Step 2.2** (`tests/unit/api/admin/tenants.test.ts`):
- GET returns JSON object with `data` array and `total` count; requires auth cookie (401 without)
- GET with `?limit=2` returns at most 2 tenants in `data`
- GET with `?offset=1` skips the first tenant
- GET returns correct `total` regardless of limit/offset
- POST with valid body creates tenant, returns 201 with tenant object
- POST with duplicate slug returns 409
- POST with missing required fields returns 400
- PUT with valid body returns 200, fields updated in DB
- PUT with non-existent ID returns 404
- DELETE removes tenant and cascades to pages; returns 200
- DELETE with non-existent ID returns 404

---

## Step 2.3 — Tenant Admin UI `[DEV-2]` `[PARALLEL with 2.2, 2.4, 2.5, 2.6]`

### Task 2.3.1 — Tenant dashboard page (list all tenants)
- Table/card view of tenants with name, slug, domain, status
- Link to create new tenant
- Files: `src/app/admin/page.tsx` (or `src/app/admin/tenants/page.tsx`)
- Depends on: `2.1.6`
- Testing covered by Phase 2 Playwright tests

### Task 2.3.2 — Create tenant form page
- Form: name, slug (auto-generated from name), custom domain (optional)
- Submit calls tenant create API
- Files: `src/app/admin/tenants/new/page.tsx`, `src/components/admin/TenantForm.tsx`
- Depends on: `2.3.1`
- Testing covered by Phase 2 Playwright tests

### Task 2.3.3 — Edit tenant detail page
- Pre-filled form for existing tenant, save calls update API
- Tabs or sections for: Basic Info, Domain Settings
- Files: `src/app/admin/tenants/[id]/page.tsx`
- Depends on: `2.3.1`
- Testing covered by Phase 2 Playwright tests

---

## Step 2.4 — Page CRUD (API + UI) `[DEV-3]` `[PARALLEL with 2.2, 2.3, 2.5, 2.6]`

### Task 2.4.1 — Pages list/create/update/delete API
- CRUD endpoints under `/api/admin/pages`
- All scoped to a tenant_id query param
- GET accepts `?tenantId=&limit=&offset=` — returns `{ data: Page[], total: number }`
- Files: `src/app/api/admin/pages/route.ts`, `src/app/api/admin/pages/[id]/route.ts`
- Depends on: `2.1.6`
- **Unit tests** (`tests/unit/api/admin/pages.test.ts`):
  - GET with `tenantId` returns pages for that tenant only
  - GET with `limit` and `offset` paginates results correctly
  - GET returns correct `total` count regardless of limit/offset
  - POST creates page with correct tenant FK, returns 201
  - PUT updates page content and title
  - DELETE removes page, returns 200
  - All endpoints return 401 without auth cookie

### Task 2.4.1b — Page reorder API endpoint
- PUT `/api/admin/pages/reorder` — body: `{ tenantId, pages: Array<{ id, sort_order }> }`
- Calls `reorderPages()` query function to update `sort_order` for multiple pages in a single call
- Files: update `src/app/api/admin/pages/route.ts` (or `src/app/api/admin/pages/reorder/route.ts`)
- Depends on: `2.4.1`
- **Unit tests** (add to `tests/unit/api/admin/pages.test.ts`):
  - PUT `/reorder` with valid body updates `sort_order` for all specified pages
  - PUT `/reorder` with non-existent page ID returns 404
  - PUT `/reorder` returns 401 without auth cookie
  - After reorder, GET pages returns them in the new sort order

### Task 2.4.2 — Pages list UI for a tenant
- Lists all pages for a selected tenant, shows slug, title, published status, sort order
- Add/delete buttons
- **Drag-to-reorder**: pages can be reordered via drag-and-drop (or up/down arrows). Reorder calls `reorderPages()` query via API to persist new `sort_order` values.
- Files: `src/app/admin/tenants/[id]/pages/page.tsx`
- Depends on: `2.4.1`
- Testing covered by Phase 2 Playwright tests

### Task 2.4.3 — Page editor UI (JSON tree editor)
- JSON editor for the page `content` field
- Start with a code editor (e.g., Monaco or CodeMirror) that validates JSON
- Title and slug fields above the editor
- Save button calls update API
- Files: `src/app/admin/tenants/[id]/pages/[pageId]/page.tsx`, `src/components/admin/PageEditor.tsx`
- Depends on: `2.4.2`
- Testing covered by Phase 2 Playwright tests

### Task 2.4.4 — New page creation UI
- Form with title, slug, initial content template
- Files: `src/app/admin/tenants/[id]/pages/new/page.tsx`
- Depends on: `2.4.2`
- Testing covered by Phase 2 Playwright tests

---

## Step 2.5 — Theme Editor `[DEV-4]` `[PARALLEL with 2.2, 2.3, 2.4, 2.6]`

### Task 2.5.1 — Theme editor component
- Color pickers for each theme color (primary, secondary, accent, background, text)
- Font family selectors (dropdown of common web fonts)
- Logo/favicon URL inputs (later: upload picker)
- Border radius slider
- Files: `src/components/admin/ThemeEditor.tsx`
- Depends on: `2.1.6`
- Testing covered by Phase 2 Playwright tests

### Task 2.5.2 — Integrate theme editor into tenant detail page
- Add theme editor section/tab to tenant edit page
- Save updates tenant's `theme` JSONB via API
- Files: update `src/app/admin/tenants/[id]/page.tsx`
- Depends on: `2.5.1`, `2.3.3`
- Testing covered by Phase 2 Playwright tests

---

## Step 2.6 — Media Library (S3 Integration) `[DEV-5]` `[PARALLEL with 2.2, 2.3, 2.4, 2.5]`

### Task 2.6.1 — S3 client library
- Initialize S3 client (AWS SDK v3), support MinIO endpoint
- Functions: `uploadFile(tenantId, file)`, `deleteFile(key)`, `getPresignedUrl(key)`
- Files: `src/lib/s3/client.ts`
- Depends on: Phase 1
- **Unit tests** (`tests/unit/s3/client.test.ts` — runs against MinIO in Docker):
  - `uploadFile` uploads a buffer and returns an S3 key
  - `uploadFile` namespaces the key under `tenantId/`
  - `deleteFile` removes the object (subsequent GET returns 404)
  - `getPresignedUrl` returns a URL string that can be fetched to retrieve the file

### Task 2.6.2 — Add MinIO to Docker Compose
- MinIO service with default credentials, bucket auto-creation
- Env vars: `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
- Files: update `docker-compose.yml`, update `.env.example`
- Depends on: Phase 1
- QA: `docker compose up minio` starts, MinIO console accessible at `:9001`

### Task 2.6.3 — Media upload API endpoint
- POST `/api/admin/media` — accepts multipart form data, uploads to S3, saves media record
- GET `/api/admin/media?tenantId=&limit=&offset=` — lists media for tenant, paginated
- Response shape: `{ data: Media[], total: number }`
- DELETE `/api/admin/media/[id]` — deletes from S3 + DB
- Files: `src/app/api/admin/media/route.ts`, `src/app/api/admin/media/[id]/route.ts`
- Depends on: `2.6.1`, `2.6.2`
- **Unit tests** (`tests/unit/api/admin/media.test.ts`):
  - POST with multipart file returns 201, media record in DB, object in S3
  - GET returns paginated media for tenant with `data` array and `total` count
  - GET with `limit` and `offset` paginates results correctly
  - DELETE removes DB record and S3 object
  - All endpoints return 401 without auth

### Task 2.6.4 — Media library UI
- Grid view of uploaded media for a tenant
- Upload button (drag-and-drop or file picker)
- Click to copy URL, delete button
- Files: `src/app/admin/tenants/[id]/media/page.tsx`, `src/components/admin/MediaLibrary.tsx`
- Depends on: `2.6.3`
- Testing covered by Phase 2 Playwright tests

---

## Step 2.7 — Preview / Draft Mode `[DEV-3]` `[PARALLEL with 2.2–2.6]`

### Task 2.7.1 — Preview token generation and validation
- Admin can generate a short-lived preview token (JWT or signed URL) for a specific page
- `generatePreviewToken(pageId): string` — returns a token valid for e.g. 1 hour
- `validatePreviewToken(token): { pageId, tenantId } | null`
- Files: `src/lib/preview/index.ts`
- Depends on: `2.1.1`
- **Unit tests** (`tests/unit/preview/preview.test.ts`):
  - `generatePreviewToken` returns a non-empty string
  - `validatePreviewToken` returns page/tenant IDs for a valid token
  - `validatePreviewToken` returns null for an expired token
  - `validatePreviewToken` returns null for a tampered token

### Task 2.7.2 — Preview API endpoint
- GET `/api/admin/preview?pageId=...` — generates a preview token and redirects to the tenant page with `?preview=<token>` query param
- Files: `src/app/api/admin/preview/route.ts`
- Depends on: `2.7.1`
- **Unit tests** (`tests/unit/api/admin/preview.test.ts`):
  - GET with valid `pageId` and auth returns 302 redirect with `?preview=` param
  - GET without auth returns 401
  - GET with non-existent `pageId` returns 404

### Task 2.7.3 — Tenant page route handles preview mode
- When `?preview=<token>` is present in the URL, validate the token and render the page even if `published=false`
- Show a "Preview Mode" banner at the top of the page so the operator knows they're in preview
- Files: update `src/app/(tenant)/[[...slug]]/page.tsx`
- Depends on: `2.7.2`
- Testing covered by Phase 2 Playwright tests

### Task 2.7.4 — Add "Preview" button to page editor
- Button in the page editor UI that opens the page in a new tab with a preview token
- Works for both published and unpublished pages
- Files: update `src/app/admin/tenants/[id]/pages/[pageId]/page.tsx`
- Depends on: `2.7.3`, `2.4.3`
- Testing covered by Phase 2 Playwright tests

---

## Step 2.8 — Content Versioning `[DEV-4]` `[PARALLEL with 2.2–2.7]`

### Task 2.8.1 — Create page_versions table schema
- `page_versions` table: `id` (UUID), `page_id` (FK), `content` (JSONB), `title`, `created_at`, `created_by` (optional)
- Each save in the page editor creates a new version row before overwriting the page's `content`
- Keep last N versions per page (configurable, default 10)
- Files: `src/lib/db/schema/page-versions.ts`, update `src/lib/db/schema/index.ts`
- Depends on: Phase 1
- QA: Migration runs, table exists in DB

### Task 2.8.2 — Version query functions
- `createVersion(pageId, content, title)` — called before every page update
- `getVersionsByPage(pageId, opts?)` — returns versions ordered by `created_at` desc, paginated
- `getVersion(versionId)` — returns a single version
- `pruneVersions(pageId, keepCount)` — deletes old versions beyond the keep limit
- Files: `src/lib/db/queries/page-versions.ts`
- Depends on: `2.8.1`
- **Unit tests** (`tests/unit/db/queries/page-versions.test.ts`):
  - `createVersion` inserts a version row with correct page FK
  - `getVersionsByPage` returns versions newest-first
  - `getVersionsByPage` with `limit` paginates correctly
  - `pruneVersions` keeps only the specified number of most recent versions
  - `getVersion` returns the correct version by ID

### Task 2.8.3 — Integrate versioning into page update API
- Before updating a page's content, save the current content as a new version
- After saving, prune old versions
- Add GET `/api/admin/pages/[id]/versions` — lists versions for a page
- Add GET `/api/admin/pages/[id]/versions/[versionId]` — returns a specific version's content
- Add POST `/api/admin/pages/[id]/versions/[versionId]/restore` — restores a version (copies its content to the page, creating a new version of the current state first)
- Files: update `src/app/api/admin/pages/[id]/route.ts`, `src/app/api/admin/pages/[id]/versions/route.ts`, `src/app/api/admin/pages/[id]/versions/[versionId]/route.ts`
- Depends on: `2.8.2`, `2.4.1`
- **Unit tests** (`tests/unit/api/admin/page-versions.test.ts`):
  - PUT page creates a version of the old content before updating
  - GET versions returns list of versions for the page
  - GET single version returns the version content
  - POST restore copies version content to the page and creates a version of the pre-restore state
  - All endpoints return 401 without auth

### Task 2.8.4 — Version history UI in page editor
- "Version History" panel/drawer in the page editor showing recent versions with timestamps
- Click a version to preview its content in the editor (diff view or side-by-side optional)
- "Restore" button to revert to a selected version
- Files: `src/components/admin/VersionHistory.tsx`, update `src/app/admin/tenants/[id]/pages/[pageId]/page.tsx`
- Depends on: `2.8.3`, `2.4.3`
- Testing covered by Phase 2 Playwright tests

---

## Step 2.9 — Tenant Cloning / Templates `[DEV-5]` `[PARALLEL with 2.2–2.8]`

### Task 2.9.1 — Clone tenant API
- POST `/api/admin/tenants/[id]/clone` — body: `{ name, slug }`
- Duplicates the source tenant's theme, all pages (with content), and addon configs
- Does NOT clone media files (references the same S3 URLs) or blog posts
- Returns the newly created tenant
- Files: `src/app/api/admin/tenants/[id]/clone/route.ts`
- Depends on: `2.2.1`, `2.4.1`
- **Unit tests** (`tests/unit/api/admin/tenant-clone.test.ts`):
  - POST creates a new tenant with the specified name and slug
  - Cloned tenant has the same theme JSONB as the source
  - Cloned tenant has the same number of pages with identical content
  - Cloned tenant has its own independent page records (editing clone doesn't affect source)
  - Cloned tenant has the same addon configs
  - POST with duplicate slug returns 409
  - POST without auth returns 401

### Task 2.9.2 — Clone tenant UI
- "Clone" button on the tenant detail page
- Opens a dialog/form to enter new tenant name and slug
- Calls clone API and redirects to the new tenant's detail page on success
- Files: update `src/app/admin/tenants/[id]/page.tsx`
- Depends on: `2.9.1`, `2.3.3`
- Testing covered by Phase 2 Playwright tests

### Task 2.9.3 — Starter templates seed
- Seed a set of "template" tenants (e.g., "Starter - Restaurant", "Starter - Agency", "Starter - Portfolio") with pre-built pages, theme, and component trees
- Template tenants are marked with a flag (e.g., `is_template: true`) so they appear in a "Start from template" picker in the create tenant flow
- Files: `src/lib/db/seeds/templates.ts`, update `src/lib/db/schema/tenants.ts` (add `is_template` boolean column)
- Depends on: `2.9.1`
- QA: Templates visible in admin, cloning a template produces a working tenant

---

## Step 2.10 — Phase 2 QA

### Task 2.10.1 — Write and pass all Phase 2 unit tests

Run every unit test from Steps 2.1–2.9. All must pass.

- `tests/unit/auth/auth.test.ts`
- `tests/unit/rate-limit/rate-limit.test.ts`
- `tests/unit/api/admin/auth.test.ts`
- `tests/unit/api/admin/tenants.test.ts`
- `tests/unit/api/admin/pages.test.ts`
- `tests/unit/api/admin/media.test.ts`
- `tests/unit/s3/client.test.ts`
- `tests/unit/preview/preview.test.ts`
- `tests/unit/api/admin/preview.test.ts`
- `tests/unit/db/queries/page-versions.test.ts`
- `tests/unit/api/admin/page-versions.test.ts`
- `tests/unit/api/admin/tenant-clone.test.ts`
- **Run**: `npm test`
- **Pass criteria**: All tests green. Zero failures.

### Task 2.10.2 — Write Playwright E2E tests for admin auth flow

File: `tests/e2e/phase2-admin-auth.spec.ts`

**Test cases**:

1. **Unauthenticated access redirects to login**
   - Navigate to `http://localhost:3000/admin`
   - Assert: URL is redirected to `/admin/login`
   - Assert: login form is visible with email and password fields

2. **Login with invalid credentials shows error**
   - Navigate to `/admin/login`
   - Fill in wrong email/password
   - Click submit
   - Assert: error message is visible (e.g., "Invalid credentials")
   - Assert: URL remains on `/admin/login`

3. **Login with valid credentials redirects to dashboard**
   - Navigate to `/admin/login`
   - Fill in correct email/password (from env vars)
   - Click submit
   - Assert: URL navigates to `/admin` (dashboard)
   - Assert: sidebar navigation is visible
   - Assert: tenant list or dashboard content is visible

4. **Logout clears session**
   - Log in (reuse helper)
   - Click logout button/link
   - Assert: redirected to `/admin/login`
   - Navigate to `/admin` directly
   - Assert: redirected to `/admin/login` again (session cleared)

### Task 2.10.3 — Write Playwright E2E tests for tenant CRUD workflow

File: `tests/e2e/phase2-tenant-crud.spec.ts`

**Prerequisites**: Authenticated admin session (use Playwright `storageState` or login helper in `beforeEach`).

**Test cases**:

1. **Dashboard lists existing tenants**
   - Navigate to `/admin`
   - Assert: seeded "Demo Business" tenant is visible with its slug and name

2. **Create a new tenant**
   - Click "Create tenant" link/button
   - Assert: navigated to new tenant form
   - Fill in name: "Test Business", custom domain left blank
   - Assert: slug field auto-populates with "test-business"
   - Click submit
   - Assert: redirected to dashboard or tenant detail
   - Assert: "Test Business" now appears in the tenant list

3. **Edit an existing tenant**
   - Click on "Test Business" in the list to go to its detail page
   - Change name to "Updated Business"
   - Click save
   - Assert: success feedback shown
   - Navigate back to dashboard
   - Assert: "Updated Business" appears in the list

4. **Delete a tenant**
   - Click delete on "Updated Business"
   - Assert: confirmation dialog or action
   - Confirm delete
   - Assert: "Updated Business" no longer appears in the list

### Task 2.10.4 — Write Playwright E2E tests for page CRUD workflow

File: `tests/e2e/phase2-page-crud.spec.ts`

**Prerequisites**: Authenticated, seeded demo tenant exists.

**Test cases**:

1. **Pages list shows existing pages**
   - Navigate to `/admin/tenants/{demoTenantId}/pages`
   - Assert: seeded homepage is visible in the list

2. **Create a new page**
   - Click "New page" button
   - Fill in title: "About Us", slug: "about"
   - Enter valid JSON content in the editor (e.g., `{ "type": "Heading", "props": { "level": 1, "text": "About Us" } }`)
   - Click save
   - Assert: redirected to pages list
   - Assert: "About Us" page appears in the list

3. **Edit a page and verify on tenant site**
   - Click on "About Us" to open the editor
   - Change the heading text in the JSON to "About Our Company"
   - Click save
   - Assert: success feedback
   - Open new tab: navigate to `http://demo.localhost:3000/about`
   - Assert: page displays "About Our Company" heading

4. **Delete a page**
   - Navigate to pages list
   - Delete the "About Us" page
   - Assert: page removed from the list
   - Navigate to `http://demo.localhost:3000/about`
   - Assert: returns 404

### Task 2.10.5 — Write Playwright E2E tests for theme editor

File: `tests/e2e/phase2-theme-editor.spec.ts`

**Prerequisites**: Authenticated, demo tenant exists.

**Test cases**:

1. **Theme editor displays current values**
   - Navigate to `/admin/tenants/{demoTenantId}` (detail page)
   - Assert: theme editor section is visible
   - Assert: primary color picker shows the seeded primary color value

2. **Change theme and verify on tenant site**
   - Change primary color to a new value (e.g., `#FF0000`)
   - Click save
   - Assert: success feedback
   - Navigate to `http://demo.localhost:3000/`
   - Use `page.evaluate()` to read `getComputedStyle(document.documentElement).getPropertyValue('--color-primary')`
   - Assert: value matches the new color (`#FF0000` or its rgb equivalent)

### Task 2.10.6 — Write Playwright E2E tests for media library

File: `tests/e2e/phase2-media-library.spec.ts`

**Prerequisites**: Authenticated, demo tenant exists, MinIO running.

**Test cases**:

1. **Media library page loads**
   - Navigate to `/admin/tenants/{demoTenantId}/media`
   - Assert: media library UI is visible (grid area, upload button)

2. **Upload an image**
   - Click upload button or trigger file input
   - Upload a test image file (include a small PNG fixture in `tests/fixtures/test-image.png`)
   - Assert: image appears in the media grid after upload completes
   - Assert: image thumbnail is visible

3. **Copy media URL**
   - Click the copy URL button/action on the uploaded image
   - Assert: clipboard contains a URL (or toast shows the URL)

4. **Delete media**
   - Click delete on the uploaded image
   - Confirm deletion
   - Assert: image no longer appears in the grid

### Task 2.10.7 — Write Playwright E2E test for full admin-to-tenant workflow

File: `tests/e2e/phase2-full-workflow.spec.ts`

**End-to-end integration test covering the complete workflow**:

1. Log in to admin
2. Create a new tenant "Workflow Test" with a custom theme (primary: `#336699`)
3. Create a homepage for the tenant with JSON content containing a Heading + Button
4. Upload an image via the media library
5. Navigate to `http://workflow-test.localhost:3000/`
6. Assert: page renders the heading text from the JSON
7. Assert: button is visible with correct label
8. Assert: `--color-primary` CSS variable matches `#336699`
9. Assert: page is SSR (HTML source contains the heading text)

### Task 2.10.8 — Write Playwright E2E tests for preview / draft mode

File: `tests/e2e/phase2-preview-mode.spec.ts`

**Prerequisites**: Authenticated admin, demo tenant with at least one unpublished (draft) page.

**Test cases**:

1. **Preview button generates working preview link**
   - Navigate to page editor for a draft page
   - Click "Preview" button
   - Assert: new tab opens with the page rendered (including draft content)
   - Assert: "Preview Mode" banner is visible at the top of the page

2. **Draft page is not visible without preview token**
   - Navigate directly to the draft page's tenant URL (no `?preview=` param)
   - Assert: returns 404

3. **Preview token expires**
   - Generate a preview link
   - (Simulate expiry or use a very short TTL in test config)
   - Navigate to the preview URL with an expired token
   - Assert: returns 404 or "Preview expired" message

### Task 2.10.9 — Write Playwright E2E tests for content versioning

File: `tests/e2e/phase2-content-versioning.spec.ts`

**Prerequisites**: Authenticated admin, demo tenant with a page that has been edited at least twice.

**Test cases**:

1. **Version history shows previous versions**
   - Navigate to page editor
   - Open version history panel
   - Assert: at least one previous version is listed with a timestamp

2. **Preview a previous version**
   - Click on a previous version in the history
   - Assert: editor shows the old content (or a preview of it)

3. **Restore a previous version**
   - Click "Restore" on a previous version
   - Assert: page content reverts to the selected version
   - Assert: a new version is created for the pre-restore state
   - Navigate to the tenant page
   - Assert: page displays the restored content

### Task 2.10.10 — Write Playwright E2E tests for tenant cloning

File: `tests/e2e/phase2-tenant-clone.spec.ts`

**Prerequisites**: Authenticated admin, demo tenant with theme, pages, and addon configs.

**Test cases**:

1. **Clone a tenant**
   - Navigate to demo tenant detail page
   - Click "Clone" button
   - Fill in name: "Cloned Business", slug: "cloned-business"
   - Submit
   - Assert: redirected to new tenant's detail page
   - Assert: new tenant has the same theme colors as the source

2. **Cloned tenant has independent pages**
   - Navigate to cloned tenant's pages list
   - Assert: same number of pages as the source tenant
   - Edit a page on the cloned tenant
   - Navigate to the source tenant's corresponding page
   - Assert: source page is unchanged (clone is independent)

3. **Cloned tenant site renders correctly**
   - Navigate to `http://cloned-business.localhost:3000/`
   - Assert: page renders with the same content as the source homepage
   - Assert: theme CSS variables match the source tenant's theme

4. **Start from template**
   - Navigate to create tenant page
   - Assert: template picker shows available templates (if seeded)
   - Select a template
   - Assert: new tenant form pre-fills or clones from the selected template

- **Run**: `npx playwright test tests/e2e/phase2-*.spec.ts`
- **Pass criteria**: All tests across all 9 spec files pass.
