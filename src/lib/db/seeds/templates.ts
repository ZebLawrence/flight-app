import { eq, and } from 'drizzle-orm';
import { db } from '../index';
import { tenants, pages } from '../schema';

// ─── Restaurant Template ───────────────────────────────────────────────────────

const restaurantTheme = {
  colors: {
    primary: '#C0392B',
    secondary: '#E67E22',
    accent: '#F39C12',
    background: '#FFFDF9',
    text: '#2C1810',
  },
  fonts: { heading: 'Playfair Display', body: 'Lato' },
  logo: 'https://placehold.co/200x60?text=Restaurant',
  favicon: 'https://placehold.co/32x32',
  borderRadius: '4px',
};

const restaurantHomeContent = {
  type: 'Section',
  props: { background: '#FFFDF9', padding: '0' },
  children: [
    {
      type: 'Header',
      props: {
        logo: 'https://placehold.co/200x60?text=Restaurant',
        navItems: [
          { label: 'Home', href: '/' },
          { label: 'Menu', href: '/menu' },
          { label: 'Contact', href: '/contact' },
        ],
        cta: { label: 'Reserve a Table', href: '/contact' },
        sticky: true,
      },
    },
    {
      type: 'Section',
      props: { background: '#C0392B', padding: '100px 0' },
      children: [
        {
          type: 'Container',
          props: { maxWidth: '800px' },
          children: [
            {
              type: 'Heading',
              props: { level: 1, text: 'Taste the Tradition', align: 'center' },
            },
            {
              type: 'Text',
              props: {
                content:
                  'Handcrafted dishes made with locally sourced ingredients, served in a warm and welcoming atmosphere.',
              },
            },
            {
              type: 'Row',
              props: { justify: 'center', align: 'center' },
              children: [
                {
                  type: 'Button',
                  props: { label: 'View Our Menu', href: '/menu', variant: 'secondary' },
                },
                { type: 'Spacer', props: { height: '16px' } },
                {
                  type: 'Button',
                  props: { label: 'Reserve a Table', href: '/contact', variant: 'outline' },
                },
              ],
            },
          ],
        },
      ],
    },
    { type: 'Spacer', props: { height: '60px' } },
    {
      type: 'Section',
      props: { background: '#FFFDF9', padding: '60px 0' },
      children: [
        {
          type: 'Container',
          props: { maxWidth: '1100px' },
          children: [
            { type: 'Heading', props: { level: 2, text: 'Our Signature Dishes', align: 'center' } },
            { type: 'Spacer', props: { height: '32px' } },
            {
              type: 'Grid',
              props: { columns: 3, gap: '28px' },
              children: [
                {
                  type: 'Card',
                  props: {
                    title: 'Wood-Fired Pizza',
                    image: 'https://placehold.co/400x250?text=Pizza',
                  },
                  children: [
                    {
                      type: 'Text',
                      props: {
                        content:
                          'Thin crust topped with house-made tomato sauce, fresh mozzarella, and seasonal vegetables.',
                      },
                    },
                  ],
                },
                {
                  type: 'Card',
                  props: {
                    title: 'Grilled Salmon',
                    image: 'https://placehold.co/400x250?text=Salmon',
                  },
                  children: [
                    {
                      type: 'Text',
                      props: {
                        content:
                          'Atlantic salmon fillet with lemon butter sauce, served with seasonal greens.',
                      },
                    },
                  ],
                },
                {
                  type: 'Card',
                  props: {
                    title: 'Chocolate Fondant',
                    image: 'https://placehold.co/400x250?text=Dessert',
                  },
                  children: [
                    {
                      type: 'Text',
                      props: {
                        content:
                          'Warm dark chocolate cake with a molten centre, served with vanilla ice cream.',
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
    { type: 'Spacer', props: { height: '40px' } },
    {
      type: 'Footer',
      props: {
        columns: [
          {
            title: 'Visit Us',
            links: [
              { label: 'Menu', href: '/menu' },
              { label: 'Reservations', href: '/contact' },
            ],
          },
          {
            title: 'Hours',
            links: [
              { label: 'Mon–Fri: 11am–10pm', href: '#' },
              { label: 'Sat–Sun: 10am–11pm', href: '#' },
            ],
          },
        ],
        copyright: '© 2026 Starter Restaurant. All rights reserved.',
        socialLinks: [
          { icon: 'instagram', href: 'https://instagram.com' },
          { icon: 'facebook', href: 'https://facebook.com' },
        ],
      },
    },
  ],
};

const restaurantMenuContent = {
  type: 'Section',
  props: { background: '#FFFDF9', padding: '60px 0' },
  children: [
    {
      type: 'Container',
      props: { maxWidth: '900px' },
      children: [
        { type: 'Heading', props: { level: 1, text: 'Our Menu', align: 'center' } },
        { type: 'Spacer', props: { height: '40px' } },
        { type: 'Heading', props: { level: 2, text: 'Starters', align: 'left' } },
        {
          type: 'List',
          props: {
            ordered: false,
            items: ['Bruschetta al Pomodoro — $8', 'Calamari Fritti — $12', 'Soup of the Day — $7'],
          },
        },
        { type: 'Spacer', props: { height: '24px' } },
        { type: 'Heading', props: { level: 2, text: 'Mains', align: 'left' } },
        {
          type: 'List',
          props: {
            ordered: false,
            items: [
              'Wood-Fired Pizza Margherita — $18',
              'Grilled Atlantic Salmon — $26',
              'Slow-Braised Beef Short Rib — $32',
            ],
          },
        },
        { type: 'Spacer', props: { height: '24px' } },
        { type: 'Heading', props: { level: 2, text: 'Desserts', align: 'left' } },
        {
          type: 'List',
          props: {
            ordered: false,
            items: [
              'Chocolate Fondant — $10',
              'Crème Brûlée — $9',
              'Seasonal Sorbet (3 scoops) — $8',
            ],
          },
        },
      ],
    },
  ],
};

const restaurantContactContent = {
  type: 'Section',
  props: { background: '#FFFDF9', padding: '80px 0' },
  children: [
    {
      type: 'Container',
      props: { maxWidth: '700px' },
      children: [
        { type: 'Heading', props: { level: 1, text: 'Contact & Reservations', align: 'center' } },
        { type: 'Spacer', props: { height: '24px' } },
        {
          type: 'Row',
          props: { align: 'flex-start', justify: 'space-between' },
          children: [
            {
              type: 'Column',
              props: { span: 6 },
              children: [
                { type: 'Heading', props: { level: 3, text: 'Find Us' } },
                { type: 'Text', props: { content: '123 Main Street, Old Town' } },
                { type: 'Text', props: { content: 'Phone: (555) 123-4567' } },
                { type: 'Text', props: { content: 'Email: hello@restaurant.example' } },
              ],
            },
            {
              type: 'Column',
              props: { span: 6 },
              children: [
                { type: 'Heading', props: { level: 3, text: 'Opening Hours' } },
                { type: 'Text', props: { content: 'Monday–Friday: 11am – 10pm' } },
                { type: 'Text', props: { content: 'Saturday–Sunday: 10am – 11pm' } },
              ],
            },
          ],
        },
        { type: 'Spacer', props: { height: '32px' } },
        {
          type: 'Button',
          props: { label: 'Call to Reserve', href: 'tel:5551234567', variant: 'primary' },
        },
      ],
    },
  ],
};

// ─── Agency Template ───────────────────────────────────────────────────────────

const agencyTheme = {
  colors: {
    primary: '#1D4ED8',
    secondary: '#7C3AED',
    accent: '#06B6D4',
    background: '#0F172A',
    text: '#F1F5F9',
  },
  fonts: { heading: 'Inter', body: 'Inter' },
  logo: 'https://placehold.co/200x60?text=Agency',
  favicon: 'https://placehold.co/32x32',
  borderRadius: '6px',
};

const agencyHomeContent = {
  type: 'Section',
  props: { background: '#0F172A', padding: '0' },
  children: [
    {
      type: 'Header',
      props: {
        logo: 'https://placehold.co/200x60?text=Agency',
        navItems: [
          { label: 'Home', href: '/' },
          { label: 'Services', href: '/services' },
          { label: 'About', href: '/about' },
          { label: 'Contact', href: '/contact' },
        ],
        cta: { label: 'Get a Quote', href: '/contact' },
        sticky: true,
      },
    },
    {
      type: 'Section',
      props: { background: 'linear-gradient(135deg,#1D4ED8,#7C3AED)', padding: '120px 0' },
      children: [
        {
          type: 'Container',
          props: { maxWidth: '900px' },
          children: [
            {
              type: 'Heading',
              props: { level: 1, text: 'We Build Digital Experiences That Convert', align: 'center' },
            },
            {
              type: 'Text',
              props: {
                content:
                  'Strategy, design, and development under one roof — helping brands grow faster online.',
              },
            },
            {
              type: 'Button',
              props: { label: 'Explore Our Work', href: '/services', variant: 'primary' },
            },
          ],
        },
      ],
    },
    { type: 'Spacer', props: { height: '60px' } },
    {
      type: 'Section',
      props: { background: '#1E293B', padding: '60px 0' },
      children: [
        {
          type: 'Container',
          props: { maxWidth: '1100px' },
          children: [
            { type: 'Heading', props: { level: 2, text: 'What We Do', align: 'center' } },
            { type: 'Spacer', props: { height: '40px' } },
            {
              type: 'Grid',
              props: { columns: 2, gap: '32px' },
              children: [
                {
                  type: 'Row',
                  props: { align: 'flex-start' },
                  children: [
                    { type: 'Icon', props: { name: 'Layers', size: 36, color: '#06B6D4' } },
                    {
                      type: 'Column',
                      props: { span: 12 },
                      children: [
                        { type: 'Heading', props: { level: 4, text: 'Brand Strategy' } },
                        {
                          type: 'Text',
                          props: {
                            content:
                              'We develop a clear brand voice and visual identity that resonates with your audience.',
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'Row',
                  props: { align: 'flex-start' },
                  children: [
                    { type: 'Icon', props: { name: 'Monitor', size: 36, color: '#1D4ED8' } },
                    {
                      type: 'Column',
                      props: { span: 12 },
                      children: [
                        { type: 'Heading', props: { level: 4, text: 'Web Development' } },
                        {
                          type: 'Text',
                          props: {
                            content:
                              'High-performance websites and web apps built with the latest technology stack.',
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'Row',
                  props: { align: 'flex-start' },
                  children: [
                    { type: 'Icon', props: { name: 'TrendingUp', size: 36, color: '#7C3AED' } },
                    {
                      type: 'Column',
                      props: { span: 12 },
                      children: [
                        { type: 'Heading', props: { level: 4, text: 'Growth Marketing' } },
                        {
                          type: 'Text',
                          props: {
                            content:
                              'Data-driven campaigns across SEO, paid ads, and social media to drive measurable growth.',
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'Row',
                  props: { align: 'flex-start' },
                  children: [
                    { type: 'Icon', props: { name: 'Smartphone', size: 36, color: '#06B6D4' } },
                    {
                      type: 'Column',
                      props: { span: 12 },
                      children: [
                        { type: 'Heading', props: { level: 4, text: 'Mobile Apps' } },
                        {
                          type: 'Text',
                          props: {
                            content:
                              'Native and cross-platform mobile applications with polished user experiences.',
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
      ],
    },
    { type: 'Spacer', props: { height: '40px' } },
    {
      type: 'Footer',
      props: {
        columns: [
          {
            title: 'Services',
            links: [
              { label: 'Brand Strategy', href: '/services' },
              { label: 'Web Development', href: '/services' },
              { label: 'Growth Marketing', href: '/services' },
            ],
          },
          {
            title: 'Company',
            links: [
              { label: 'About', href: '/about' },
              { label: 'Contact', href: '/contact' },
            ],
          },
        ],
        copyright: '© 2026 Starter Agency. All rights reserved.',
        socialLinks: [
          { icon: 'twitter', href: 'https://twitter.com' },
          { icon: 'linkedin', href: 'https://linkedin.com' },
          { icon: 'github', href: 'https://github.com' },
        ],
      },
    },
  ],
};

const agencyServicesContent = {
  type: 'Section',
  props: { background: '#0F172A', padding: '80px 0' },
  children: [
    {
      type: 'Container',
      props: { maxWidth: '1000px' },
      children: [
        { type: 'Heading', props: { level: 1, text: 'Our Services', align: 'center' } },
        { type: 'Spacer', props: { height: '16px' } },
        {
          type: 'Text',
          props: {
            content:
              'End-to-end digital services tailored to your business goals. We partner with you at every stage of growth.',
          },
        },
        { type: 'Spacer', props: { height: '48px' } },
        {
          type: 'Grid',
          props: { columns: 3, gap: '24px' },
          children: [
            {
              type: 'Card',
              props: {
                title: 'Brand Strategy',
                image: 'https://placehold.co/400x200?text=Strategy',
              },
              children: [
                {
                  type: 'Text',
                  props: {
                    content: 'Position your brand to stand out and connect with your target market.',
                  },
                },
                { type: 'Link', props: { text: 'Learn more', href: '/contact' } },
              ],
            },
            {
              type: 'Card',
              props: {
                title: 'Web Development',
                image: 'https://placehold.co/400x200?text=Dev',
              },
              children: [
                {
                  type: 'Text',
                  props: {
                    content: 'Custom, scalable web solutions built for performance and growth.',
                  },
                },
                { type: 'Link', props: { text: 'Learn more', href: '/contact' } },
              ],
            },
            {
              type: 'Card',
              props: {
                title: 'Growth Marketing',
                image: 'https://placehold.co/400x200?text=Marketing',
              },
              children: [
                {
                  type: 'Text',
                  props: {
                    content: 'SEO, paid search, and social campaigns that deliver real ROI.',
                  },
                },
                { type: 'Link', props: { text: 'Learn more', href: '/contact' } },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const agencyAboutContent = {
  type: 'Section',
  props: { background: '#0F172A', padding: '80px 0' },
  children: [
    {
      type: 'Container',
      props: { maxWidth: '1000px' },
      children: [
        { type: 'Heading', props: { level: 1, text: 'About Us', align: 'center' } },
        { type: 'Spacer', props: { height: '40px' } },
        {
          type: 'Row',
          props: { align: 'center', justify: 'space-between' },
          children: [
            {
              type: 'Column',
              props: { span: 6 },
              children: [
                {
                  type: 'Image',
                  props: {
                    src: 'https://placehold.co/500x380?text=Our+Team',
                    alt: 'Our team',
                    width: 500,
                    height: 380,
                    objectFit: 'cover',
                  },
                },
              ],
            },
            {
              type: 'Column',
              props: { span: 6 },
              children: [
                { type: 'Heading', props: { level: 2, text: 'Built by Builders' } },
                {
                  type: 'Text',
                  props: {
                    content:
                      'Founded in 2018, we are a team of designers, developers, and strategists passionate about building digital products that make an impact.',
                  },
                },
                {
                  type: 'List',
                  props: {
                    ordered: false,
                    items: [
                      '50+ successful projects delivered',
                      'Offices in New York and London',
                      'Award-winning design team',
                      'Agile, transparent process',
                    ],
                  },
                },
                {
                  type: 'Button',
                  props: { label: 'Work with Us', href: '/contact', variant: 'primary' },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const agencyContactContent = {
  type: 'Section',
  props: { background: '#0F172A', padding: '80px 0' },
  children: [
    {
      type: 'Container',
      props: { maxWidth: '700px' },
      children: [
        { type: 'Heading', props: { level: 1, text: "Let's Work Together", align: 'center' } },
        { type: 'Spacer', props: { height: '16px' } },
        {
          type: 'Text',
          props: {
            content:
              'Tell us about your project and we will get back to you within one business day.',
          },
        },
        { type: 'Spacer', props: { height: '32px' } },
        { type: 'Text', props: { content: 'Email: hello@agency.example' } },
        { type: 'Text', props: { content: 'Phone: (555) 987-6543' } },
        { type: 'Spacer', props: { height: '24px' } },
        {
          type: 'Button',
          props: { label: 'Send Us an Email', href: 'mailto:hello@agency.example', variant: 'primary' },
        },
      ],
    },
  ],
};

// ─── Portfolio Template ────────────────────────────────────────────────────────

const portfolioTheme = {
  colors: {
    primary: '#18181B',
    secondary: '#71717A',
    accent: '#3B82F6',
    background: '#FAFAFA',
    text: '#18181B',
  },
  fonts: { heading: 'Inter', body: 'Inter' },
  logo: 'https://placehold.co/200x60?text=Portfolio',
  favicon: 'https://placehold.co/32x32',
  borderRadius: '2px',
};

const portfolioHomeContent = {
  type: 'Section',
  props: { background: '#FAFAFA', padding: '0' },
  children: [
    {
      type: 'Header',
      props: {
        logo: 'https://placehold.co/200x60?text=Portfolio',
        navItems: [
          { label: 'Home', href: '/' },
          { label: 'Work', href: '/work' },
          { label: 'About', href: '/about' },
          { label: 'Contact', href: '/contact' },
        ],
        cta: { label: 'Hire Me', href: '/contact' },
        sticky: true,
      },
    },
    {
      type: 'Section',
      props: { background: '#FAFAFA', padding: '120px 0' },
      children: [
        {
          type: 'Container',
          props: { maxWidth: '800px' },
          children: [
            {
              type: 'Heading',
              props: { level: 1, text: "Hello, I'm Alex — Designer & Developer", align: 'left' },
            },
            {
              type: 'Text',
              props: {
                content:
                  'I create clean, purposeful digital experiences. Currently available for freelance projects.',
              },
            },
            {
              type: 'Row',
              props: { align: 'center' },
              children: [
                {
                  type: 'Button',
                  props: { label: 'View My Work', href: '/work', variant: 'primary' },
                },
                {
                  type: 'Button',
                  props: { label: 'Get in Touch', href: '/contact', variant: 'outline' },
                },
              ],
            },
          ],
        },
      ],
    },
    { type: 'Spacer', props: { height: '40px' } },
    {
      type: 'Section',
      props: { background: '#F4F4F5', padding: '60px 0' },
      children: [
        {
          type: 'Container',
          props: { maxWidth: '1100px' },
          children: [
            { type: 'Heading', props: { level: 2, text: 'Selected Work', align: 'left' } },
            { type: 'Spacer', props: { height: '32px' } },
            {
              type: 'Grid',
              props: { columns: 3, gap: '24px' },
              children: [
                {
                  type: 'Card',
                  props: {
                    title: 'E-Commerce Redesign',
                    image: 'https://placehold.co/400x280?text=Project+1',
                  },
                  children: [
                    {
                      type: 'Text',
                      props: { content: 'UX research, wireframing, and high-fidelity UI for a fashion retailer.' },
                    },
                    { type: 'Link', props: { text: 'View project', href: '/work' } },
                  ],
                },
                {
                  type: 'Card',
                  props: {
                    title: 'SaaS Dashboard',
                    image: 'https://placehold.co/400x280?text=Project+2',
                  },
                  children: [
                    {
                      type: 'Text',
                      props: { content: 'Data visualisation dashboard built with React and D3.' },
                    },
                    { type: 'Link', props: { text: 'View project', href: '/work' } },
                  ],
                },
                {
                  type: 'Card',
                  props: {
                    title: 'Brand Identity',
                    image: 'https://placehold.co/400x280?text=Project+3',
                  },
                  children: [
                    {
                      type: 'Text',
                      props: { content: 'Full brand identity including logo, typography, and colour system.' },
                    },
                    { type: 'Link', props: { text: 'View project', href: '/work' } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    { type: 'Spacer', props: { height: '40px' } },
    {
      type: 'Footer',
      props: {
        columns: [
          {
            title: 'Navigation',
            links: [
              { label: 'Work', href: '/work' },
              { label: 'About', href: '/about' },
              { label: 'Contact', href: '/contact' },
            ],
          },
        ],
        copyright: '© 2026 Alex Portfolio. All rights reserved.',
        socialLinks: [
          { icon: 'twitter', href: 'https://twitter.com' },
          { icon: 'github', href: 'https://github.com' },
          { icon: 'linkedin', href: 'https://linkedin.com' },
        ],
      },
    },
  ],
};

const portfolioWorkContent = {
  type: 'Section',
  props: { background: '#FAFAFA', padding: '80px 0' },
  children: [
    {
      type: 'Container',
      props: { maxWidth: '1100px' },
      children: [
        { type: 'Heading', props: { level: 1, text: 'Work', align: 'left' } },
        {
          type: 'Text',
          props: { content: 'A selection of projects I have designed and built.' },
        },
        { type: 'Spacer', props: { height: '48px' } },
        {
          type: 'Grid',
          props: { columns: 2, gap: '32px' },
          children: [
            {
              type: 'Card',
              props: {
                title: 'E-Commerce Redesign',
                image: 'https://placehold.co/600x400?text=E-Commerce',
              },
              children: [
                { type: 'Text', props: { content: 'UX · UI · Branding · 2024' } },
                {
                  type: 'Text',
                  props: {
                    content:
                      'Led the end-to-end redesign of a mid-size fashion retailer, increasing conversion rate by 34%.',
                  },
                },
                { type: 'Link', props: { text: 'Case study →', href: '#' } },
              ],
            },
            {
              type: 'Card',
              props: {
                title: 'SaaS Analytics Dashboard',
                image: 'https://placehold.co/600x400?text=SaaS+Dashboard',
              },
              children: [
                { type: 'Text', props: { content: 'React · D3 · TypeScript · 2023' } },
                {
                  type: 'Text',
                  props: {
                    content:
                      'Custom analytics dashboard with real-time data visualisation for a logistics startup.',
                  },
                },
                { type: 'Link', props: { text: 'Case study →', href: '#' } },
              ],
            },
            {
              type: 'Card',
              props: {
                title: 'Brand Identity System',
                image: 'https://placehold.co/600x400?text=Brand+Identity',
              },
              children: [
                { type: 'Text', props: { content: 'Branding · Illustration · 2023' } },
                {
                  type: 'Text',
                  props: {
                    content:
                      'Developed a comprehensive brand identity for a fintech startup launching in 5 markets.',
                  },
                },
                { type: 'Link', props: { text: 'Case study →', href: '#' } },
              ],
            },
            {
              type: 'Card',
              props: {
                title: 'Mobile App UI',
                image: 'https://placehold.co/600x400?text=Mobile+App',
              },
              children: [
                { type: 'Text', props: { content: 'Figma · iOS · Android · 2022' } },
                {
                  type: 'Text',
                  props: {
                    content:
                      'Designed a cross-platform mobile app for a wellness brand, from concept to final handoff.',
                  },
                },
                { type: 'Link', props: { text: 'Case study →', href: '#' } },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const portfolioAboutContent = {
  type: 'Section',
  props: { background: '#FAFAFA', padding: '80px 0' },
  children: [
    {
      type: 'Container',
      props: { maxWidth: '900px' },
      children: [
        { type: 'Heading', props: { level: 1, text: 'About Me', align: 'left' } },
        { type: 'Spacer', props: { height: '40px' } },
        {
          type: 'Row',
          props: { align: 'flex-start', justify: 'space-between' },
          children: [
            {
              type: 'Column',
              props: { span: 5 },
              children: [
                {
                  type: 'Image',
                  props: {
                    src: 'https://placehold.co/400x480?text=Alex',
                    alt: 'Alex',
                    width: 400,
                    height: 480,
                    objectFit: 'cover',
                  },
                },
              ],
            },
            {
              type: 'Column',
              props: { span: 7 },
              children: [
                { type: 'Heading', props: { level: 2, text: "I'm Alex Morgan" } },
                {
                  type: 'Text',
                  props: {
                    content:
                      "I'm a freelance designer and front-end developer based in London. I've spent the last 6 years helping startups and established brands create digital products that are both beautiful and functional.",
                  },
                },
                {
                  type: 'Text',
                  props: {
                    content:
                      'When I am not designing I can usually be found hiking, reading, or experimenting with sourdough.',
                  },
                },
                { type: 'Heading', props: { level: 3, text: 'Skills' } },
                {
                  type: 'List',
                  props: {
                    ordered: false,
                    items: [
                      'UI / UX Design (Figma)',
                      'Front-end Development (React, Next.js)',
                      'Brand Identity & Typography',
                      'Interaction Design & Prototyping',
                    ],
                  },
                },
                {
                  type: 'Button',
                  props: { label: 'Download CV', href: '#', variant: 'outline' },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const portfolioContactContent = {
  type: 'Section',
  props: { background: '#FAFAFA', padding: '80px 0' },
  children: [
    {
      type: 'Container',
      props: { maxWidth: '600px' },
      children: [
        { type: 'Heading', props: { level: 1, text: 'Get in Touch', align: 'left' } },
        {
          type: 'Text',
          props: {
            content:
              "Have a project in mind? I'd love to hear about it. Send me an email or connect on social media.",
          },
        },
        { type: 'Spacer', props: { height: '32px' } },
        {
          type: 'Row',
          props: { align: 'flex-start' },
          children: [
            { type: 'Icon', props: { name: 'Mail', size: 20, color: '#3B82F6' } },
            { type: 'Link', props: { text: 'alex@portfolio.example', href: 'mailto:alex@portfolio.example' } },
          ],
        },
        { type: 'Spacer', props: { height: '16px' } },
        {
          type: 'Row',
          props: { align: 'flex-start' },
          children: [
            { type: 'Icon', props: { name: 'Linkedin', size: 20, color: '#3B82F6' } },
            { type: 'Link', props: { text: 'linkedin.com/in/alexmorgan', href: 'https://linkedin.com' } },
          ],
        },
        { type: 'Spacer', props: { height: '40px' } },
        {
          type: 'Button',
          props: { label: 'Email Me', href: 'mailto:alex@portfolio.example', variant: 'primary' },
        },
      ],
    },
  ],
};

// ─── Seed Helper ──────────────────────────────────────────────────────────────

interface TemplatePageDef {
  slug: string;
  title: string;
  content: object;
  sortOrder: number;
}

interface TemplateDef {
  slug: string;
  name: string;
  theme: object;
  pages: TemplatePageDef[];
}

async function upsertTemplate(def: TemplateDef): Promise<void> {
  const [tenant] = await db
    .insert(tenants)
    .values({
      name: def.name,
      slug: def.slug,
      theme: def.theme,
      isTemplate: true,
    })
    .onConflictDoUpdate({
      target: tenants.slug,
      set: { name: def.name, theme: def.theme, isTemplate: true },
    })
    .returning();

  for (const page of def.pages) {
    const existing = await db
      .select({ id: pages.id })
      .from(pages)
      .where(and(eq(pages.tenantId, tenant.id), eq(pages.slug, page.slug)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(pages).values({
        tenantId: tenant.id,
        slug: page.slug,
        title: page.title,
        published: true,
        sortOrder: page.sortOrder,
        content: page.content,
      });
    } else {
      await db
        .update(pages)
        .set({
          title: page.title,
          published: true,
          sortOrder: page.sortOrder,
          content: page.content,
        })
        .where(and(eq(pages.tenantId, tenant.id), eq(pages.slug, page.slug)));
    }
  }
}

// ─── Main Seed Export ─────────────────────────────────────────────────────────

export async function seedTemplates(): Promise<void> {
  const templates: TemplateDef[] = [
    {
      slug: 'tmpl-restaurant',
      name: 'Starter - Restaurant',
      theme: restaurantTheme,
      pages: [
        { slug: '', title: 'Home', content: restaurantHomeContent, sortOrder: 0 },
        { slug: 'menu', title: 'Menu', content: restaurantMenuContent, sortOrder: 1 },
        { slug: 'contact', title: 'Contact', content: restaurantContactContent, sortOrder: 2 },
      ],
    },
    {
      slug: 'tmpl-agency',
      name: 'Starter - Agency',
      theme: agencyTheme,
      pages: [
        { slug: '', title: 'Home', content: agencyHomeContent, sortOrder: 0 },
        { slug: 'services', title: 'Services', content: agencyServicesContent, sortOrder: 1 },
        { slug: 'about', title: 'About', content: agencyAboutContent, sortOrder: 2 },
        { slug: 'contact', title: 'Contact', content: agencyContactContent, sortOrder: 3 },
      ],
    },
    {
      slug: 'tmpl-portfolio',
      name: 'Starter - Portfolio',
      theme: portfolioTheme,
      pages: [
        { slug: '', title: 'Home', content: portfolioHomeContent, sortOrder: 0 },
        { slug: 'work', title: 'Work', content: portfolioWorkContent, sortOrder: 1 },
        { slug: 'about', title: 'About', content: portfolioAboutContent, sortOrder: 2 },
        { slug: 'contact', title: 'Contact', content: portfolioContactContent, sortOrder: 3 },
      ],
    },
  ];

  for (const template of templates) {
    await upsertTemplate(template);
  }

  console.log('Templates seed complete.');
}
