# 🌊 Contributing to AdminGen

First off, thank you for taking the time to contribute! 🎉 We are excited to build the fastest, lightest admin engine for Bun & Elysia alongside the open-source community.

This document provides clear guidelines to ensure a smooth, welcoming, and productive experience for everyone.

---

## 🌱 First-Time Contributors & Good First Issues

Never contributed to open source or to AdminGen before? You are warmly welcomed here!

We curate bite-sized, well-scoped tasks specifically designed for newcomers:

👉 **[Browse Good First Issues](https://github.com/sorvien/admingen/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)**

### How to Claim an Issue
1. Browse open issues labeled [`good first issue`](https://github.com/sorvien/admingen/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) or [`help wanted`](https://github.com/sorvien/admingen/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22).
2. Leave a comment saying you'd like to work on it (e.g., *"I'd like to work on this!"*).
3. A maintainer will assign the issue to you so effort isn't duplicated.
4. Don't hesitate to ask questions directly in the issue thread if anything is unclear!

---

## 🏛️ Monorepo Codebase Map

AdminGen is structured as a Bun monorepo. Here is where the code lives:

| Directory | Package Name | Description |
| :--- | :--- | :--- |
| `packages/types/` | `@sorvien/admingen-types` | Shared TypeScript contracts (`AdminField`, `AdminSchema`, `AdapterResult`, `AuthProvider`). |
| `packages/adapter-drizzle/` | `@sorvien/admingen-adapter-drizzle` | Schema introspection engine and CRUD database queries for Drizzle ORM. |
| `packages/ui/` | `@sorvien/admingen-ui` | Pre-built SPA frontend built with TanStack (Router, Query, Table) and Shadcn/Tailwind. |
| `packages/admingen/` | `@sorvien/admingen` | Core Elysia plugin serving auto-generated REST routes, auth endpoints, and bundled UI assets. |
| `example-app/` | `example-app` | Ready-to-run SQLite test application with seeded models. |
| `example-app-postgres/` | `example-app-postgres` | Ready-to-run PostgreSQL demo application. |

---

## 🛠️ Local Development Setup

### 1. Fork & Clone
```bash
git clone https://github.com/YOUR-USERNAME/admingen.git
cd admingen
```

### 2. Install Dependencies
AdminGen uses [Bun](https://bun.sh) as the runtime and package manager:
```bash
bun install
```

### 3. Run the Build
Compile all TypeScript packages and the Vite UI assets:
```bash
bun run build
```

### 4. Run Automated Tests
```bash
bun test
```
*All tests run in Bun in ~250ms.*

### 5. Launch the Local Dev Server
The included `example-app` is pre-seeded with sample data:
```bash
bun dev
```
Open **[http://localhost:3000/admin](http://localhost:3000/admin)** in your browser.  
Log in with credentials: **`admin`** / **`admin`**.

### 💡 Developing Frontend UI with Hot Reload
If you are modifying UI components in `packages/ui/` and want instant Vite Hot Module Replacement (HMR):
```bash
cd packages/ui
bun run dev
```

---

## 🚀 Submitting a Pull Request

1. **Create a branch:**
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. **Make your changes:** Write clean, typed TypeScript.
3. **Format & Verify tests:**
   ```bash
   bun run build
   bun test
   ```
4. **Commit using [Conventional Commits](https://www.conventionalcommits.org/):**
   - `feat(ui): add CSV export button to table`
   - `fix(adapter): resolve foreign key join error in SQLite`
   - `docs: update quick start instructions`
   - `test: add unit tests for schema introspector`
5. **Push and Open PR:**
   ```bash
   git push origin feat/your-feature-name
   ```
   Open a Pull Request on [sorvien/admingen](https://github.com/sorvien/admingen/pulls).

---

## 🐞 Reporting Bugs & Suggesting Features

- **Bug Reports:** Please use our [Bug Report Template](https://github.com/sorvien/admingen/issues/new?template=bug_report.md) with reproduction steps.
- **Feature Requests:** Please use our [Feature Request Template](https://github.com/sorvien/admingen/issues/new?template=feature_request.md).

---

## 📜 Code of Conduct

This project is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). We expect all participants to maintain a respectful, inclusive, and harassment-free environment.

Thank you for contributing to AdminGen! 🚀