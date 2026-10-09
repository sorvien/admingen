---
layout: home

hero:
  name: "AdminGen"
  text: "Instant Admin Panel for Bun & Elysia"
  tagline: "Introspects Drizzle ORM schemas at runtime. Runs under 40MB RAM. Zero manual dashboard coding."
  image:
    src: /logo.svg
    alt: AdminGen Logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: 🚀 1-Click CodeSandbox Demo
      link: https://codesandbox.io/p/devbox/github/sorvien/admingen/tree/main
    - theme: alt
      text: View on GitHub
      link: https://github.com/sorvien/admingen

features:
  - title: ⚡ Zero-Config Schema Introspection
    details: Automatically detects tables, foreign keys, enums, dates, and JSON attributes straight from your Drizzle schema definition.
  - title: 🎨 Modern Dark-Mode UI
    details: Pre-built with TanStack Table, Router, React Query, and Shadcn/UI for sub-millisecond client-side filtering and sorting.
  - title: 🪶 Ultra Low Memory Footprint
    details: Built on Bun to run under 40MB of memory. Host dozens of client admin dashboards on a single $5 VPS.
  - title: 🔒 Pluggable Auth & RBAC
    details: Works out of the box with zero configuration, or plug in Cookies, JWT, or Better-Auth with granular role-based permissions (list, read, create, update, delete).
---

## ⚡ Scaffold in 10 Seconds

```bash
bunx create-admingen my-admin
```

---

## 🔌 Or Mount in 4 Lines of Code

```ts
import { Elysia } from 'elysia';
import { AdminGen } from '@sorvien/admingen';
import { createDrizzleAdapter } from '@sorvien/admingen-adapter-drizzle';
import * as schema from './schema';

const app = new Elysia()
  .use(AdminGen({
    adapterResult: createDrizzleAdapter({ schema })
  }))
  .listen(3000);

console.log('⚡ Admin Panel running at http://localhost:3000/admin');
```
