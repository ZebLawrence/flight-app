# Phase 1 — Foundation Buildout

> **Goal**: Complete the data layer, type system, theme system, and full set of layout + content components. After this phase, a tenant site can render a real multi-section marketing page with theming.
>
> **Phase QA Criteria**: Seed a tenant with a full theme + multi-section page using all layout and content components. Visit the site and confirm all components render correctly with theme colors/fonts applied.
>
> **Parallelism**: 5 work streams run concurrently after Phase 0.

---

## Step 1.1 — Complete Data Layer `[DEV-1]`

### Task 1.1.1 — Add remaining table schemas
- Add: `blog_posts`, `media`, `addons`, `tenant_addon_configs` tables
- Files: `src/lib/db/schema/blog-posts.ts`, `src/lib/db/schema/media.ts`, `src/lib/db/schema/addons.ts`, update `index.ts`
- Depends on: Phase 0
- QA: All schemas compile, `npx drizzle-kit push` creates all tables in DB

### Task 1.1.2 — Add `meta` JSONB to pages, `enabled_addons` to tenants
- Enhance existing schemas from Phase 0 with missing columns
- Files: update `src/lib/db/schema/tenants.ts`, `src/lib/db/schema/pages.ts`
- Depends on: `1.1.1`
- QA: Migration runs, columns exist in DB

### Task 1.1.3 — Create tenant query functions
- `getTenantByHost(hostname)`, `getTenantBySlug(slug)`, `getTenantById(id)`, `listTenants()`, `createTenant()`, `updateTenant()`, `deleteTenant()`
- Files: `src/lib/db/queries/tenants.ts`
- Depends on: `1.1.1`
- **Unit tests** (`tests/unit/db/queries/tenants.test.ts` — runs against test DB):
  - `getTenantBySlug` returns tenant for existing slug, null for unknown
  - `getTenantById` returns tenant for valid UUID, null for unknown
  - `listTenants` returns all tenants
  - `createTenant` inserts row and returns it with generated `id` and timestamps
  - `createTenant` rejects duplicate slugs
  - `updateTenant` modifies specified fields, leaves others unchanged
  - `deleteTenant` removes tenant and cascades to associated pages

### Task 1.1.4 — Create page query functions
- `getPageBySlug(tenantId, slug)`, `getPagesByTenant(tenantId)`, `createPage()`, `updatePage()`, `deletePage()`, `reorderPages()`
- Files: `src/lib/db/queries/pages.ts`
- Depends on: `1.1.1`
- **Unit tests** (`tests/unit/db/queries/pages.test.ts`):
  - `getPageBySlug` scoped to tenant — same slug in different tenants returns correct page
  - `getPagesByTenant` returns only pages belonging to that tenant
  - `createPage` inserts page with correct tenant FK
  - `updatePage` updates content JSONB and `updated_at`
  - `deletePage` removes page
  - `reorderPages` updates `sort_order` for multiple pages in a single call

### Task 1.1.5 — Create blog post query functions
- `getPostBySlug(tenantId, slug)`, `getPostsByTenant(tenantId)`, `createPost()`, `updatePost()`, `deletePost()`
- Files: `src/lib/db/queries/blog-posts.ts`
- Depends on: `1.1.1`
- **Unit tests** (`tests/unit/db/queries/blog-posts.test.ts`):
  - CRUD operations work, posts scoped by tenant_id
  - `getPostsByTenant` returns only published posts when filtered, ordered by `published_at` desc
  - Tags array round-trips correctly

### Task 1.1.6 — Create media query functions
- `getMediaByTenant(tenantId)`, `createMedia()`, `deleteMedia()`
- Files: `src/lib/db/queries/media.ts`
- Depends on: `1.1.1`
- **Unit tests** (`tests/unit/db/queries/media.test.ts`):
  - CRUD operations work, media scoped by tenant_id

### Task 1.1.7 — Create addon query functions
- `getAddonByKey(key)`, `listAddons()`, `getTenantAddons(tenantId)`, `toggleAddon(tenantId, addonKey, enabled)`, `updateAddonConfig()`
- Files: `src/lib/db/queries/addons.ts`
- Depends on: `1.1.1`
- **Unit tests** (`tests/unit/db/queries/addons.test.ts`):
  - `toggleAddon` creates row when first enabled, updates `enabled` on subsequent calls
  - `getTenantAddons` returns only addons for that tenant
  - `updateAddonConfig` persists JSONB config and round-trips correctly

---

## Step 1.2 — TypeScript Types & Validation `[DEV-2]` `[PARALLEL with 1.1, 1.3, 1.4, 1.5]`

### Task 1.2.1 — Define TenantTheme type
- Type for theme JSONB: `colors` (primary, secondary, accent, background, text), `fonts` (heading, body), `logo`, `favicon`, `borderRadius`
- Files: `src/lib/types/theme.ts`
- Depends on: Phase 0
- QA: Type compiles, sample theme object passes type check (verified by `tsc --noEmit`)

### Task 1.2.2 — Define PageMeta type
- Type for page meta JSONB: `description`, `ogTitle`, `ogDescription`, `ogImage`, `canonicalUrl`
- Files: `src/lib/types/component.ts` (add to existing)
- Depends on: Phase 0
- QA: Type compiles

### Task 1.2.3 — Define component prop interfaces for all planned components
- Individual prop types: `HeadingProps`, `TextProps`, `ImageProps`, `ButtonProps`, `LinkProps`, `SectionProps`, `ContainerProps`, `GridProps`, `RowProps`, `ColumnProps`, `SpacerProps`, `IconProps`, `ListProps`, `CardProps`
- Files: `src/lib/types/component.ts` (extend)
- Depends on: Phase 0
- QA: Each prop interface compiles and documents expected props

---

## Step 1.3 — Layout Components `[DEV-3]` `[PARALLEL with 1.1, 1.2, 1.4, 1.5]`

> Each task is independent and `[PARALLEL]` with other tasks in this step.
> Each component gets unit tests validating rendering output.

### Task 1.3.1 — Section component
- Full-width wrapper, supports `className`, `background`, `padding` props
- Register in registry
- Files: `src/components/cms/layout/Section.tsx`, update `registry.ts`
- **Unit tests** (`tests/unit/components/layout/section.test.tsx`):
  - Renders a `<section>` (or `<div>`) wrapper element
  - Applies `background` prop as inline style
  - Applies `padding` prop as inline style
  - Passes `className` to the wrapper
  - Renders children inside the wrapper

### Task 1.3.2 — Container component
- Max-width centered wrapper, supports `maxWidth`, `className` props
- Files: `src/components/cms/layout/Container.tsx`, update `registry.ts`
- **Unit tests** (`tests/unit/components/layout/container.test.tsx`):
  - Renders with `max-width` style or Tailwind class
  - Centers content (has `margin: 0 auto` or `mx-auto` class)
  - Renders children

### Task 1.3.3 — Grid component
- CSS Grid wrapper, supports `columns`, `gap`, `className` props
- Files: `src/components/cms/layout/Grid.tsx`, update `registry.ts`
- **Unit tests** (`tests/unit/components/layout/grid.test.tsx`):
  - Renders with `display: grid` style or Tailwind grid class
  - Applies `columns` prop to `grid-template-columns`
  - Applies `gap` prop
  - Renders children as grid items

### Task 1.3.4 — Row and Column components
- Flex-based layout, Row supports `gap`, `align`, `justify`; Column supports `span`, `className`
- Files: `src/components/cms/layout/Row.tsx`, `src/components/cms/layout/Column.tsx`, update `registry.ts`
- **Unit tests** (`tests/unit/components/layout/row.test.tsx`, `tests/unit/components/layout/column.test.tsx`):
  - Row: renders with `display: flex` and `flex-direction: row`
  - Row: applies `gap`, `align-items`, `justify-content` from props
  - Column: renders children
  - Column: applies `span` as flex or grid-column style

### Task 1.3.5 — Spacer component
- Vertical/horizontal spacing, supports `height`, `width` props
- Files: `src/components/cms/layout/Spacer.tsx`, update `registry.ts`
- **Unit tests** (`tests/unit/components/layout/spacer.test.tsx`):
  - Renders empty div with specified `height` in style
  - Renders empty div with specified `width` in style
  - Renders with default dimensions when no props given

---

## Step 1.4 — Content Components `[DEV-4]` `[PARALLEL with 1.1, 1.2, 1.3, 1.5]`

> Each task is independent and `[PARALLEL]` with other tasks in this step.

### Task 1.4.1 — Enhance Heading component
- Add support for `className`, `align` props, theme-aware color via CSS var
- Files: update `src/components/cms/content/Heading.tsx`
- **Unit tests** (update `tests/unit/components/heading.test.tsx`):
  - `align="center"` applies `text-align: center` style or Tailwind class
  - `className` is passed through to the element
  - Heading element references `var(--color-text)` or theme-aware class

### Task 1.4.2 — Enhance Text component
- Support `className`, `align`, `html` (for pre-rendered HTML content) props
- Files: update `src/components/cms/content/Text.tsx`
- **Unit tests** (update `tests/unit/components/text.test.tsx`):
  - `align="center"` applies text centering
  - `html` prop renders via `dangerouslySetInnerHTML`
  - When `html` is provided, `content` prop is ignored
  - `className` is passed through

### Task 1.4.3 — Image component
- Props: `src`, `alt`, `width`, `height`, `className`, `objectFit`
- Use Next.js `<Image>` for optimization
- Files: `src/components/cms/content/Image.tsx`, update `registry.ts`
- **Unit tests** (`tests/unit/components/content/image.test.tsx`):
  - Renders `<img>` (or Next `Image`) with correct `src` and `alt`
  - Applies `width` and `height` attributes
  - Applies `objectFit` as style
  - `className` passed through

### Task 1.4.4 — Button component
- Props: `label`, `href`, `variant` (primary/secondary/outline), `className`
- Renders as `<a>` tag (link button)
- Theme-aware: primary variant uses `var(--color-primary)`
- Files: `src/components/cms/content/Button.tsx`, update `registry.ts`
- **Unit tests** (`tests/unit/components/content/button.test.tsx`):
  - Renders `<a>` tag with `href` attribute
  - Displays `label` as text content
  - `variant="primary"` applies primary color styling (class or CSS var reference)
  - `variant="outline"` applies distinct outline styling
  - `className` is passed through

### Task 1.4.5 — Link component
- Props: `href`, `text`, `className`, `target`
- Files: `src/components/cms/content/Link.tsx`, update `registry.ts`
- **Unit tests** (`tests/unit/components/content/link.test.tsx`):
  - Renders `<a>` with correct `href` and text content
  - Applies `target` attribute when provided
  - `className` passed through

### Task 1.4.6 — Icon component
- Props: `name`, `size`, `className`
- Use a lightweight icon approach (e.g., Lucide icons or SVG sprite)
- Files: `src/components/cms/content/Icon.tsx`, update `registry.ts`
- **Unit tests** (`tests/unit/components/content/icon.test.tsx`):
  - Renders an `<svg>` element for a known icon name
  - Applies `size` to width/height
  - Unknown icon name renders nothing or a fallback

### Task 1.4.7 — List component
- Props: `items` (string array), `ordered` (bool), `className`
- Files: `src/components/cms/content/List.tsx`, update `registry.ts`
- **Unit tests** (`tests/unit/components/content/list.test.tsx`):
  - `ordered=false` renders `<ul>` with `<li>` items
  - `ordered=true` renders `<ol>` with `<li>` items
  - Renders correct number of `<li>` elements matching `items` array length

### Task 1.4.8 — Card component
- Composable wrapper with optional `title`, `image`, `className` props. Renders children inside.
- Files: `src/components/cms/content/Card.tsx`, update `registry.ts`
- **Unit tests** (`tests/unit/components/content/card.test.tsx`):
  - Renders wrapper element with card styling
  - Renders `title` as a heading inside the card
  - Renders `image` as an image element when provided
  - Renders children inside the card body

---

## Step 1.5 — Theme System `[DEV-5]` `[PARALLEL with 1.1, 1.2, 1.3, 1.4]`

### Task 1.5.1 — Create ThemeProvider component
- Server component that reads tenant `theme` JSONB
- Outputs a `<style>` tag (or `style` attribute on wrapper div) with CSS custom properties: `--color-primary`, `--color-secondary`, etc.
- Handles font loading (Google Fonts link or `next/font`)
- Files: `src/components/theme/ThemeProvider.tsx`
- **Unit tests** (`tests/unit/theme/theme-provider.test.tsx`):
  - Renders a `<style>` tag (or wrapper div with `style`) containing `--color-primary: <value>`
  - All 5 color tokens present in output: `--color-primary`, `--color-secondary`, `--color-accent`, `--color-background`, `--color-text`
  - Font family tokens present: `--font-heading`, `--font-body`
  - Missing theme fields fall back to defaults (doesn't crash)
  - Empty theme object produces default CSS variables

### Task 1.5.2 — Extend Tailwind config for theme tokens
- Map Tailwind colors to CSS variables: `colors.primary: 'var(--color-primary)'`, etc.
- Map font families: `fontFamily.heading: 'var(--font-heading)'`, etc.
- Files: update `tailwind.config.ts`
- Depends on: Phase 0
- QA: Using `text-primary` or `bg-primary` in a component picks up the CSS variable value (verified by visual inspection or Playwright screenshot comparison)

### Task 1.5.3 — Integrate ThemeProvider into tenant layout
- Wrap tenant layout with ThemeProvider, pass tenant theme data
- Files: update `src/app/(tenant)/layout.tsx`
- Depends on: `1.5.1`, `1.5.2`
- Testing covered by Phase 1 QA Playwright tests

### Task 1.5.4 — Update seed with rich theme and multi-section page
- Update seed to include full theme (colors, fonts, logo) and a page using all layout + content components (Section, Container, Grid, Row, Column, Spacer, Heading, Text, Image, Button, Link, Icon, List, Card)
- Files: update `src/lib/db/seed.ts`
- Depends on: `1.5.3`, Step 1.3, Step 1.4
- Testing covered by Phase 1 QA Playwright tests

---

## Step 1.6 — Phase 1 QA

### Task 1.6.1 — Write and pass all Phase 1 unit tests

Run every unit test from Steps 1.1, 1.3, 1.4, 1.5. All must pass.

- `tests/unit/db/queries/tenants.test.ts`
- `tests/unit/db/queries/pages.test.ts`
- `tests/unit/db/queries/blog-posts.test.ts`
- `tests/unit/db/queries/media.test.ts`
- `tests/unit/db/queries/addons.test.ts`
- `tests/unit/components/layout/section.test.tsx`
- `tests/unit/components/layout/container.test.tsx`
- `tests/unit/components/layout/grid.test.tsx`
- `tests/unit/components/layout/row.test.tsx`
- `tests/unit/components/layout/column.test.tsx`
- `tests/unit/components/layout/spacer.test.tsx`
- `tests/unit/components/heading.test.tsx` (updated)
- `tests/unit/components/text.test.tsx` (updated)
- `tests/unit/components/content/image.test.tsx`
- `tests/unit/components/content/button.test.tsx`
- `tests/unit/components/content/link.test.tsx`
- `tests/unit/components/content/icon.test.tsx`
- `tests/unit/components/content/list.test.tsx`
- `tests/unit/components/content/card.test.tsx`
- `tests/unit/theme/theme-provider.test.tsx`
- **Run**: `npm test`
- **Pass criteria**: All tests green. Zero failures.

### Task 1.6.2 — Write Playwright E2E tests for component rendering and theming

File: `tests/e2e/phase1-components-and-theme.spec.ts`

**Prerequisites**: DB seeded with rich theme + multi-section page from Task 1.5.4.

**Test cases**:

1. **All layout components render**
   - Navigate to `http://demo.localhost:3000/`
   - Assert: page contains a Section wrapper element (identifiable by data attribute or class)
   - Assert: page contains a Container element with max-width styling
   - Assert: page contains a Grid with child elements laid out in columns
   - Assert: page contains a Row with flex layout
   - Assert: page contains Column elements inside the Row
   - Assert: page contains a Spacer element (empty div with height)

2. **All content components render**
   - Assert: page contains a Heading element with expected text
   - Assert: page contains a Text/paragraph element with expected text
   - Assert: page contains an Image element with `src` and `alt` attributes
   - Assert: page contains a Button element (`<a>`) with `href` and visible label text
   - Assert: page contains a Link element with `href` and visible text
   - Assert: page contains an Icon (SVG element)
   - Assert: page contains a List with `<li>` items
   - Assert: page contains a Card wrapper with title and children

3. **Theme CSS variables are applied**
   - Navigate to `http://demo.localhost:3000/`
   - Use `page.evaluate()` to read `getComputedStyle(document.documentElement).getPropertyValue('--color-primary')`
   - Assert: `--color-primary` value matches the seeded theme's primary color
   - Assert: `--color-secondary` value matches the seeded theme's secondary color
   - Assert: `--color-accent`, `--color-background`, `--color-text` are all set
   - Assert: `--font-heading` and `--font-body` are set

4. **Theme colors are visually applied to components**
   - Assert: Button with `variant="primary"` has a computed `background-color` matching `--color-primary`
   - Assert: Heading has a computed `color` referencing the theme text color

5. **SSR delivers full HTML**
   - Fetch raw HTML via `page.content()` (or `request.get` without JS)
   - Assert: HTML source contains all visible text content (not just loading spinners)

- **Run**: `npx playwright test tests/e2e/phase1-components-and-theme.spec.ts`
- **Pass criteria**: All 5 test groups pass.
