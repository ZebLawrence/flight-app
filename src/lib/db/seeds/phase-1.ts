import { eq, and } from 'drizzle-orm';
import { db } from '../index';
import { tenants, pages } from '../schema';

const phase1Theme = {
  colors: {
    primary: '#2563EB',
    secondary: '#7C3AED',
    accent: '#F59E0B',
    background: '#FFFFFF',
    text: '#111827',
  },
  fonts: { heading: 'Inter', body: 'Inter' },
  logo: 'https://placehold.co/200x60?text=Demo+Logo',
  favicon: 'https://placehold.co/32x32',
  borderRadius: '8px',
};

const phase1HomeContent = {
  type: 'Section',
  props: { background: '#FFFFFF', padding: '0' },
  children: [
    // Header
    {
      type: 'Header',
      props: {
        logo: 'https://placehold.co/200x60?text=Demo+Logo',
        navItems: [
          { label: 'Home', href: '/' },
          { label: 'Features', href: '#features' },
          { label: 'About', href: '#about' },
          { label: 'Services', href: '#services' },
        ],
        cta: { label: 'Get Started', href: '#contact' },
        sticky: true,
      },
    },
    // Spacer
    { type: 'Spacer', props: { size: 16 } },
    // Hero section
    {
      type: 'Section',
      props: { background: '#EFF6FF', padding: '80px 0' },
      children: [
        {
          type: 'Container',
          props: { maxWidth: '900px' },
          children: [
            { type: 'Heading', props: { level: 1, text: 'Welcome to Demo Business', align: 'center' } },
            { type: 'Text', props: { content: 'The all-in-one platform to power your online presence. Fast, flexible, and built for growth.' } },
            { type: 'Button', props: { label: 'Get Started', href: '#features', variant: 'primary' } },
          ],
        },
      ],
    },
    // Spacer
    { type: 'Spacer', props: { size: 40 } },
    // Features section
    {
      type: 'Section',
      props: { id: 'features', background: '#FFFFFF', padding: '60px 0' },
      children: [
        {
          type: 'Container',
          props: { maxWidth: '1200px' },
          children: [
            { type: 'Heading', props: { level: 2, text: 'Features', align: 'center' } },
            {
              type: 'Grid',
              props: { columns: 3, gap: '32px' },
              children: [
                {
                  type: 'Card',
                  props: { title: 'Lightning Fast', image: 'https://placehold.co/400x200?text=Fast' },
                  children: [
                    { type: 'Text', props: { content: 'Optimised for speed with server-side rendering and edge caching.' } },
                  ],
                },
                {
                  type: 'Card',
                  props: { title: 'Fully Customisable', image: 'https://placehold.co/400x200?text=Custom' },
                  children: [
                    { type: 'Text', props: { content: 'Tailor every aspect of your site with our powerful theme engine.' } },
                  ],
                },
                {
                  type: 'Card',
                  props: { title: 'Scale Effortlessly', image: 'https://placehold.co/400x200?text=Scale' },
                  children: [
                    { type: 'Text', props: { content: 'Handles millions of visitors without breaking a sweat.' } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    // Spacer
    { type: 'Spacer', props: { size: 40 } },
    // About section
    {
      type: 'Section',
      props: { id: 'about', background: '#F9FAFB', padding: '60px 0' },
      children: [
        {
          type: 'Container',
          props: { maxWidth: '1200px' },
          children: [
            { type: 'Heading', props: { level: 2, text: 'About Us', align: 'left' } },
            {
              type: 'Row',
              props: { align: 'center', justify: 'space-between' },
              children: [
                {
                  type: 'Column',
                  props: { span: 6 },
                  children: [
                    { type: 'Image', props: { src: 'https://placehold.co/600x400?text=About+Us', alt: 'About Demo Business', width: 600, height: 400, objectFit: 'cover' } },
                  ],
                },
                {
                  type: 'Column',
                  props: { span: 6 },
                  children: [
                    { type: 'Text', props: { content: 'We are a passionate team dedicated to helping businesses thrive online. Our platform combines the best tools with an intuitive interface.' } },
                    {
                      type: 'List',
                      props: {
                        ordered: false,
                        items: [
                          'Multi-tenant SaaS architecture',
                          'Flexible content modelling',
                          'Real-time analytics',
                          'Enterprise-grade security',
                        ],
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    // Spacer
    { type: 'Spacer', props: { size: 40 } },
    // Services section
    {
      type: 'Section',
      props: { id: 'services', background: '#FFFFFF', padding: '60px 0' },
      children: [
        {
          type: 'Container',
          props: { maxWidth: '1200px' },
          children: [
            { type: 'Heading', props: { level: 2, text: 'Our Services', align: 'center' } },
            {
              type: 'Grid',
              props: { columns: 2, gap: '24px' },
              children: [
                {
                  type: 'Row',
                  props: { align: 'flex-start' },
                  children: [
                    { type: 'Icon', props: { name: 'Globe', size: 32, color: '#2563EB' } },
                    {
                      type: 'Column',
                      props: { span: 12 },
                      children: [
                        { type: 'Heading', props: { level: 4, text: 'Web Design' } },
                        { type: 'Text', props: { content: 'Beautiful, responsive websites tailored to your brand.' } },
                        { type: 'Link', props: { label: 'Learn more', href: '#contact' } },
                      ],
                    },
                  ],
                },
                {
                  type: 'Row',
                  props: { align: 'flex-start' },
                  children: [
                    { type: 'Icon', props: { name: 'BarChart2', size: 32, color: '#7C3AED' } },
                    {
                      type: 'Column',
                      props: { span: 12 },
                      children: [
                        { type: 'Heading', props: { level: 4, text: 'Analytics' } },
                        { type: 'Text', props: { content: 'Deep insights into your visitors and conversions.' } },
                        { type: 'Link', props: { label: 'Learn more', href: '#contact' } },
                      ],
                    },
                  ],
                },
                {
                  type: 'Row',
                  props: { align: 'flex-start' },
                  children: [
                    { type: 'Icon', props: { name: 'ShieldCheck', size: 32, color: '#F59E0B' } },
                    {
                      type: 'Column',
                      props: { span: 12 },
                      children: [
                        { type: 'Heading', props: { level: 4, text: 'Security' } },
                        { type: 'Text', props: { content: 'Enterprise-grade protection for your data and users.' } },
                        { type: 'Link', props: { label: 'Learn more', href: '#contact' } },
                      ],
                    },
                  ],
                },
                {
                  type: 'Row',
                  props: { align: 'flex-start' },
                  children: [
                    { type: 'Icon', props: { name: 'Zap', size: 32, color: '#2563EB' } },
                    {
                      type: 'Column',
                      props: { span: 12 },
                      children: [
                        { type: 'Heading', props: { level: 4, text: 'Performance' } },
                        { type: 'Text', props: { content: 'Blazing-fast load times that keep visitors engaged.' } },
                        { type: 'Link', props: { label: 'Learn more', href: '#contact' } },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    // Spacer
    { type: 'Spacer', props: { size: 40 } },
    // Footer
    {
      type: 'Footer',
      props: {
        columns: [
          {
            heading: 'Product',
            links: [
              { label: 'Features', href: '#features' },
              { label: 'Pricing', href: '/pricing' },
              { label: 'Changelog', href: '/changelog' },
            ],
          },
          {
            heading: 'Company',
            links: [
              { label: 'About', href: '#about' },
              { label: 'Blog', href: '/blog' },
              { label: 'Careers', href: '/careers' },
            ],
          },
          {
            heading: 'Support',
            links: [
              { label: 'Docs', href: '/docs' },
              { label: 'Contact', href: '#contact' },
              { label: 'Status', href: '/status' },
            ],
          },
        ],
        copyright: '© 2024 Demo Business. All rights reserved.',
        socialLinks: [
          { platform: 'twitter', href: 'https://twitter.com/demobusiness' },
          { platform: 'github', href: 'https://github.com/demobusiness' },
          { platform: 'linkedin', href: 'https://linkedin.com/company/demobusiness' },
        ],
      },
    },
  ],
};

export async function seedPhase1() {
  // Apply full theme to demo tenant
  await db
    .update(tenants)
    .set({ theme: phase1Theme })
    .where(eq(tenants.slug, 'demo'));

  // Upsert multi-section homepage for demo tenant
  const [demoTenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, 'demo'))
    .limit(1);

  if (!demoTenant) {
    throw new Error('Demo tenant not found — run Phase 0 seed first');
  }

  const existingPage = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.tenantId, demoTenant.id), eq(pages.slug, '')))
    .limit(1);

  if (existingPage.length === 0) {
    await db.insert(pages).values({
      tenantId: demoTenant.id,
      slug: '',
      title: 'Home',
      published: true,
      sortOrder: 0,
      content: phase1HomeContent,
    });
  } else {
    await db
      .update(pages)
      .set({
        title: 'Home',
        published: true,
        sortOrder: 0,
        content: phase1HomeContent,
      })
      .where(and(eq(pages.tenantId, demoTenant.id), eq(pages.slug, '')));
  }

  console.log('Phase 1 seed complete.');
}
