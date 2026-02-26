# Phase 3 — Blog System & Markdown

> **Goal**: Add blog functionality — CRUD in admin, Markdown rendering, blog listing + detail pages on the tenant site.
>
> **Phase QA Criteria**: Create a blog post in admin with Markdown content, verify it renders at `/blog/{slug}` with proper formatting, and appears on `/blog` listing.
>
> **Parallelism**: 3 streams.

---

## Step 3.1 — Markdown Pipeline `[DEV-1]` `[PARALLEL with 3.2]`

### Task 3.1.1 — Install and configure Markdown libraries
- Install `remark`, `remark-html` (or `rehype`), `remark-gfm` for GitHub-flavored MD
- Create `markdownToHtml(md: string): string` utility
- Files: `src/lib/markdown/index.ts`
- **Unit tests** (`tests/unit/markdown/markdown-to-html.test.ts`):
  - Converts `# Heading` to `<h1>Heading</h1>`
  - Converts `**bold**` to `<strong>bold</strong>`
  - Converts fenced code blocks to `<pre><code>` elements
  - Converts `[link](url)` to `<a href="url">link</a>`
  - Converts GFM tables to `<table>` elements
  - Converts `- item` lists to `<ul><li>` elements
  - Handles empty string input (returns empty string)
  - Handles input with no Markdown syntax (wraps in `<p>`)

### Task 3.1.2 — Blog post detail page (tenant-facing)
- SSR route at `(tenant)/blog/[slug]/page.tsx`
- Fetches post by slug + tenant, renders Markdown to HTML
- Displays title, author, date, tags, featured image
- Files: `src/app/(tenant)/blog/[slug]/page.tsx`
- Depends on: `3.1.1`
- Testing covered by Phase 3 Playwright tests

### Task 3.1.3 — Blog listing page (tenant-facing)
- SSR route at `(tenant)/blog/page.tsx`
- Lists all published posts for tenant, ordered by `published_at` desc
- Shows: title, excerpt, date, featured image, link to detail
- Files: `src/app/(tenant)/blog/page.tsx`
- Depends on: Phase 2
- Testing covered by Phase 3 Playwright tests

---

## Step 3.2 — Blog Admin `[DEV-2]` `[PARALLEL with 3.1]`

### Task 3.2.1 — Blog CRUD API
- GET/POST `/api/admin/blog?tenantId=...` — list/create posts
- GET/PUT/DELETE `/api/admin/blog/[id]` — read/update/delete
- Files: `src/app/api/admin/blog/route.ts`, `src/app/api/admin/blog/[id]/route.ts`
- Depends on: Phase 2
- **Unit tests** (`tests/unit/api/admin/blog.test.ts`):
  - GET with `tenantId` returns only that tenant's posts
  - POST creates a blog post with all fields (title, slug, excerpt, content, author, tags, featured_image, published)
  - POST with duplicate slug for the same tenant returns 409
  - PUT updates post fields including Markdown `content`
  - PUT toggling `published` from false to true sets `published_at` timestamp
  - DELETE removes post, returns 200
  - GET single post by ID returns full post with content
  - All endpoints return 401 without auth

### Task 3.2.2 — Blog posts list UI
- Table of posts for a tenant: title, status (draft/published), date
- Create/delete actions
- Files: `src/app/admin/tenants/[id]/blog/page.tsx`
- Depends on: `3.2.1`
- Testing covered by Phase 3 Playwright tests

### Task 3.2.3 — Blog post editor UI
- Markdown editor (textarea or CodeMirror with MD syntax highlighting)
- Live preview panel (rendered Markdown)
- Fields: title, slug, excerpt, author, tags (comma-separated), featured image (URL or media picker)
- Published toggle
- Files: `src/app/admin/tenants/[id]/blog/[postId]/page.tsx`, `src/app/admin/tenants/[id]/blog/new/page.tsx`, `src/components/admin/BlogEditor.tsx`
- Depends on: `3.2.2`, `3.1.1`
- Testing covered by Phase 3 Playwright tests

---

## Step 3.3 — Blog SEO `[DEV-3]` `[PARALLEL with 3.1, 3.2]`

### Task 3.3.1 — Blog post metadata (Next.js Metadata API)
- Generate `<title>`, `<meta description>`, Open Graph tags from post fields
- Files: update `src/app/(tenant)/blog/[slug]/page.tsx` (export `generateMetadata`)
- Depends on: Phase 2
- Testing covered by Phase 3 Playwright tests

### Task 3.3.2 — RSS feed for tenant blog
- Route at `(tenant)/blog/rss.xml/route.ts` — generates RSS XML from published posts
- Files: `src/app/(tenant)/blog/rss.xml/route.ts`
- Depends on: Phase 2
- **Unit tests** (`tests/unit/blog/rss.test.ts`):
  - Generated XML is valid RSS 2.0 (contains `<rss>`, `<channel>`, `<item>` elements)
  - Each published post produces an `<item>` with `<title>`, `<link>`, `<description>`, `<pubDate>`
  - Draft posts are excluded from the feed
  - Empty blog produces valid RSS with zero items

---

## Step 3.4 — Phase 3 QA

### Task 3.4.1 — Write and pass all Phase 3 unit tests

- `tests/unit/markdown/markdown-to-html.test.ts`
- `tests/unit/api/admin/blog.test.ts`
- `tests/unit/blog/rss.test.ts`
- **Run**: `npm test`
- **Pass criteria**: All tests green.

### Task 3.4.2 — Write Playwright E2E tests for blog admin workflow

File: `tests/e2e/phase3-blog-admin.spec.ts`

**Prerequisites**: Authenticated admin, demo tenant exists.

**Test cases**:

1. **Blog posts list shows empty state or seeded posts**
   - Navigate to `/admin/tenants/{demoTenantId}/blog`
   - Assert: blog list UI is visible
   - Assert: "New post" button/link is visible

2. **Create a new blog post**
   - Click "New post"
   - Fill in title: "My First Post"
   - Assert: slug auto-populates with "my-first-post"
   - Fill in excerpt: "A short summary"
   - Fill in author: "Test Author"
   - Fill in tags: "test, demo"
   - Enter Markdown content: `# Hello\n\nThis is **bold** and a [link](https://example.com).\n\n- Item 1\n- Item 2`
   - Toggle published ON
   - Click save
   - Assert: redirected to blog list
   - Assert: "My First Post" appears in the list with "Published" status

3. **Edit a blog post**
   - Click on "My First Post" in the list
   - Assert: editor loads with existing content
   - Change title to "My Updated Post"
   - Click save
   - Assert: success feedback

4. **Live preview shows rendered Markdown**
   - In the blog post editor, verify the preview panel is visible
   - Assert: preview contains an `<h1>` with "Hello"
   - Assert: preview contains `<strong>bold</strong>`
   - Assert: preview contains a `<a>` link

5. **Delete a blog post**
   - Navigate to blog list
   - Delete "My Updated Post"
   - Assert: post removed from the list

### Task 3.4.3 — Write Playwright E2E tests for tenant-facing blog pages

File: `tests/e2e/phase3-blog-tenant.spec.ts`

**Prerequisites**: Demo tenant with at least 2 published blog posts seeded (or created via admin in `beforeAll`). At least one draft post should also exist.

**Test cases**:

1. **Blog listing page renders published posts**
   - Navigate to `http://demo.localhost:3000/blog`
   - Assert: page returns 200
   - Assert: published post titles are visible
   - Assert: excerpts are visible
   - Assert: published dates are visible
   - Assert: draft posts are NOT visible
   - Assert: posts are ordered by date (newest first)
   - Assert: each post has a link to its detail page

2. **Blog listing links navigate to detail pages**
   - Click the first post link on the listing page
   - Assert: URL matches `/blog/{slug}`
   - Assert: detail page content is visible

3. **Blog post detail page renders Markdown correctly**
   - Navigate to `http://demo.localhost:3000/blog/my-first-post` (or seeded slug)
   - Assert: post title is visible as a heading
   - Assert: author name is visible
   - Assert: published date is visible
   - Assert: tags are visible
   - Assert: Markdown is rendered as HTML — check for:
     - `<h1>` or heading element from the Markdown `#` syntax
     - `<strong>` element from `**bold**`
     - `<a>` link element
     - `<ul>` / `<li>` list elements
   - Assert: featured image renders if set

4. **Blog post detail page is SSR**
   - Fetch raw HTML (without JS) for the blog post URL
   - Assert: HTML source contains the post title text
   - Assert: HTML source contains the rendered Markdown content (the `<strong>`, `<a>`, etc.)

5. **Non-existent blog post returns 404**
   - Navigate to `http://demo.localhost:3000/blog/does-not-exist`
   - Assert: returns 404 or displays not-found message

### Task 3.4.4 — Write Playwright E2E tests for blog SEO metadata

File: `tests/e2e/phase3-blog-seo.spec.ts`

**Prerequisites**: At least one published blog post exists.

**Test cases**:

1. **Blog post page has correct meta tags**
   - Navigate to blog post detail page
   - Assert: `<title>` contains the post title
   - Assert: `<meta name="description">` contains the post excerpt
   - Assert: `<meta property="og:title">` contains the post title
   - Assert: `<meta property="og:description">` contains the excerpt
   - Assert: `<meta property="og:type">` is `"article"`
   - Assert: `<meta property="og:image">` is set if featured image exists

2. **RSS feed is valid and accessible**
   - Navigate to `http://demo.localhost:3000/blog/rss.xml`
   - Assert: response `Content-Type` is `application/xml` or `application/rss+xml`
   - Assert: response body contains `<rss` root element
   - Assert: response body contains `<channel>` with `<title>`
   - Assert: response body contains at least one `<item>` for each published post
   - Assert: each `<item>` has `<title>`, `<link>`, `<description>`

- **Run**: `npx playwright test tests/e2e/phase3-*.spec.ts`
- **Pass criteria**: All tests across all 3 spec files pass.
