# Phase 4 — Interactive Components & Add-on System

> **Goal**: Build interactive components that establish the client-side hydration pattern, and the modular add-on system for billable features.
>
> **Phase QA Criteria**: A page with Accordion/Tabs/Carousel/Modal renders and works interactively. Toggling an add-on off hides its components. Contact form submits successfully.
>
> **Parallelism**: 5+ streams — each component and each add-on is independent.

---

## Step 4.1 — Interactive Component Pattern `[DEV-1]` `[BLOCKING for 4.2]`

### Task 4.1.1 — Establish client component hydration pattern
- Document the pattern: interactive components use `"use client"` directive
- The renderer must handle mixing server and client components
- Create a wrapper `ClientComponent` if needed for dynamic imports
- Files: update `src/lib/renderer/index.ts`, create `src/components/cms/interactive/README.md` (pattern doc)
- Depends on: Phase 1
- **Unit tests** (update `tests/unit/renderer/render-component-tree.test.tsx`):
  - A component with `"use client"` in the tree renders its SSR output (initial state) to HTML string
  - Mixed tree with server + client components renders without error

---

## Step 4.2 — Interactive Components `[PARALLEL]`

> All tasks are independent and can be assigned to different developers.

### Task 4.2.1 — Accordion component `[DEV-1]`
- Props: `items: Array<{ title: string; content: string }>`, `allowMultiple: boolean`
- `"use client"` — manages open/close state
- SSR: renders all items closed (or first open)
- Files: `src/components/cms/interactive/Accordion.tsx`, update `src/components/cms/interactive/index.ts`
- Depends on: `4.1.1`
- **Unit tests** (`tests/unit/components/interactive/accordion.test.tsx`):
  - Renders all item titles
  - All items start collapsed (or first item open) on initial render
  - Item content is present in DOM but hidden (for SSR accessibility)

### Task 4.2.2 — Tabs component `[DEV-2]`
- Props: `tabs: Array<{ label: string; content: string }>`, `defaultTab: number`
- `"use client"` — manages active tab state
- SSR: renders first (or default) tab content
- Files: `src/components/cms/interactive/Tabs.tsx`, update `src/components/cms/interactive/index.ts`
- Depends on: `4.1.1`
- **Unit tests** (`tests/unit/components/interactive/tabs.test.tsx`):
  - Renders all tab labels as clickable elements
  - First tab (or `defaultTab`) content is visible on initial render
  - Other tab content is hidden on initial render

### Task 4.2.3 — Carousel component `[DEV-3]`
- Props: `slides: Array<{ image: string; alt: string; caption?: string }>`, `autoplay: boolean`, `interval: number`
- `"use client"` — manages current slide, autoplay timer
- SSR: renders first slide
- Files: `src/components/cms/interactive/Carousel.tsx`, update `src/components/cms/interactive/index.ts`
- Depends on: `4.1.1`
- **Unit tests** (`tests/unit/components/interactive/carousel.test.tsx`):
  - Renders first slide image with correct `src` and `alt`
  - Renders prev/next navigation buttons
  - Shows caption when provided

### Task 4.2.4 — Modal component `[DEV-4]`
- Props: `trigger: { label: string; variant?: string }`, children rendered as modal body
- `"use client"` — manages open/close state
- SSR: renders trigger button, modal content hidden
- Files: `src/components/cms/interactive/Modal.tsx`, update `src/components/cms/interactive/index.ts`
- Depends on: `4.1.1`
- **Unit tests** (`tests/unit/components/interactive/modal.test.tsx`):
  - Renders trigger button with correct label text
  - Modal overlay/content is hidden on initial render
  - Modal content is present in DOM (for SSR)

---

## Step 4.3 — Add-on System Architecture `[DEV-5]` `[PARALLEL with 4.2]`

### Task 4.3.1 — Define AddonModule interface
- Interface: `{ key, name, components?: Record<string, ComponentType>, apiRoutes?: ..., configSchema?: JSONSchema }`
- Files: `src/lib/addons/types.ts`
- Depends on: Phase 1
- QA: Interface compiles, can define a sample addon module (TypeScript compilation check)

### Task 4.3.2 — Create addon registry
- Map of `addonKey → AddonModule`
- Function to register an addon and its components into the main component registry
- Files: `src/lib/addons/registry.ts`
- Depends on: `4.3.1`
- **Unit tests** (`tests/unit/addons/registry.test.ts`):
  - `registerAddon` adds an addon to the registry
  - Registered addon's components appear in the main component registry
  - `getAddon(key)` returns the registered addon
  - `getAddon(unknownKey)` returns undefined
  - `listAddons` returns all registered addons
  - `getComponentAddon(componentType)` returns the addon key that owns that component (or null for core components)

### Task 4.3.3 — Add feature gating to renderer
- Before rendering a component, check if it belongs to an addon
- If addon not enabled for tenant → skip component (render nothing)
- Files: update `src/lib/renderer/index.ts`
- Depends on: `4.3.2`
- **Unit tests** (update `tests/unit/renderer/render-component-tree.test.tsx`):
  - Core component (e.g., Heading) always renders regardless of enabled addons
  - Addon component renders when that addon is in the tenant's enabled list
  - Addon component returns null/empty when addon is NOT enabled for tenant
  - Page with mixed core + addon components renders only the enabled ones

---

## Step 4.4 — Forms Add-on (Generic Form Builder) `[DEV-2]` `[PARALLEL with 4.5, 4.6]`

### Task 4.4.1 — FormBuilder component
- Generic form component that renders any form from a field schema — replaces a hardcoded contact form with a reusable builder
- Props: `formId: string`, `fields: Array<{ name, label, type, required, options?, placeholder?, validation? }>`, `submitLabel`, `successMessage`
- Supported field types: `text`, `email`, `tel`, `textarea`, `select`, `checkbox`, `hidden`
- `"use client"` — manages form state, validation, submission
- Posts to `/api/addons/forms/[formId]`
- Files: `src/lib/addons/forms/components/FormBuilder.tsx`
- Depends on: `4.3.2`
- **Unit tests** (`tests/unit/addons/forms/form-builder.test.tsx`):
  - Renders a `<form>` element
  - Renders input fields matching the `fields` prop
  - Required fields have the `required` attribute
  - Submit button displays `submitLabel` text
  - Renders correct input `type` (text, email, tel, textarea, select, checkbox) per field config
  - `select` type renders `<select>` with `<option>` elements from `options` prop
  - `placeholder` prop applies to text/email/tel/textarea fields
  - `hidden` type renders `<input type="hidden">`

### Task 4.4.2 — Form submission API
- POST `/api/addons/forms/[formId]` — validates tenant has addon enabled, validates fields against schema, sends email (or logs)
- **Apply rate limiting**: this is a public-facing endpoint — use strict limits (e.g., 5 submissions per 60s per IP) via the rate limiter from Phase 2, Task 2.1.4
- Per-tenant form config (recipient email, success redirect, etc.) stored in `tenant_addon_configs`
- Files: `src/app/api/addons/forms/[formId]/route.ts`
- Depends on: `4.4.1`
- **Unit tests** (`tests/unit/api/addons/forms/form-submission.test.ts`):
  - POST with valid data and addon enabled returns 200
  - POST with addon disabled for tenant returns 403
  - POST with missing required fields returns 400
  - POST with unknown tenant returns 404
  - POST with unknown formId returns 404
  - Rapid repeated POST requests from the same IP return 429 after exceeding the limit

### Task 4.4.3 — Register forms addon
- Create addon module, register `FormBuilder` component in addon registry
- Files: `src/lib/addons/forms/index.ts`, update `src/lib/addons/registry.ts`
- Depends on: `4.4.1`, `4.4.2`
- **Unit tests** (`tests/unit/addons/forms/registration.test.ts`):
  - After registration, `FormBuilder` component exists in the component registry
  - Addon metadata has correct key and name

### Task 4.4.4 — ContactForm convenience wrapper
- Thin wrapper around `FormBuilder` with a preset field schema for contact forms (name, email, message)
- Props: `recipientEmail?`, `submitLabel?`, `successMessage?`, `additionalFields?: Array<FieldConfig>`
- Files: `src/lib/addons/forms/components/ContactForm.tsx`
- Depends on: `4.4.1`
- **Unit tests** (`tests/unit/addons/forms/contact-form.test.tsx`):
  - Renders name, email, and message fields by default
  - `additionalFields` appends extra fields after defaults
  - Passes through `submitLabel` and `successMessage` to FormBuilder

---

## Step 4.5 — Gallery Add-on `[DEV-3]` `[PARALLEL with 4.4, 4.6]`

### Task 4.5.1 — Gallery component
- Props: `images: Array<{ src, alt, caption? }>`, `layout: "grid" | "masonry"`, `columns`
- Renders image grid
- Files: `src/lib/addons/gallery/components/Gallery.tsx`
- Depends on: `4.3.2`
- **Unit tests** (`tests/unit/addons/gallery/gallery.test.tsx`):
  - Renders correct number of image elements matching `images` array
  - Each image has correct `src` and `alt` attributes
  - Grid layout applies grid CSS
  - Renders captions when provided

### Task 4.5.2 — Lightbox component
- `"use client"` — click image to open full-screen overlay with prev/next navigation
- Files: `src/lib/addons/gallery/components/Lightbox.tsx`
- Depends on: `4.5.1`
- **Unit tests** (`tests/unit/addons/gallery/lightbox.test.tsx`):
  - Renders clickable image thumbnails
  - Overlay is hidden on initial render
  - Prev/next buttons are present in the lightbox DOM

### Task 4.5.3 — Register gallery addon
- Files: `src/lib/addons/gallery/index.ts`, update `src/lib/addons/registry.ts`
- Depends on: `4.5.1`, `4.5.2`
- **Unit tests** (`tests/unit/addons/gallery/registration.test.ts`):
  - After registration, `Gallery` and `Lightbox` components exist in the component registry

---

## Step 4.6 — Calendar Add-on `[DEV-4]` `[PARALLEL with 4.4, 4.5]`

### Task 4.6.1 — CalendarWidget component
- Props: `bookingUrl`, `title`, `description`
- Embeds an external booking link (iframe or styled link)
- Files: `src/lib/addons/calendar/components/CalendarWidget.tsx`
- Depends on: `4.3.2`
- **Unit tests** (`tests/unit/addons/calendar/calendar-widget.test.tsx`):
  - Renders `title` and `description` text
  - Renders an `<iframe>` or `<a>` with the `bookingUrl`
  - Missing `bookingUrl` renders a fallback or nothing

### Task 4.6.2 — Register calendar addon
- Files: `src/lib/addons/calendar/index.ts`, update `src/lib/addons/registry.ts`
- Depends on: `4.6.1`
- **Unit tests** (`tests/unit/addons/calendar/registration.test.ts`):
  - After registration, `CalendarWidget` component exists in the component registry

---

## Step 4.7 — Analytics Add-on `[DEV-6]` `[PARALLEL with 4.4, 4.5, 4.6]`

### Task 4.7.1 — Analytics script injection
- Injects analytics tracking script (GA4, Plausible, or custom) into tenant pages via the addon system
- Per-tenant config: `provider` (ga4 | plausible | custom), `trackingId`, `customScript?`
- The addon registers no visible components — it hooks into the tenant layout to inject a `<script>` tag
- Files: `src/lib/addons/analytics/index.ts`
- Depends on: `4.3.2`
- **Unit tests** (`tests/unit/addons/analytics/analytics.test.ts`):
  - GA4 provider generates correct `gtag.js` script tag with tracking ID
  - Plausible provider generates correct `<script data-domain>` tag
  - Custom provider injects the raw `customScript` string
  - Missing `trackingId` renders nothing (does not inject broken script)
  - Addon metadata has correct key and name

### Task 4.7.2 — Register analytics addon
- Files: `src/lib/addons/analytics/index.ts`, update `src/lib/addons/registry.ts`
- Depends on: `4.7.1`
- **Unit tests** (`tests/unit/addons/analytics/registration.test.ts`):
  - After registration, analytics addon exists in the addon registry
  - Addon has no components (components map is empty or undefined)

### Task 4.7.3 — Integrate analytics into tenant layout
- If analytics addon is enabled for tenant, inject the script tag into `<head>` via the tenant layout
- Files: update `src/app/(tenant)/layout.tsx`
- Depends on: `4.7.2`
- Testing covered by Phase 4 Playwright tests

---

## Step 4.8 — Admin Add-on Management `[DEV-5]` `[PARALLEL with 4.4, 4.5, 4.6, 4.7]`

### Task 4.8.1 — Addon toggle API
- POST `/api/admin/addons/toggle` — body: `{ tenantId, addonKey, enabled }`
- Files: `src/app/api/admin/addons/route.ts`
- Depends on: Step 4.3
- **Unit tests** (`tests/unit/api/admin/addons.test.ts`):
  - POST with `enabled: true` creates/updates config row with `enabled = true`
  - POST with `enabled: false` sets `enabled = false`
  - POST with unknown addon key returns 404
  - POST without auth returns 401

### Task 4.8.2 — Addon manager UI
- List available addons for a tenant with on/off toggles
- Per-addon config form (rendered from config schema)
- Files: `src/app/admin/tenants/[id]/addons/page.tsx`, `src/components/admin/AddonManager.tsx`
- Depends on: `4.8.1`
- Testing covered by Phase 4 Playwright tests

---

## Step 4.9 — Phase 4 QA

### Task 4.9.1 — Write and pass all Phase 4 unit tests

- `tests/unit/renderer/render-component-tree.test.tsx` (updated with hydration + feature gating tests)
- `tests/unit/components/interactive/accordion.test.tsx`
- `tests/unit/components/interactive/tabs.test.tsx`
- `tests/unit/components/interactive/carousel.test.tsx`
- `tests/unit/components/interactive/modal.test.tsx`
- `tests/unit/addons/registry.test.ts`
- `tests/unit/addons/forms/form-builder.test.tsx`
- `tests/unit/addons/forms/contact-form.test.tsx`
- `tests/unit/addons/forms/registration.test.ts`
- `tests/unit/api/addons/forms/form-submission.test.ts`
- `tests/unit/addons/gallery/gallery.test.tsx`
- `tests/unit/addons/gallery/lightbox.test.tsx`
- `tests/unit/addons/gallery/registration.test.ts`
- `tests/unit/addons/calendar/calendar-widget.test.tsx`
- `tests/unit/addons/calendar/registration.test.ts`
- `tests/unit/addons/analytics/analytics.test.ts`
- `tests/unit/addons/analytics/registration.test.ts`
- `tests/unit/api/admin/addons.test.ts`
- **Run**: `npm test`
- **Pass criteria**: All tests green.

### Task 4.9.2 — Write Playwright E2E tests for interactive components

File: `tests/e2e/phase4-interactive-components.spec.ts`

**Prerequisites**: Demo tenant with a page containing all 4 interactive components (Accordion, Tabs, Carousel, Modal) in its JSON content. Seed or create via admin in `beforeAll`.

**Test cases**:

1. **Accordion — SSR and interaction**
   - Navigate to the page with the accordion
   - Assert: all accordion item titles are visible
   - Assert: accordion content sections are collapsed (not visible)
   - Click the first accordion title
   - Assert: first item's content becomes visible
   - Click the second accordion title
   - Assert: second item's content becomes visible
   - Assert (if `allowMultiple=false`): first item collapses

2. **Tabs — SSR and interaction**
   - Assert: all tab labels are visible
   - Assert: first tab's content is visible
   - Assert: second tab's content is NOT visible
   - Click the second tab label
   - Assert: second tab's content becomes visible
   - Assert: first tab's content is hidden

3. **Carousel — SSR and interaction**
   - Assert: first slide image is visible
   - Assert: second slide image is NOT visible
   - Click "next" button
   - Assert: second slide becomes visible
   - Assert: first slide is hidden
   - Click "prev" button
   - Assert: first slide is visible again

4. **Modal — SSR and interaction**
   - Assert: trigger button is visible with correct label
   - Assert: modal overlay is NOT visible
   - Click the trigger button
   - Assert: modal overlay appears
   - Assert: modal content is visible
   - Press Escape key
   - Assert: modal closes (overlay hidden)
   - Click trigger again → modal opens
   - Click overlay background (outside modal content)
   - Assert: modal closes

5. **SSR verification for interactive components**
   - Fetch raw HTML (without JavaScript execution) via `request.get()`
   - Assert: HTML source contains accordion item titles
   - Assert: HTML source contains the first tab's content
   - Assert: HTML source contains the first slide's image
   - Assert: HTML source contains the modal trigger button label

### Task 4.9.3 — Write Playwright E2E tests for addon feature gating

File: `tests/e2e/phase4-addon-gating.spec.ts`

**Prerequisites**: Demo tenant with forms addon enabled and a page containing a `FormBuilder` component (contact form preset). Addon initially enabled.

**Test cases**:

1. **Form renders when addon is enabled**
   - Navigate to the tenant page with the form
   - Assert: form element is visible
   - Assert: form fields are rendered (name, email, message, etc.)
   - Assert: submit button is visible

2. **Form submission works**
   - Fill in all required fields
   - Click submit
   - Assert: success message appears (matches `successMessage` prop)
   - Assert: no error messages visible

3. **Form validation rejects empty required fields**
   - Leave required fields empty
   - Click submit
   - Assert: validation error messages appear for required fields
   - Assert: form is NOT submitted (no success message)

4. **Disable addon — component disappears**
   - Log in to admin
   - Navigate to addon manager for the demo tenant
   - Toggle forms addon OFF
   - Save
   - Navigate to the tenant page that had the form
   - Assert: form is NOT visible on the page
   - Assert: other (non-addon) components on the page still render

5. **Re-enable addon — component reappears**
   - Log in to admin
   - Toggle forms addon ON
   - Navigate to tenant page
   - Assert: form is visible again

6. **Gallery addon gating**
   - Ensure gallery addon is enabled for tenant, page has Gallery component
   - Navigate to tenant page → assert gallery images visible
   - Disable gallery addon in admin
   - Navigate to tenant page → assert gallery is gone
   - Re-enable → gallery reappears

7. **Gallery lightbox interaction**
   - Navigate to page with Gallery addon enabled
   - Click on a gallery image
   - Assert: lightbox overlay opens with the full-size image
   - Click next → assert different image shown
   - Press Escape → assert lightbox closes

8. **Calendar addon gating**
   - Enable calendar addon, page has CalendarWidget
   - Navigate to tenant page → assert widget title and booking link visible
   - Disable → widget gone
   - Re-enable → widget back

### Task 4.9.4 — Write Playwright E2E tests for analytics addon

File: `tests/e2e/phase4-addon-analytics.spec.ts`

**Prerequisites**: Demo tenant with analytics addon enabled, configured with a GA4 tracking ID.

**Test cases**:

1. **Analytics script injected when addon is enabled**
   - Navigate to `http://demo.localhost:3000/`
   - Assert: page source contains a `<script>` tag with the GA4 tracking ID
   - Assert: script tag contains `gtag` or expected analytics provider code

2. **Analytics script absent when addon is disabled**
   - Disable analytics addon for tenant in admin
   - Navigate to tenant page
   - Assert: page source does NOT contain the analytics script tag

3. **Switching analytics provider updates the script**
   - Update addon config to use Plausible provider
   - Navigate to tenant page
   - Assert: page source contains Plausible script (`data-domain` attribute)
   - Assert: GA4 script is no longer present

### Task 4.9.5 — Write Playwright E2E test for addon admin management UI

File: `tests/e2e/phase4-addon-admin.spec.ts`

**Prerequisites**: Authenticated admin session.

**Test cases**:

1. **Addon manager lists all available addons**
   - Navigate to `/admin/tenants/{demoTenantId}/addons`
   - Assert: forms addon listed with name and toggle
   - Assert: gallery addon listed
   - Assert: calendar addon listed
   - Assert: analytics addon listed

2. **Toggle addon on and off**
   - Assert: forms addon is currently enabled (toggle ON)
   - Click toggle to disable
   - Assert: toggle reflects OFF state
   - Refresh page → assert toggle is still OFF (persisted)
   - Click toggle to enable
   - Assert: toggle reflects ON state

3. **Addon config form**
   - Click on analytics addon to expand config
   - Assert: provider dropdown and tracking ID field are visible
   - Fill in tracking ID, select provider
   - Save
   - Refresh → assert config values persisted

- **Run**: `npx playwright test tests/e2e/phase4-*.spec.ts`
- **Pass criteria**: All tests across all 4 spec files pass.
