# Phase 5 — SEO & Performance

> **Goal**: Per-tenant SEO features (sitemap, robots.txt, structured data, meta tags) and performance optimization.
>
> **Phase QA Criteria**: Lighthouse SEO score >90. Sitemap and robots.txt are valid. Pages cache correctly. Favicon and OG images served correctly.
>
> **Parallelism**: 4 streams.

---

## Step 5.1 — Page-Level SEO `[DEV-1]` `[PARALLEL with 5.2, 5.3, 5.4]`

### Task 5.1.1 — Page metadata via Next.js Metadata API
- Export `generateMetadata` from `(tenant)/[[...slug]]/page.tsx`
- Use page's `meta` JSONB: title, description, Open Graph tags
- Files: update `src/app/(tenant)/[[...slug]]/page.tsx`
- Depends on: Phase 2
- Testing covered by Phase 5 Playwright tests

### Task 5.1.2 — Canonical URL generation
- Set canonical URL based on tenant domain + page slug
- Files: update `src/app/(tenant)/[[...slug]]/page.tsx` metadata
- Depends on: `5.1.1`
- Testing covered by Phase 5 Playwright tests

### Task 5.1.3 — Favicon serving route
- Route handler at `(tenant)/favicon.ico/route.ts`
- Reads `favicon` URL from the tenant's `theme` JSONB and proxies/redirects to it
- Falls back to a default platform favicon if tenant has none set
- Files: `src/app/(tenant)/favicon.ico/route.ts`
- Depends on: Phase 1
- Testing covered by Phase 5 Playwright tests

### Task 5.1.4 — OG image generation/serving
- Route handler at `(tenant)/api/og/route.tsx`
- Uses `next/og` (Satori) to generate dynamic Open Graph images per page
- Includes tenant name, page title, and tenant logo from theme
- Falls back to a default OG image template if no page-specific data
- Pages reference this route via `meta.ogImage` or auto-generated URL in `generateMetadata`
- Files: `src/app/(tenant)/api/og/route.tsx`
- Depends on: `5.1.1`
- **Unit tests** (`tests/unit/seo/og-image.test.ts`):
  - Returns a PNG/image response with correct `Content-Type`
  - Accepts `title` and `tenant` query params
  - Returns a valid image response even with missing params (uses defaults)

---

## Step 5.2 — Sitemap & Robots `[DEV-2]` `[PARALLEL with 5.1, 5.3, 5.4]`

### Task 5.2.1 — Per-tenant sitemap.xml
- Route handler at `(tenant)/sitemap.xml/route.ts`
- Lists all published pages + blog posts for the tenant
- Files: `src/app/(tenant)/sitemap.xml/route.ts`
- Depends on: Phase 2
- **Unit tests** (`tests/unit/seo/sitemap.test.ts`):
  - Generated XML contains `<urlset>` root element
  - Each published page produces a `<url>` with `<loc>` and `<lastmod>`
  - Each published blog post produces a `<url>`
  - Unpublished/draft pages are excluded
  - Tenant with no published content produces valid XML with zero URLs

### Task 5.2.2 — Per-tenant robots.txt
- Route handler at `(tenant)/robots.txt/route.ts`
- Points to sitemap, standard allow/disallow rules
- Files: `src/app/(tenant)/robots.txt/route.ts`
- Depends on: Phase 2
- **Unit tests** (`tests/unit/seo/robots.test.ts`):
  - Output contains `User-agent: *`
  - Output contains `Allow: /`
  - Output contains `Sitemap:` directive pointing to tenant's sitemap URL
  - Output disallows `/admin` and `/api`

---

## Step 5.3 — Structured Data (SEO Add-on) `[DEV-3]` `[PARALLEL with 5.1, 5.2, 5.4]`

### Task 5.3.1 — JSON-LD injection for Organization schema
- SEO add-on injects `<script type="application/ld+json">` with Organization data from tenant config
- Files: `src/lib/addons/seo/index.ts`
- Depends on: Phase 4 (addon system)
- **Unit tests** (`tests/unit/addons/seo/organization-schema.test.ts`):
  - Generated JSON-LD has `@type: "Organization"`
  - Contains tenant name
  - Contains tenant URL
  - Contains logo URL when provided
  - Is valid JSON (parseable)

### Task 5.3.2 — JSON-LD for blog posts (Article schema)
- Inject Article structured data on blog post pages
- Files: update `src/app/(tenant)/blog/[slug]/page.tsx`
- Depends on: Phase 3
- **Unit tests** (`tests/unit/seo/article-schema.test.ts`):
  - Generated JSON-LD has `@type: "Article"`
  - Contains `headline` matching post title
  - Contains `author` matching post author
  - Contains `datePublished` matching post published date
  - Contains `description` matching post excerpt
  - Contains `image` when featured image is set

---

## Step 5.4 — Performance & Caching `[DEV-4]` `[PARALLEL with 5.1, 5.2, 5.3]`

### Task 5.4.1 — Add response caching headers
- Cache tenant pages with `Cache-Control` / `s-maxage` / `stale-while-revalidate`
- Files: update `src/app/(tenant)/[[...slug]]/page.tsx`, update `src/app/(tenant)/blog/[slug]/page.tsx`
- Depends on: Phase 2
- Testing covered by Phase 5 Playwright tests

### Task 5.4.2 — Add DB query caching via `unstable_cache` or fetch cache
- Cache tenant lookups and page queries with revalidation interval
- Files: update `src/lib/db/queries/tenants.ts`, `src/lib/db/queries/pages.ts`
- Depends on: Phase 1
- QA: Confirmed via query logging in Phase 5 integration tests

### Task 5.4.3 — On-demand revalidation API
- POST `/api/admin/revalidate` — purges cache for a tenant's pages when content is saved in admin
- Files: `src/app/api/admin/revalidate/route.ts`
- Depends on: `5.4.2`
- **Unit tests** (`tests/unit/api/admin/revalidate.test.ts`):
  - POST with valid `tenantId` returns 200
  - POST without auth returns 401
  - POST with missing `tenantId` returns 400

---

## Step 5.5 — Phase 5 QA

### Task 5.5.1 — Write and pass all Phase 5 unit tests

- `tests/unit/seo/sitemap.test.ts`
- `tests/unit/seo/robots.test.ts`
- `tests/unit/seo/og-image.test.ts`
- `tests/unit/addons/seo/organization-schema.test.ts`
- `tests/unit/seo/article-schema.test.ts`
- `tests/unit/api/admin/revalidate.test.ts`
- **Run**: `npm test`
- **Pass criteria**: All tests green.

### Task 5.5.2 — Write Playwright E2E tests for page-level SEO

File: `tests/e2e/phase5-page-seo.spec.ts`

**Prerequisites**: Demo tenant with pages that have `meta` JSONB populated (title, description, OG tags).

**Test cases**:

1. **Page has correct title tag**
   - Navigate to `http://demo.localhost:3000/` (homepage)
   - Assert: `<title>` matches the page's meta title (or falls back to page title)

2. **Page has meta description**
   - Assert: `<meta name="description" content="...">` is present
   - Assert: content matches the page's `meta.description`

3. **Page has Open Graph tags**
   - Assert: `<meta property="og:title">` is present with correct value
   - Assert: `<meta property="og:description">` is present
   - Assert: `<meta property="og:image">` is present if page has `meta.ogImage`
   - Assert: `<meta property="og:type">` is `"website"`

4. **Page has canonical URL**
   - Assert: `<link rel="canonical" href="...">` is present
   - Assert: `href` matches expected URL (tenant domain + page slug)

5. **Favicon is served per tenant**
   - Fetch `http://demo.localhost:3000/favicon.ico`
   - Assert: response status 200
   - Assert: response `Content-Type` is an image type (e.g., `image/x-icon`, `image/png`)
   - Assert: response is not empty

6. **OG image is generated per page**
   - Fetch `http://demo.localhost:3000/api/og?title=Hello+World`
   - Assert: response status 200
   - Assert: response `Content-Type` is `image/png`
   - Assert: response body is non-empty (valid image data)
   - Assert: page's `<meta property="og:image">` points to the OG image route

### Task 5.5.3 — Write Playwright E2E tests for sitemap and robots.txt

File: `tests/e2e/phase5-sitemap-robots.spec.ts`

**Prerequisites**: Demo tenant with published pages and blog posts.

**Test cases**:

1. **Sitemap.xml is valid and complete**
   - Fetch `http://demo.localhost:3000/sitemap.xml`
   - Assert: response status 200
   - Assert: `Content-Type` includes `xml`
   - Assert: body contains `<urlset` root element
   - Assert: body contains `<url>` entries for each published page (at least homepage)
   - Assert: body contains `<url>` entries for published blog posts
   - Assert: each `<url>` has `<loc>` with a full URL
   - Assert: each `<url>` has `<lastmod>` with a valid date

2. **Unpublished content excluded from sitemap**
   - Create a draft page or post (via admin or seed)
   - Fetch sitemap.xml
   - Assert: no `<url>` entry for the draft content

3. **Robots.txt is valid**
   - Fetch `http://demo.localhost:3000/robots.txt`
   - Assert: response status 200
   - Assert: `Content-Type` includes `text/plain`
   - Assert: body contains `User-agent: *`
   - Assert: body contains `Sitemap:` with the URL to the sitemap
   - Assert: body contains `Disallow: /admin`

### Task 5.5.4 — Write Playwright E2E tests for structured data

File: `tests/e2e/phase5-structured-data.spec.ts`

**Prerequisites**: Demo tenant with SEO addon enabled. At least one published blog post.

**Test cases**:

1. **Organization JSON-LD on tenant pages**
   - Navigate to `http://demo.localhost:3000/`
   - Assert: page source contains `<script type="application/ld+json">`
   - Parse the JSON-LD content
   - Assert: `@type` is `"Organization"`
   - Assert: `name` matches tenant name
   - Assert: `url` is set

2. **Article JSON-LD on blog post pages**
   - Navigate to a published blog post URL
   - Assert: page source contains `<script type="application/ld+json">`
   - Parse the JSON-LD content
   - Assert: `@type` is `"Article"`
   - Assert: `headline` matches post title
   - Assert: `author` is set
   - Assert: `datePublished` is a valid ISO date string

### Task 5.5.5 — Write Playwright E2E tests for caching behavior

File: `tests/e2e/phase5-caching.spec.ts`

**Test cases**:

1. **Tenant pages return caching headers**
   - Fetch `http://demo.localhost:3000/` and inspect response headers
   - Assert: `Cache-Control` header is present
   - Assert: header contains `s-maxage` directive
   - Assert: header contains `stale-while-revalidate` directive

2. **Blog post pages return caching headers**
   - Fetch a blog post URL and inspect response headers
   - Assert: `Cache-Control` header is present with caching directives

3. **Admin revalidation clears cache**
   - Fetch tenant homepage (populates cache)
   - Update page content via admin API
   - Call `POST /api/admin/revalidate` with the tenant ID
   - Fetch tenant homepage again
   - Assert: response contains the updated content (not stale cached content)

- **Run**: `npx playwright test tests/e2e/phase5-*.spec.ts`
- **Pass criteria**: All tests across all 4 spec files pass.
