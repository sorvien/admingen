# 🌊 AdminGen

[![npm version](https://img.shields.io/npm/v/@blackwaves/admingen/beta.svg)](https://www.npmjs.com/package/@blackwaves/admingen)
[![npm downloads](https://img.shields.io/npm/dw/@blackwaves/admingen.svg)](https://www.npmjs.com/package/@blackwaves/admingen)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/sorvien/admingen/build.yml?branch=main)](https://github.com/sorvien/admingen/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Powered by Bun](https://img.shields.io/badge/Runtime-Bun-f472b6.svg)](https://bun.sh)
[![Backend: Elysia](https://img.shields.io/badge/Backend-ElysiaJS-9333ea.svg)](https://elysiajs.com)
[![ORM: Drizzle](https://img.shields.io/badge/ORM-Drizzle-c084fc.svg)](https://orm.drizzle.team)

**AdminGen** is an instant, ultra-lightweight admin panel framework for modern TypeScript backends, built natively for **[ElysiaJS](https://elysiajs.com)** and **[Drizzle ORM](https://orm.drizzle.team)**.

Point AdminGen at your existing Drizzle database schema, and it will:
1. **Introspect your tables, foreign keys, and relations.**
2. **Auto-generate secure REST endpoints with pagination, filtering, and sorting in Elysia.**
3. **Serve a dynamic, pre-built React admin panel (TanStack + Shadcn/UI) in under 40MB of RAM.**

---

## ⚡ Why AdminGen?

Most existing CMS solutions (Strapi, Payload, Keystone) are heavy Node.js monoliths that consume **600MB to 1.2GB of RAM per project**, creating massive server bills and sluggish cold starts.

AdminGen was engineered from day one on **Bun + Elysia + Drizzle** to be the fastest, lightest self-hosted admin engine in the JavaScript ecosystem.

| Feature | AdminGen | Payload CMS | Strapi | Directus |
| :--- | :---: | :---: | :---: | :---: |
| **Runtime** | **Bun** (or Node) | Node.js | Node.js | Node.js |
| **Backend Framework** | **ElysiaJS** | Next.js App Router | Koa / Custom | Express |
| **Database Engine** | **Drizzle ORM** (SQL First) | Mongoose / Custom | Custom ORM | Knex |
| **Idle Memory (RAM)** | **~35MB – 50MB** | ~600MB – 1.2GB | ~350MB – 600MB | ~180MB – 350MB |
| **Cold Boot Time** | **< 200 ms** | 5s – 15s | 4s – 10s | 3s – 8s |
| **Frontend Stack** | **TanStack + Shadcn/UI** | Custom React | Custom React | Vue.js |
| **Schema Introspection** | **Zero-Config (Drizzle)** | Code Config | Schema Builder | Database Direct |

---

## ✨ Core Features

- **⚡ Zero-Config Schema Introspection:** Introspects tables, foreign keys, columns, enums, required fields, and read-only attributes directly from your Drizzle schema.
- **📊 Server-Side Operations:** Dynamic server-side pagination, sorting, and text search out of the box.
- **🔗 Relational Lookups:** Automatically resolves foreign keys into relational dropdown selects.
- **🎨 Modern Dark UI:** Pre-built with **TanStack Router**, **TanStack Query**, **TanStack Table**, and **Shadcn/UI**.
- **🪶 Ultra Low Footprint:** Runs comfortably in ~40MB RAM. Host 30+ client admin panels on a single $5 VPS.
- **🔒 Pluggable Auth:** Plug in any authentication provider (JWT, Cookies, Better-Auth, Lucia) with a single interface.
- **🗄️ Multi-Database:** Supports SQLite, PostgreSQL, and MySQL via Drizzle ORM.

---

## 🚀 Try It Locally in 30 Seconds

Experience AdminGen with pre-seeded data right now:

```bash
# 1. Clone the repository
git clone https://github.com/sorvien/admingen.git
cd admingen

# 2. Install dependencies & run the example app
bun install
bun dev
```

Open **[http://localhost:3000/admin](http://localhost:3000/admin)** in your browser.  
Log in with: **`admin`** / **`admin`**

---

## 📦 Quick Start (Install in Your Project)

### 1. Installation

In your Elysia + Drizzle project, install AdminGen and the Drizzle adapter:

```bash
bun add @blackwaves/admingen@beta @blackwaves/admingen-adapter-drizzle@beta
```

Ensure peer dependencies are installed:
```bash
bun add elysia drizzle-orm @sinclair/typebox
```

### 2. Usage

Mount AdminGen into your Elysia server in just 4 lines of code:

```ts
import { Elysia } from 'elysia';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './schema'; // Your Drizzle schema

import { AdminGen } from '@blackwaves/admingen';
import { createDrizzleAdapter } from '@blackwaves/admingen-adapter-drizzle';

// 1. Initialize Drizzle with your schema
const db = drizzle(new Database('sqlite.db'), { schema });

// 2. Generate the adapter from your schema
const adapterResult = createDrizzleAdapter({ schema });

// 3. Mount AdminGen plugin
const app = new Elysia()
  .decorate('db', db)
  .use(AdminGen({ adapterResult, adminPath: '/admin' }))
  .listen(3000);

console.log('🦊 Admin panel live at http://localhost:3000/admin');
```

Open **`http://localhost:3000/admin`** to manage your data!

---

## 🔒 Adding Authentication

Protect your admin dashboard with a custom auth provider:

```ts
const authProvider = {
  authenticate: async (ctx: any) => {
    const token = ctx.cookie?.auth?.value;
    if (token === process.env.ADMIN_SECRET) {
      return { id: 1, name: 'Admin', email: 'admin@company.com' };
    }
    return null; // Redirects to /login
  }
};

app.use(AdminGen({
  adapterResult,
  authProvider
}));
```

---

## 🏛️ Monorepo Architecture

AdminGen is structured as a modular Bun monorepo:

```
admingen/
├── packages/
│   ├── types/            # Shared contracts (AdminField, AdminSchema, AdapterResult)
│   ├── adapter-drizzle/  # Drizzle schema introspection engine & CRUD handlers
│   ├── ui/               # SPA Admin Panel (TanStack Router + Query + Table + Shadcn)
│   └── admingen/         # Main Elysia plugin serving APIs & bundled SPA assets
└── example-app/          # Fully functional SQLite demo application
```

---

## 🧪 Testing

AdminGen has a comprehensive automated test suite testing schema introspection, CRUD handlers, and Elysia routing:

```bash
bun test
```

---

## 🛣️ Roadmap

- [x] Monorepo setup (Bun, TypeScript, automated CI)
- [x] Drizzle schema introspection (SQLite, PostgreSQL, MySQL)
- [x] Auto-generated REST CRUD API endpoints in Elysia
- [x] Server-side pagination, sorting, and text filtering
- [x] Dynamic TanStack Table & Sidebar navigation
- [x] Relational foreign key dropdown lookups
- [x] Multi-line Textarea and JSON editor field support
- [x] Zero-config fallback mode
- [ ] **v0.3:** S3 / Cloudflare R2 Media Upload Field with live image previews
- [ ] **v0.4:** Headless Rich-Text (Tiptap / Markdown) component
- [ ] **v0.5:** Turnkey Better-Auth & Lucia authentication plugins
- [ ] **v0.6:** Lifecycle hooks (`beforeChange`, `afterChange`, `afterDelete`) for cache revalidation

---

## 🤝 Contributing

We welcome community contributions! 

1. Fork the repo.
2. Create your feature branch (`git checkout -b feat/amazing-feature`).
3. Commit your changes (`git commit -m 'feat: add amazing feature'`).
4. Ensure all tests pass (`bun test`).
5. Open a Pull Request!

Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 📜 License

MIT License © 2025 [Sorvien Group LLC](https://sorvien.com) & [Black Waves](https://github.com/blackwavesdev).
