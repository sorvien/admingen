import { defineConfig } from 'vitepress';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/admingen/' : '/',
  title: 'AdminGen',
  description: 'Instant, headless admin panel for Elysia and Drizzle ORM',
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#6366f1' }],
  ],
  themeConfig: {
    siteTitle: 'AdminGen',
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Recipes', link: '/guide/sqlite' },
      { text: 'Reference', link: '/reference/schema-config' },
      { text: 'Roadmap', link: 'https://github.com/sorvien/admingen/blob/main/ROADMAP.md' },
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Overview & Installation', link: '/guide/getting-started' },
          { text: 'CLI Quickstart', link: '/guide/cli' },
        ],
      },
      {
        text: 'Database Recipes',
        items: [
          { text: 'SQLite Recipe', link: '/guide/sqlite' },
          { text: 'PostgreSQL Recipe', link: '/guide/postgres' },
        ],
      },
      {
        text: 'Security & Auth',
        items: [
          { text: 'Authentication & Access', link: '/guide/auth' },
        ],
      },
      {
        text: 'Customization & Hooks',
        items: [
          { text: 'Lifecycle Hooks', link: '/guide/hooks' },
        ],
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Schema Configuration & Types', link: '/reference/schema-config' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/sorvien/admingen' },
    ],
    search: {
      provider: 'local',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025-present Sorvien Group LLC',
    },
  },
});
