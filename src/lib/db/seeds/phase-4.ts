import { eq, and } from 'drizzle-orm';
import { db } from '../index';
import { tenants, pages } from '../schema';

const TENANT_SLUG = 'demo';
const PAGE_SLUG = 'interactive-components';
const PAGE_TITLE = 'Interactive Components Demo';

const phase4PageContent = {
  type: 'Section',
  props: {},
  children: [
    {
      type: 'Accordion',
      props: {
        allowMultiple: false,
        items: [
          { title: 'Accordion Item 1', content: 'Content for accordion item 1' },
          { title: 'Accordion Item 2', content: 'Content for accordion item 2' },
          { title: 'Accordion Item 3', content: 'Content for accordion item 3' },
        ],
      },
    },
    {
      type: 'Tabs',
      props: {
        defaultTab: 0,
        tabs: [
          { label: 'Tab One', content: 'Tab one content' },
          { label: 'Tab Two', content: 'Tab two content' },
        ],
      },
    },
    {
      type: 'Carousel',
      props: {
        autoplay: false,
        interval: 3000,
        slides: [
          { image: 'https://placehold.co/800x400?text=Slide+1', alt: 'Slide 1' },
          { image: 'https://placehold.co/800x400?text=Slide+2', alt: 'Slide 2' },
        ],
      },
    },
    {
      type: 'Modal',
      props: {
        trigger: { label: 'Open Modal' },
      },
      children: [
        { type: 'Heading', props: { level: 2, text: 'Modal Title' } },
        { type: 'Text', props: { content: 'Modal body content.' } },
      ],
    },
  ],
};

export async function seedPhase4() {
  console.log('Seeding phase 4 — interactive components page...');

  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, TENANT_SLUG))
    .limit(1);

  if (!tenant) {
    console.warn(`Tenant "${TENANT_SLUG}" not found — skipping phase 4 seed.`);
    return;
  }

  const [existing] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.tenantId, tenant.id), eq(pages.slug, PAGE_SLUG)))
    .limit(1);

  if (existing) {
    await db
      .update(pages)
      .set({ title: PAGE_TITLE, content: phase4PageContent, published: true })
      .where(eq(pages.id, existing.id));
  } else {
    await db.insert(pages).values({
      tenantId: tenant.id,
      slug: PAGE_SLUG,
      title: PAGE_TITLE,
      content: phase4PageContent,
      published: true,
      sortOrder: 10,
    });
  }

  console.log('Phase 4 seed complete.');
}
