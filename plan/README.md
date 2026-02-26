# Flight App — Development Plan

> Multi-Tenant CMS built with Next.js, Drizzle ORM, PostgreSQL, and S3-compatible storage.

## Phase Files

| File | Phase | Goal |
|------|-------|------|
| [phase-0.md](phase-0.md) | Thin Slice | Prove full pipeline: HTTP → tenant → DB JSON → SSR HTML |
| [phase-1.md](phase-1.md) | Foundation Buildout | Data layer, types, theme system, layout + content components |
| [phase-2.md](phase-2.md) | Admin Panel | Tenant/page/theme/media CRUD with auth |
| [phase-3.md](phase-3.md) | Blog System | Markdown blog with admin, listing, detail, RSS, SEO |
| [phase-4.md](phase-4.md) | Interactive & Add-ons | Client components, add-on system, contact/gallery/calendar |
| [phase-5.md](phase-5.md) | SEO & Performance | Sitemap, robots.txt, structured data, caching |
| [phase-6.md](phase-6.md) | Production Readiness | Docker prod config, Caddy SSL, monitoring, docs |

## Dependency Graph

```
Phase 0 (Thin Slice)
  └── Phase 1 (Foundation) — 5 parallel streams
        ├── Phase 2 (Admin Panel) — 5 parallel streams after auth
        │     ├── Phase 3 (Blog) — 3 parallel streams
        │     ├── Phase 4 (Interactive + Add-ons) — 5+ parallel streams
        │     └── Phase 5 (SEO & Performance) — 4 parallel streams
        └────────── Phase 6 (Production) — 3 parallel streams
```

> Phases 3, 4, and 5 can overlap — Phase 4 only needs Phase 1's component system and Phase 2's admin, not Phase 3's blog. Phase 5 can start its page-level SEO track as soon as Phase 2 is done.

## Parallel Work Assignments

| Phase | Parallel Streams | Can Start After |
|-------|-----------------|-----------------|
| Phase 0 | 1 | — |
| Phase 1 | 5 (data, types, layout, content, theme) | Phase 0 |
| Phase 2 | 5 (auth→then: tenant API, tenant UI, pages, theme editor, media) | Phase 1 |
| Phase 3 | 3 (markdown+pages, blog admin, blog SEO) | Phase 2 |
| Phase 4 | 5+ (hydration pattern→then: 4 components, addon system, 3 addons, addon admin) | Phase 1+2 |
| Phase 5 | 4 (page SEO, sitemap, structured data, caching) | Phase 2+3 |
| Phase 6 | 3 (docker, proxy, monitoring) | Phase 5 |

## Reference

- [cms-light.PRD.md](cms-light.PRD.md) — Full Product Requirements Document

## Testing Strategy

### Tools
- **Unit tests**: Vitest + @testing-library/react (set up in Phase 0, Task 0.1.4)
- **E2E tests**: Playwright (set up in Phase 0, Task 0.1.4)

### Structure
```
tests/
├── unit/                           # Vitest unit tests
│   ├── smoke.test.ts               # Phase 0 — test runner smoke test
│   ├── components/
│   │   ├── heading.test.tsx         # Phase 0 + Phase 1
│   │   ├── text.test.tsx            # Phase 0 + Phase 1
│   │   ├── content/                 # Phase 1
│   │   │   ├── image.test.tsx
│   │   │   ├── button.test.tsx
│   │   │   ├── link.test.tsx
│   │   │   ├── icon.test.tsx
│   │   │   ├── list.test.tsx
│   │   │   └── card.test.tsx
│   │   ├── layout/                  # Phase 1
│   │   │   ├── section.test.tsx
│   │   │   ├── container.test.tsx
│   │   │   ├── grid.test.tsx
│   │   │   ├── row.test.tsx
│   │   │   ├── column.test.tsx
│   │   │   └── spacer.test.tsx
│   │   └── interactive/             # Phase 4
│   │       ├── accordion.test.tsx
│   │       ├── tabs.test.tsx
│   │       ├── carousel.test.tsx
│   │       └── modal.test.tsx
│   ├── renderer/
│   │   └── render-component-tree.test.tsx  # Phase 0 + Phase 4
│   ├── tenant/
│   │   └── resolve.test.ts          # Phase 0
│   ├── theme/
│   │   └── theme-provider.test.tsx   # Phase 1
│   ├── db/queries/                   # Phase 1
│   │   ├── tenants.test.ts
│   │   ├── pages.test.ts
│   │   ├── blog-posts.test.ts
│   │   ├── media.test.ts
│   │   └── addons.test.ts
│   ├── auth/
│   │   └── auth.test.ts              # Phase 2
│   ├── s3/
│   │   └── client.test.ts            # Phase 2
│   ├── markdown/
│   │   └── markdown-to-html.test.ts  # Phase 3
│   ├── blog/
│   │   └── rss.test.ts               # Phase 3
│   ├── addons/                        # Phase 4
│   │   ├── registry.test.ts
│   │   ├── contact-form/
│   │   │   ├── contact-form.test.tsx
│   │   │   └── registration.test.ts
│   │   ├── gallery/
│   │   │   ├── gallery.test.tsx
│   │   │   ├── lightbox.test.tsx
│   │   │   └── registration.test.ts
│   │   ├── calendar/
│   │   │   ├── calendar-widget.test.tsx
│   │   │   └── registration.test.ts
│   │   └── seo/
│   │       └── organization-schema.test.ts  # Phase 5
│   ├── seo/                           # Phase 5
│   │   ├── sitemap.test.ts
│   │   ├── robots.test.ts
│   │   └── article-schema.test.ts
│   └── api/
│       ├── health.test.ts             # Phase 6
│       ├── admin/
│       │   ├── auth.test.ts           # Phase 2
│       │   ├── tenants.test.ts        # Phase 2
│       │   ├── pages.test.ts          # Phase 2
│       │   ├── media.test.ts          # Phase 2
│       │   ├── blog.test.ts           # Phase 3
│       │   ├── addons.test.ts         # Phase 4
│       │   └── revalidate.test.ts     # Phase 5
│       └── addons/
│           └── contact-form.test.ts   # Phase 4
├── e2e/                              # Playwright E2E tests
│   ├── smoke.spec.ts                 # Phase 0 — Playwright runner smoke test
│   ├── phase0-tenant-rendering.spec.ts
│   ├── phase1-components-and-theme.spec.ts
│   ├── phase2-admin-auth.spec.ts
│   ├── phase2-tenant-crud.spec.ts
│   ├── phase2-page-crud.spec.ts
│   ├── phase2-theme-editor.spec.ts
│   ├── phase2-media-library.spec.ts
│   ├── phase2-full-workflow.spec.ts
│   ├── phase3-blog-admin.spec.ts
│   ├── phase3-blog-tenant.spec.ts
│   ├── phase3-blog-seo.spec.ts
│   ├── phase4-interactive-components.spec.ts
│   ├── phase4-addon-gating.spec.ts
│   ├── phase4-addon-admin.spec.ts
│   ├── phase5-page-seo.spec.ts
│   ├── phase5-sitemap-robots.spec.ts
│   ├── phase5-structured-data.spec.ts
│   ├── phase5-caching.spec.ts
│   ├── phase6-production.spec.ts
│   └── phase6-docker-smoke.spec.ts
└── fixtures/
    └── test-image.png                # Small image for media upload tests
```

### Rules

1. **Every pure function/utility gets unit tests** — renderers, query functions, auth helpers, Markdown converters, schema generators, S3 client methods.
2. **Every browser-visible feature gets a Playwright test** — page rendering, component interaction, admin CRUD workflows, form submissions, SEO tags in page source.
3. **Each phase ends with a dedicated QA step** that lists every test file and has explicit pass criteria.
4. **Unit tests run against real services** — DB query tests use a test Postgres instance, S3 tests use MinIO. No mocking for integration-level unit tests.
5. **Playwright tests run against a running dev server** with seeded data.
6. **Phase 6 ends with a full regression** — every unit test and every Playwright test across all phases must pass.

### Commands

```bash
npm test                              # Run all unit tests (Vitest)
npm run test:watch                    # Watch mode for unit tests
npx playwright test                   # Run all E2E tests
npx playwright test tests/e2e/phase2-*.spec.ts   # Run one phase's E2E tests
npx playwright test --ui              # Playwright UI mode for debugging
```

## Verification Plan

| Level | What to Test | How | Who |
|-------|-------------|-----|-----|
| **Task** | Individual acceptance criteria | Unit tests per task | Developer (self-test) |
| **Step** | All tasks in the step work together | Run step's unit tests | Developer + peer review |
| **Phase** | Full phase integration | Unit tests + Playwright E2E tests | QA full regression |
| **Final** | All phases together | `npm test` + `npx playwright test` (zero failures) | QA gate before deploy |
