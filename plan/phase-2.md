# Phase 2 — Admin Panel

> **Goal**: Build the operator admin interface for managing tenants, pages, themes, and media.
>
> **Phase QA Criteria**: Log into `/admin`, create a new tenant with theme, add pages to it, upload media, and confirm the tenant site renders correctly.
>
> **Parallelism**: 5 work streams after Step 2.1 (auth is a prerequisite).

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

### Task 2.1.4 — Create admin layout with auth protection
- Admin layout checks for valid session, redirects to login if missing
- Sidebar navigation: Tenants, (later: per-tenant sub-nav)
- Files: `src/app/admin/layout.tsx`, `src/components/admin/Sidebar.tsx`
- Depends on: `2.1.3`
- Testing covered by Phase 2 Playwright tests

---

## Step 2.2 — Tenant CRUD API `[DEV-1]` `[PARALLEL with 2.3, 2.4, 2.5, 2.6]`

### Task 2.2.1 — Tenant list API endpoint
- GET `/api/admin/tenants` → returns all tenants
- Files: `src/app/api/admin/tenants/route.ts`
- Depends on: `2.1.4`

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
- GET returns JSON array of tenants; requires auth cookie (401 without)
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
- Depends on: `2.1.4`
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
- Files: `src/app/api/admin/pages/route.ts`, `src/app/api/admin/pages/[id]/route.ts`
- Depends on: `2.1.4`
- **Unit tests** (`tests/unit/api/admin/pages.test.ts`):
  - GET with `tenantId` returns pages for that tenant only
  - POST creates page with correct tenant FK, returns 201
  - PUT updates page content and title
  - DELETE removes page, returns 200
  - All endpoints return 401 without auth cookie

### Task 2.4.2 — Pages list UI for a tenant
- Lists all pages for a selected tenant, shows slug, title, published status
- Add/delete buttons
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
- Depends on: `2.1.4`
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
- GET `/api/admin/media?tenantId=...` — lists media for tenant
- DELETE `/api/admin/media/[id]` — deletes from S3 + DB
- Files: `src/app/api/admin/media/route.ts`, `src/app/api/admin/media/[id]/route.ts`
- Depends on: `2.6.1`, `2.6.2`
- **Unit tests** (`tests/unit/api/admin/media.test.ts`):
  - POST with multipart file returns 201, media record in DB, object in S3
  - GET returns array of media for tenant
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

## Step 2.7 — Phase 2 QA

### Task 2.7.1 — Write and pass all Phase 2 unit tests

Run every unit test from Steps 2.1, 2.2, 2.4, 2.6. All must pass.

- `tests/unit/auth/auth.test.ts`
- `tests/unit/api/admin/auth.test.ts`
- `tests/unit/api/admin/tenants.test.ts`
- `tests/unit/api/admin/pages.test.ts`
- `tests/unit/api/admin/media.test.ts`
- `tests/unit/s3/client.test.ts`
- **Run**: `npm test`
- **Pass criteria**: All tests green. Zero failures.

### Task 2.7.2 — Write Playwright E2E tests for admin auth flow

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

### Task 2.7.3 — Write Playwright E2E tests for tenant CRUD workflow

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

### Task 2.7.4 — Write Playwright E2E tests for page CRUD workflow

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

### Task 2.7.5 — Write Playwright E2E tests for theme editor

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

### Task 2.7.6 — Write Playwright E2E tests for media library

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

### Task 2.7.7 — Write Playwright E2E test for full admin-to-tenant workflow

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

- **Run**: `npx playwright test tests/e2e/phase2-*.spec.ts`
- **Pass criteria**: All tests across all 6 spec files pass.
