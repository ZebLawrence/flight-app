import { eq, and } from 'drizzle-orm';
import { db } from '../index';
import { tenants, pages } from '../schema';

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
        type: 'Section',
        props: {},
        children: [
          {
            type: 'Heading',
            props: { level: 1, text: 'Hello World' },
          },
          {
            type: 'Text',
            props: { content: 'Welcome to demo business' },
          },
        ],
      },
    });
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
        type: 'Section',
        props: {},
        children: [
          {
            type: 'Heading',
            props: { level: 1, text: 'Internal Test Tenant' },
          },
          {
            type: 'Text',
            props: { content: 'Welcome to internal test tenant' },
          },
        ],
      },
    });
  }

  console.log('Phase 0 seed complete.');
}
