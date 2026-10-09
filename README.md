<p align="center">
  <img src="https://raw.githubusercontent.com/sorvien/admingen/main/docs/public/logo.svg" alt="AdminGen Logo" width="88" height="88" />
</p>

<h1 align="center">AdminGen</h1>

<p align="center">
  <strong>Instant, headless admin panel framework for modern TypeScript backends</strong><br />
  Built natively for <a href="https://elysiajs.com">ElysiaJS</a> and <a href="https://orm.drizzle.team">Drizzle ORM</a> • Powered by <a href="https://bun.sh">Bun</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@sorvien/admingen"><img src="https://img.shields.io/npm/v/@sorvien/admingen/beta.svg" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@sorvien/admingen"><img src="https://img.shields.io/npm/dw/@sorvien/admingen.svg" alt="npm downloads" /></a>
  <a href="https://sorvien.github.io/admingen/"><img src="https://img.shields.io/badge/Docs-VitePress-6366f1.svg" alt="Docs" /></a>
  <a href="https://github.com/sorvien/admingen/actions"><img src="https://img.shields.io/github/actions/workflow/status/sorvien/admingen/build.yml?branch=main" alt="GitHub Workflow Status" /></a>
  <a href="https://github.com/sorvien/admingen/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22"><img src="https://img.shields.io/github/issues/sorvien/admingen/good%20first%20issue?color=7057ff&label=Good%20First%20Issues" alt="Good First Issues" /></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /></a>
  <a href="https://github.com/sponsors/omarghandour"><img src="https://img.shields.io/badge/Sponsor-GitHub-ea4aaa.svg?logo=githubsponsors" alt="Sponsor" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/Runtime-Bun-f472b6.svg" alt="Powered by Bun" /></a>
  <a href="https://elysiajs.com"><img src="https://img.shields.io/badge/Backend-ElysiaJS-9333ea.svg" alt="Backend: Elysia" /></a>
  <a href="https://orm.drizzle.team"><img src="https://img.shields.io/badge/ORM-Drizzle-c084fc.svg" alt="ORM: Drizzle" /></a>
</p>

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

## 🚀 Try It Now

[![Open in CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/p/devbox/github/sorvien/admingen/tree/main)

No local installation needed: open the CodeSandbox template and wait for the
workspace dependencies and packages to build. The
`example-app` starts automatically on port **3000**, with a pre-seeded SQLite database.
In the port 3000 preview, open **`/admin`** and log in with **`admin`** / **`admin`**.
CodeSandbox may require you to sign in; VM usage is subject to your account's limits.

### Run locally

Experience AdminGen with pre-seeded data right now:

```bash
# 1. Clone the repository
git clone https://github.com/sorvien/admingen.git
cd admingen

# 2. Install dependencies, build the workspace & run the example app
bun install
bun run build
bun dev
```

Open **[http://localhost:3000/admin](http://localhost:3000/admin)** in your browser.  
Log in with: **`admin`** / **`admin`**

---

## 📦 Quick Start (Scaffold in 10 Seconds)

To create a new AdminGen app with pre-configured schemas and demo data:

```bash
bunx create-admingen my-admin
```

---

## 🛠️ Manual Installation (Existing Project)

### 1. Installation

In your Elysia + Drizzle project, install AdminGen and the Drizzle adapter:

```bash
bun add @sorvien/admingen@beta @sorvien/admingen-adapter-drizzle@beta
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

import { AdminGen } from '@sorvien/admingen';
import { createDrizzleAdapter } from '@sorvien/admingen-adapter-drizzle';

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

## ♻️ Lifecycle Hooks

Add per-resource lifecycle hooks when you need to transform data or run side effects around writes:

```ts
const adapterResult = createDrizzleAdapter({
  schema,
  config: {
    resources: [{
      slug: 'users',
      hooks: {
        beforeChange: async ({ data, operation, id }) => {
          return {
            ...data,
            email: data.email?.trim().toLowerCase(),
          };
        },
        afterChange: async ({ record, operation, id }) => {
          await invalidateUserCache(record.id);
        },
        beforeDelete: async ({ id }) => {
          return id !== SYSTEM_USER_ID; // return false to cancel deletion
        },
        afterDelete: async ({ id }) => {
          await writeAuditLog({ action: 'user.deleted', id });
        },
      },
    }],
  },
});
```

Hooks can be synchronous or asynchronous. Errors thrown by a hook are propagated to the request. A `beforeDelete` hook can return `false` to cancel the delete.

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
├── example-app/          # Fully functional SQLite demo application
└── example-app-postgres/ # Advanced PostgreSQL demo application with Docker Compose
```

---

## 🧪 Testing

AdminGen has a comprehensive automated test suite testing schema introspection, CRUD handlers, and Elysia routing:

```bash
bun test
```

---

## 🛣️ Roadmap

Live milestone tracking is available on our [GitHub Milestones](https://github.com/sorvien/admingen/milestones). See [ROADMAP.md](ROADMAP.md) for the full architectural vision.

- [x] Monorepo setup (Bun, TypeScript, automated CI)
- [x] Drizzle schema introspection (SQLite, PostgreSQL, MySQL)
- [x] Auto-generated REST CRUD API endpoints in Elysia
- [x] Server-side pagination, sorting, and text filtering
- [x] Dynamic TanStack Table & Sidebar navigation
- [x] Relational foreign key dropdown lookups
- [x] Zero-config schema & auth fallback mode
- [x] **[v0.2.0](https://github.com/sorvien/admingen/milestone/1):** UI Polish & Table UX (Toasts, Cmd+K palette, CSV export, Relative timestamps, Password show/hide, Faceted filters)
- [x] **[v0.3.0](https://github.com/sorvien/admingen/milestone/2):** Extensibility & DB Parity (Lifecycle hooks, Multi-package manager CLI, Composite keys, RBAC permissions)
- [ ] **[v1.0.0](https://github.com/sorvien/admingen/milestone/3):** Production Readiness (Dedicated docs hub, Dashboard KPI widgets, S3 uploads)

---

## 🤝 Contributing & Community

We warmly welcome community contributions! Whether you're fixing a typo, building a new field widget, or refining UI components, every contribution counts.

- 🐣 **New to the project?** Start with our curated **[Good First Issues](https://github.com/sorvien/admingen/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)**.
- 📖 Check out the full **[Contributing Guide](CONTRIBUTING.md)** for local development setup, codebase architecture, and PR steps.
- 💬 Have questions or feature ideas? Join the discussion on [GitHub Issues](https://github.com/sorvien/admingen/issues).

---

## 👥 Contributors

Huge thanks to everyone who has contributed code, documentation, and ideas to AdminGen!

<p align="center">
  <a href="https://github.com/sorvien/admingen/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=sorvien/admingen" alt="AdminGen Contributors" />
  </a>
</p>

Want to see your face here? Pick up a [Good First Issue](https://github.com/sorvien/admingen/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) and submit a pull request!

---

## 💖 Support AdminGen

If AdminGen saves you time building internal dashboards or you want to support continuous development:

- ⭐ **Star the repository** to help other developers discover the project.
- 💬 **Share feedback** or feature requests on [GitHub Issues](https://github.com/sorvien/admingen/issues).
- ☕ **[Sponsor on GitHub](https://github.com/sponsors/omarghandour)** to support maintenance, hosting benchmarks, and new database adapters.

---

## 📜 License

MIT License © 2025 [Sorvien Group LLC](https://sorvien.com).
