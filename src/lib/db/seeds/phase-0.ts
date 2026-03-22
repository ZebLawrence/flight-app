import { eq, and } from 'drizzle-orm';
import { db } from '../index';
import { tenants, pages, addons, tenantAddonConfigs } from '../schema';

export async function seedPhase0() {
  // Upsert demo tenant
  const [demoTenant] = await db
    .insert(tenants)
    .values({
      name: 'Demo Business',
      slug: 'demo',
      theme: {},
    })
    .onConflictDoUpdate({
      target: tenants.slug,
      set: { name: 'Demo Business', theme: {} },
    })
    .returning();

  // Upsert internal test tenant
  const [internalTenant] = await db
    .insert(tenants)
    .values({
      name: 'Internal Test Tenant',
      slug: 'internal',
      customDomain: 'localhost',
      theme: {},
    })
    .onConflictDoUpdate({
      target: tenants.slug,
      set: { name: 'Internal Test Tenant', customDomain: 'localhost', theme: {} },
    })
    .returning();

  // Upsert demo tenant homepage
  const existingDemoPage = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.tenantId, demoTenant.id), eq(pages.slug, '')))
    .limit(1);

  if (existingDemoPage.length === 0) {
    await db.insert(pages).values({
      tenantId: demoTenant.id,
      slug: '',
      title: 'Hello World',
      published: true,
      sortOrder: 0,
      content: {
        type: 'Heading',
        props: { level: 1, text: 'Hello World' },
        children: [
          {
            type: 'Text',
            props: { content: 'Welcome to demo business' },
          },
        ],
      },
    });
  } else {
    await db
      .update(pages)
      .set({
        title: 'Hello World',
        published: true,
        sortOrder: 0,
        content: {
          type: 'Heading',
          props: { level: 1, text: 'Hello World' },
          children: [
            {
              type: 'Text',
              props: { content: 'Welcome to demo business' },
            },
          ],
        },
      })
      .where(and(eq(pages.tenantId, demoTenant.id), eq(pages.slug, '')));
  }

  // Upsert internal tenant homepage
  const existingInternalPage = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.tenantId, internalTenant.id), eq(pages.slug, '')))
    .limit(1);

  if (existingInternalPage.length === 0) {
    await db.insert(pages).values({
      tenantId: internalTenant.id,
      slug: '',
      title: 'Internal Test Tenant',
      published: true,
      sortOrder: 0,
      content: {
        type: 'Heading',
        props: { level: 1, text: 'Internal Test Tenant' },
        children: [
          {
            type: 'Text',
            props: { content: 'Welcome to internal test tenant' },
          },
        ],
      },
    });
  } else {
    await db
      .update(pages)
      .set({
        title: 'Internal Test Tenant',
        published: true,
        sortOrder: 0,
        content: {
          type: 'Heading',
          props: { level: 1, text: 'Internal Test Tenant' },
          children: [
            {
              type: 'Text',
              props: { content: 'Welcome to internal test tenant' },
            },
          ],
        },
      })
      .where(and(eq(pages.tenantId, internalTenant.id), eq(pages.slug, '')));
  }

  console.log('Phase 0 seed complete.');

  // Upsert analytics addon definition
  await db
    .insert(addons)
    .values({
      key: 'analytics',
      name: 'Analytics',
      description: 'Website analytics integration (GA4 or Plausible)',
      configSchema: {
        type: 'object',
        properties: {
          provider: { type: 'string', enum: ['ga4', 'plausible'] },
          trackingId: { type: 'string' },
          domain: { type: 'string' },
        },
      },
    })
    .onConflictDoUpdate({
      target: addons.key,
      set: {
        name: 'Analytics',
        description: 'Website analytics integration (GA4 or Plausible)',
      },
    });

  // Configure analytics addon for demo tenant (GA4 enabled by default)
  await db
    .insert(tenantAddonConfigs)
    .values({
      tenantId: demoTenant.id,
      addonKey: 'analytics',
      config: { provider: 'ga4', trackingId: 'G-DEMO1234567' },
      enabled: true,
    })
    .onConflictDoUpdate({
      target: [tenantAddonConfigs.tenantId, tenantAddonConfigs.addonKey],
      set: {
        config: { provider: 'ga4', trackingId: 'G-DEMO1234567' },
        enabled: true,
      },
    });
}
