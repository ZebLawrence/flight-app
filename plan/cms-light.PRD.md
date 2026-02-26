# Product Requirements Document: Flight App — Multi-Tenant CMS

## Context

Build a lightweight, multi-tenant CMS that lets an operator (you) spin up custom marketing websites for clients without writing per-client code. All site content, structure, and theming are stored as JSON in a database and rendered through shared SSR components. This eliminates repetitive development work — adding a new client is a data/config task, not a code task. Modular features (calendar scheduling, contact forms, etc.) act as billable add-ons that can be toggled per client.

---

## 1. System Overview

```
                  ┌─────────────────────────────┐
                  │        Admin Panel           │
                  │   (Operator-only interface)  │
                  │   - Manage clients/sites     │
                  │   - Edit JSON configs        │
                  │   - Toggle add-on modules    │
                  │   - Upload media             │
                  └──────────┬──────────────────┘
                             │ CRUD
                             ▼
┌──────────┐     ┌──────────────────────┐     ┌──────────────┐
│  Client   │────▶│   Next.js SSR App    │────▶│  PostgreSQL  │
│  Request  │     │                      │     │  (JSON configs│
│ (domain)  │     │  1. Resolve tenant   │     │   + content)  │
└──────────┘     │  2. Fetch config     │     └──────────────┘
                  │  3. Render component │          │
                  │     tree from JSON   │     ┌──────────────┐
                  │  4. Return SSR HTML  │     │  S3-compat   │
                  └──────────────────────┘     │  (media)     │
                                                └──────────────┘
```

---

## 2. Tech Stack

| Layer         | Technology                                  |
|---------------|---------------------------------------------|
| Framework     | **Next.js** (App Router, SSR)               |
| Language      | **TypeScript**                              |
| Database      | **PostgreSQL** (JSONB columns for configs)  |
| ORM           | **Prisma** or **Drizzle**                   |
| Media Storage | **S3-compatible** (AWS S3 or MinIO)         |
| Admin UI      | Next.js route group (`/admin/...`)          |
| Styling       | **Tailwind CSS**                            |
| Deployment    | **Docker** (self-hosted)                    |

---

## 3. Multi-Tenancy & Domain Routing

### 3.1 Domain Resolution
- Each client gets a default subdomain: `{slug}.yourplatform.com`
- Clients can optionally map a custom domain (e.g., `clientbusiness.com`)
- Incoming request flow:
  1. Extract hostname from request
  2. Look up tenant by `custom_domain` field first, then by subdomain `slug`
  3. If no match → 404 / landing page
  4. Load tenant config and render

### 3.2 Domain Configuration
- Custom domains stored in a `domains` table linked to the tenant
- SSL handled at the reverse proxy layer (e.g., Caddy with automatic HTTPS or Traefik)
- Admin UI provides instructions for DNS setup (CNAME to platform)

---

## 4. Data Model

### 4.1 Core Tables

**tenants**
| Column         | Type      | Description                          |
|----------------|-----------|--------------------------------------|
| id             | UUID PK   | Tenant identifier                    |
| name           | TEXT      | Client business name                 |
| slug           | TEXT UQ   | Subdomain slug                       |
| custom_domain  | TEXT UQ?  | Optional custom domain               |
| theme          | JSONB     | Global theme config (colors, fonts, logo) |
| enabled_addons | TEXT[]    | List of active add-on module keys    |
| created_at     | TIMESTAMP |                                      |
| updated_at     | TIMESTAMP |                                      |

**pages**
| Column      | Type      | Description                            |
|-------------|-----------|----------------------------------------|
| id          | UUID PK   | Page identifier                        |
| tenant_id   | UUID FK   | Owning tenant                          |
| slug        | TEXT      | URL path (e.g., `/about`, `/services`) |
| title       | TEXT      | Page title (for `<title>` tag)         |
| meta        | JSONB     | SEO metadata (description, og tags)    |
| content     | JSONB     | Freeform component tree (see §5)      |
| sort_order  | INT       | For nav ordering                       |
| published   | BOOLEAN   | Draft vs live                          |
| created_at  | TIMESTAMP |                                        |
| updated_at  | TIMESTAMP |                                        |

**blog_posts**
| Column      | Type      | Description                            |
|-------------|-----------|----------------------------------------|
| id          | UUID PK   |                                        |
| tenant_id   | UUID FK   |                                        |
| slug        | TEXT      | URL path (`/blog/{slug}`)              |
| title       | TEXT      |                                        |
| excerpt     | TEXT      | Short summary for listings             |
| content     | TEXT      | Markdown body                          |
| tags        | TEXT[]    |                                        |
| author      | TEXT      |                                        |
| featured_image | TEXT   | S3 URL                                 |
| published   | BOOLEAN   |                                        |
| published_at| TIMESTAMP |                                        |
| created_at  | TIMESTAMP |                                        |
| updated_at  | TIMESTAMP |                                        |

**media**
| Column      | Type      | Description                            |
|-------------|-----------|----------------------------------------|
| id          | UUID PK   |                                        |
| tenant_id   | UUID FK   |                                        |
| filename    | TEXT      | Original filename                      |
| s3_key      | TEXT      | Storage path                           |
| url         | TEXT      | Public/CDN URL                         |
| mime_type   | TEXT      |                                        |
| size_bytes  | INT       |                                        |
| created_at  | TIMESTAMP |                                        |

**addons**
| Column      | Type      | Description                            |
|-------------|-----------|----------------------------------------|
| id          | UUID PK   |                                        |
| key         | TEXT UQ   | e.g., `calendar`, `contact_form`       |
| name        | TEXT      | Display name                           |
| description | TEXT      |                                        |
| config_schema | JSONB   | JSON Schema for per-tenant addon config|

**tenant_addon_configs**
| Column      | Type      | Description                            |
|-------------|-----------|----------------------------------------|
| tenant_id   | UUID FK   |                                        |
| addon_key   | TEXT FK   |                                        |
| config      | JSONB     | Per-tenant addon configuration         |
| enabled     | BOOLEAN   |                                        |

---

## 5. Content Model — Freeform Component Tree

Each page's `content` column holds a JSON component tree. Every node is a component with a `type`, optional `props`, and optional `children`.

### 5.1 Schema

```jsonc
{
  "type": "Section",
  "props": { "className": "bg-gray-50 py-16" },
  "children": [
    {
      "type": "Container",
      "children": [
        {
          "type": "Heading",
          "props": { "level": 1, "text": "Welcome to Our Business" }
        },
        {
          "type": "Text",
          "props": { "content": "We provide excellent services..." }
        },
        {
          "type": "Button",
          "props": { "label": "Get Started", "href": "/contact", "variant": "primary" }
        }
      ]
    }
  ]
}
```

### 5.2 Component Registry

A central registry maps `type` strings to React components. This is the extensibility point — adding a new component means:
1. Create the React component
2. Register it in the registry
3. It's immediately available in any client's JSON config

### 5.3 Launch Components

**Layout primitives:**
- `Section` — full-width section wrapper with background/padding props
- `Container` — max-width centered wrapper
- `Grid` — CSS grid with configurable columns/gap
- `Row` / `Column` — flex-based layout
- `Spacer` — vertical/horizontal spacing

**Content primitives:**
- `Heading` — h1–h6 with text prop
- `Text` — paragraph/rich text
- `Image` — with src, alt, sizing props
- `Button` — with label, href, variant
- `Link` — inline/block link
- `Icon` — icon by name (from an icon set)
- `List` — ordered/unordered list
- `Card` — composable card wrapper

**Interactive components (pattern examples):**
- `Accordion` — collapsible sections (items prop with title/content pairs)
- `Tabs` — tabbed content (tabs prop with label/content pairs)
- `Carousel` — image/content slider (slides prop)
- `Modal` — trigger + overlay content (trigger prop + children for content)

These interactive components establish the pattern for how stateful/interactive components work within the tree — client-side hydration for interactivity while SSR renders the initial/default state.

### 5.4 Component Rendering Engine

```
renderComponentTree(node, registry, theme) → React Element
  1. Look up node.type in registry
  2. If not found → render nothing (or a dev warning)
  3. Merge theme tokens into props
  4. If node.children → recursively render each child
  5. Return <Component {...props}>{renderedChildren}</Component>
```

---

## 6. Theming

Each tenant has a `theme` JSONB column:

```jsonc
{
  "colors": {
    "primary": "#2563EB",
    "secondary": "#7C3AED",
    "accent": "#F59E0B",
    "background": "#FFFFFF",
    "text": "#111827"
  },
  "fonts": {
    "heading": "Inter",
    "body": "Inter"
  },
  "logo": "https://s3.../logo.png",
  "favicon": "https://s3.../favicon.ico",
  "borderRadius": "8px"
}
```

- Theme values are injected as CSS custom properties at the page root
- Components reference theme tokens (`var(--color-primary)`) rather than hardcoded values
- Tailwind config extended to use CSS variables so utility classes pick up the theme

---

## 7. Admin Interface

Accessible at `/admin` (protected by auth). Operator-only — no client-facing access.

### 7.1 Auth
- Simple email/password auth (or OAuth) for the single operator account
- Middleware protects all `/admin` routes

### 7.2 Screens

| Screen                  | Purpose                                           |
|-------------------------|---------------------------------------------------|
| Dashboard               | List of all tenants with status, quick stats      |
| Tenant Detail           | Edit tenant name, slug, domain, theme             |
| Pages List              | All pages for a tenant, reorder, create/delete    |
| Page Editor             | JSON editor (with tree view) for page content     |
| Blog Posts List         | All posts for a tenant                            |
| Blog Post Editor        | Markdown editor with preview, frontmatter fields  |
| Media Library           | Upload/browse/delete media for a tenant           |
| Add-ons Manager         | Toggle add-ons per tenant, configure each         |

### 7.3 Page Editor
- Start with a structured JSON editor (tree view with forms for each component's props)
- Visual preview panel showing the rendered page alongside the editor
- Component palette for drag-and-drop or insert-at-cursor

---

## 8. Modular Add-ons System

### 8.1 Architecture
- Each add-on is a self-contained module with:
  - **Component(s)** — registered in the component registry (e.g., `CalendarWidget`, `ContactForm`)
  - **API route(s)** — if the add-on needs server-side logic (e.g., form submission handler)
  - **Config schema** — JSON Schema defining what per-tenant config the add-on needs
  - **Admin UI** — config panel rendered in the admin add-ons manager

### 8.2 Feature Gating
- `tenant.enabled_addons` array controls which add-ons are active
- Component renderer checks: if a component's type belongs to an add-on not enabled for the tenant → skip rendering
- API routes for add-ons check enablement before processing

### 8.3 Launch Add-ons

| Add-on           | Components                | Config                          |
|------------------|---------------------------|---------------------------------|
| Calendar         | `CalendarWidget`          | Booking URL, availability rules |
| Contact Forms    | `ContactForm`             | Fields, recipient email, CRM    |
| Image Gallery    | `Gallery`, `Lightbox`     | Layout style, image sources     |
| SEO Tools        | *(no components)*         | Sitemap settings, schema markup |

---

## 9. Blog System

- Blog posts stored as Markdown with metadata in the `blog_posts` table
- Rendered server-side using a Markdown-to-HTML library (e.g., `remark` + `rehype`)
- Blog listing page auto-generated at `/blog` for each tenant
- Individual posts at `/blog/{slug}`
- Features: tags, author, featured image, excerpt, published/draft status
- Blog section is opt-in per tenant (could be an add-on, or a base feature toggled via config)

---

## 10. SEO

- Every page has a `meta` JSONB field for: title, description, Open Graph tags, canonical URL
- SSR ensures full HTML content is delivered to crawlers
- Auto-generated `sitemap.xml` per tenant (all published pages + blog posts)
- `robots.txt` per tenant
- Structured data (JSON-LD) support via the SEO add-on
- Proper `<head>` management via Next.js Metadata API

---

## 11. Deployment (Docker / Self-Hosted)

### 11.1 Services
```yaml
# docker-compose.yml
services:
  app:        # Next.js application
  db:         # PostgreSQL
  minio:      # S3-compatible object storage (or use external S3)
  proxy:      # Caddy or Traefik (SSL termination + domain routing)
```

### 11.2 Reverse Proxy
- Caddy recommended for automatic HTTPS via Let's Encrypt
- Wildcard cert for `*.yourplatform.com`
- Custom domain SSL via Caddy's on-demand TLS or manual cert provisioning

### 11.3 Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` — media storage
- `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` — operator auth
- `PLATFORM_DOMAIN` — base domain for subdomains
- `NODE_ENV` — production/development

---

## 12. Non-Functional Requirements

- **Performance**: Pages should render in <200ms server-side. Leverage Next.js caching (ISR or on-demand revalidation) to avoid hitting the DB on every request.
- **Scalability**: Stateless app container — scale horizontally behind the proxy. DB and S3 are the shared state.
- **Security**: Tenant isolation at the query level (all queries scoped by `tenant_id`). Admin auth required for all mutations. Input validation on JSON configs against component schemas.

---

## 13. Implementation Phases

### Phase 1 — Core Foundation
- Project setup (Next.js, TypeScript, Tailwind, Prisma/Drizzle, Docker)
- Database schema + migrations
- Tenant resolution middleware (subdomain + custom domain)
- Component registry + rendering engine
- Core layout + content components
- Basic theme system (CSS variables)
- SSR page rendering from JSON

### Phase 2 — Admin Panel
- Admin auth (operator login)
- Tenant CRUD (create, list, edit, delete)
- Page CRUD with JSON editor
- Theme editor
- Media upload to S3

### Phase 3 — Blog & Content
- Blog post CRUD in admin
- Markdown rendering pipeline
- Blog listing + detail pages
- Blog-specific SEO (structured data, RSS feed)

### Phase 4 — Interactive Components & Add-ons
- Accordion, Tabs, Carousel, Modal components
- Add-on system architecture (registry, gating, config)
- Calendar scheduling add-on
- Contact forms add-on
- Image gallery add-on

### Phase 5 — SEO & Polish
- Sitemap generation per tenant
- robots.txt per tenant
- JSON-LD / structured data via SEO add-on
- Performance optimization (caching, ISR)
- Page editor UX improvements (preview, component palette)

### Phase 6 — Production Readiness
- Docker Compose production config
- Caddy/Traefik setup with auto-SSL
- Backup strategy for DB + S3
- Monitoring / health checks
- Documentation

---

## Verification

After each phase, verify by:
1. **Phase 1**: Create a tenant via DB seed, visit `tenant-slug.localhost:3000`, confirm SSR renders the JSON component tree with theming applied
2. **Phase 2**: Log into `/admin`, create a new tenant, add pages, confirm they render on the tenant's subdomain
3. **Phase 3**: Create a blog post in admin, confirm it renders at `/blog/{slug}` with proper Markdown formatting
4. **Phase 4**: Add interactive components to a page's JSON, confirm they render and hydrate correctly. Toggle an add-on off and confirm the component is hidden.
5. **Phase 5**: Check `/sitemap.xml`, validate SEO meta tags in page source, test with Lighthouse
6. **Phase 6**: `docker compose up` on a fresh machine and verify full functionality
