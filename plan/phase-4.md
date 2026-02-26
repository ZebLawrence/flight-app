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
- Files: `src/components/cms/interactive/Accordion.tsx`, update `registry.ts`
- Depends on: `4.1.1`
- **Unit tests** (`tests/unit/components/interactive/accordion.test.tsx`):
  - Renders all item titles
  - All items start collapsed (or first item open) on initial render
  - Item content is present in DOM but hidden (for SSR accessibility)

### Task 4.2.2 — Tabs component `[DEV-2]`
- Props: `tabs: Array<{ label: string; content: string }>`, `defaultTab: number`
- `"use client"` — manages active tab state
- SSR: renders first (or default) tab content
- Files: `src/components/cms/interactive/Tabs.tsx`, update `registry.ts`
- Depends on: `4.1.1`
- **Unit tests** (`tests/unit/components/interactive/tabs.test.tsx`):
  - Renders all tab labels as clickable elements
  - First tab (or `defaultTab`) content is visible on initial render
  - Other tab content is hidden on initial render

### Task 4.2.3 — Carousel component `[DEV-3]`
- Props: `slides: Array<{ image: string; alt: string; caption?: string }>`, `autoplay: boolean`, `interval: number`
- `"use client"` — manages current slide, autoplay timer
- SSR: renders first slide
- Files: `src/components/cms/interactive/Carousel.tsx`, update `registry.ts`
- Depends on: `4.1.1`
- **Unit tests** (`tests/unit/components/interactive/carousel.test.tsx`):
  - Renders first slide image with correct `src` and `alt`
  - Renders prev/next navigation buttons
  - Shows caption when provided

### Task 4.2.4 — Modal component `[DEV-4]`
- Props: `trigger: { label: string; variant?: string }`, children rendered as modal body
- `"use client"` — manages open/close state
- SSR: renders trigger button, modal content hidden
- Files: `src/components/cms/interactive/Modal.tsx`, update `registry.ts`
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

## Step 4.4 — Contact Form Add-on `[DEV-2]` `[PARALLEL with 4.5, 4.6]`

### Task 4.4.1 — ContactForm component
- Props: `fields: Array<{ name, label, type, required }>`, `submitLabel`, `successMessage`
- `"use client"` — manages form state, validation, submission
- Posts to `/api/addons/contact-form`
- Files: `src/lib/addons/contact-form/components/ContactForm.tsx`
- Depends on: `4.3.2`
- **Unit tests** (`tests/unit/addons/contact-form/contact-form.test.tsx`):
  - Renders a `<form>` element
  - Renders input fields matching the `fields` prop
  - Required fields have the `required` attribute
  - Submit button displays `submitLabel` text
  - Form renders correct input `type` (text, email, textarea) per field config

### Task 4.4.2 — Contact form submission API
- POST `/api/addons/contact-form` — validates tenant has addon enabled, sends email (or logs)
- Files: `src/app/api/addons/contact-form/route.ts`
- Depends on: `4.4.1`
- **Unit tests** (`tests/unit/api/addons/contact-form.test.ts`):
  - POST with valid data and addon enabled returns 200
  - POST with addon disabled for tenant returns 403
  - POST with missing required fields returns 400
  - POST with unknown tenant returns 404

### Task 4.4.3 — Register contact form addon
- Create addon module, register in addon registry
- Files: `src/lib/addons/contact-form/index.ts`, update `src/lib/addons/registry.ts`
- Depends on: `4.4.1`, `4.4.2`
- **Unit tests** (`tests/unit/addons/contact-form/registration.test.ts`):
  - After registration, `ContactForm` component exists in the component registry
  - Addon metadata has correct key and name

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

## Step 4.7 — Admin Add-on Management `[DEV-5]` `[PARALLEL with 4.4, 4.5, 4.6]`

### Task 4.7.1 — Addon toggle API
- POST `/api/admin/addons/toggle` — body: `{ tenantId, addonKey, enabled }`
- Files: `src/app/api/admin/addons/route.ts`
- Depends on: Step 4.3
- **Unit tests** (`tests/unit/api/admin/addons.test.ts`):
  - POST with `enabled: true` creates/updates config row with `enabled = true`
  - POST with `enabled: false` sets `enabled = false`
  - POST with unknown addon key returns 404
  - POST without auth returns 401

### Task 4.7.2 — Addon manager UI
- List available addons for a tenant with on/off toggles
- Per-addon config form (rendered from config schema)
- Files: `src/app/admin/tenants/[id]/addons/page.tsx`, `src/components/admin/AddonManager.tsx`
- Depends on: `4.7.1`
- Testing covered by Phase 4 Playwright tests

---

## Step 4.8 — Phase 4 QA

### Task 4.8.1 — Write and pass all Phase 4 unit tests

- `tests/unit/renderer/render-component-tree.test.tsx` (updated with hydration + feature gating tests)
- `tests/unit/components/interactive/accordion.test.tsx`
- `tests/unit/components/interactive/tabs.test.tsx`
- `tests/unit/components/interactive/carousel.test.tsx`
- `tests/unit/components/interactive/modal.test.tsx`
- `tests/unit/addons/registry.test.ts`
- `tests/unit/addons/contact-form/contact-form.test.tsx`
- `tests/unit/addons/contact-form/registration.test.ts`
- `tests/unit/api/addons/contact-form.test.ts`
- `tests/unit/addons/gallery/gallery.test.tsx`
- `tests/unit/addons/gallery/lightbox.test.tsx`
- `tests/unit/addons/gallery/registration.test.ts`
- `tests/unit/addons/calendar/calendar-widget.test.tsx`
- `tests/unit/addons/calendar/registration.test.ts`
- `tests/unit/api/admin/addons.test.ts`
- **Run**: `npm test`
- **Pass criteria**: All tests green.

### Task 4.8.2 — Write Playwright E2E tests for interactive components

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

### Task 4.8.3 — Write Playwright E2E tests for addon feature gating

File: `tests/e2e/phase4-addon-gating.spec.ts`

**Prerequisites**: Demo tenant with contact form addon component in a page's JSON content. Addon initially enabled.

**Test cases**:

1. **Contact form renders when addon is enabled**
   - Navigate to the tenant page with the contact form
   - Assert: form element is visible
   - Assert: form fields are rendered (name, email, message, etc.)
   - Assert: submit button is visible

2. **Contact form submission works**
   - Fill in all required fields
   - Click submit
   - Assert: success message appears (matches `successMessage` prop)
   - Assert: no error messages visible

3. **Contact form validation rejects empty required fields**
   - Leave required fields empty
   - Click submit
   - Assert: validation error messages appear for required fields
   - Assert: form is NOT submitted (no success message)

4. **Disable addon — component disappears**
   - Log in to admin
   - Navigate to addon manager for the demo tenant
   - Toggle contact form addon OFF
   - Save
   - Navigate to the tenant page that had the contact form
   - Assert: contact form is NOT visible on the page
   - Assert: other (non-addon) components on the page still render

5. **Re-enable addon — component reappears**
   - Log in to admin
   - Toggle contact form addon ON
   - Navigate to tenant page
   - Assert: contact form is visible again

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

### Task 4.8.4 — Write Playwright E2E test for addon admin management UI

File: `tests/e2e/phase4-addon-admin.spec.ts`

**Prerequisites**: Authenticated admin session.

**Test cases**:

1. **Addon manager lists all available addons**
   - Navigate to `/admin/tenants/{demoTenantId}/addons`
   - Assert: contact form addon listed with name and toggle
   - Assert: gallery addon listed
   - Assert: calendar addon listed

2. **Toggle addon on and off**
   - Assert: contact form addon is currently enabled (toggle ON)
   - Click toggle to disable
   - Assert: toggle reflects OFF state
   - Refresh page → assert toggle is still OFF (persisted)
   - Click toggle to enable
   - Assert: toggle reflects ON state

- **Run**: `npx playwright test tests/e2e/phase4-*.spec.ts`
- **Pass criteria**: All tests across all 3 spec files pass.
