# 🌊 Contributing to AdminGen

First off, thank you for considering contributing! We're excited to build this framework with the community.

This document provides guidelines for contributing to AdminGen to ensure a smooth, welcoming, and productive experience for everyone.

---

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## 🐞 How to Report a Bug

If you find a bug, please [open a new issue](https://github.com/sorvien/admingen/issues/new?template=bug_report.md) and include:

* **A clear title** describing the issue.
* **Your environment:** Versions of Bun, Elysia, Drizzle ORM, and database (SQLite, PostgreSQL, MySQL).
* **Steps to Reproduce:** Minimal code or steps to reproduce the bug.
* **Expected Behavior:** What you expected to happen.
* **Actual Behavior:** What actually happened (terminal logs, browser console errors, or screenshots).

---

## ✨ How to Suggest a Feature

We welcome proposals for new field types, database adapters, auth plugins, and dashboard widgets!

1. **Check existing issues:** Make sure your idea hasn't already been suggested.
2. **Open a Feature Request:** [Open a new issue](https://github.com/sorvien/admingen/issues/new?template=feature_request.md) describing the use case and API proposal.
3. **Discuss:** We will align on the scope and design before writing code, saving everyone time.

---

## 🛠️ Local Development Setup

Ready to write some code? Here is how to set up your local development environment:

### 1. Fork & Clone
```bash
git clone https://github.com/YOUR-USERNAME/admingen.git
cd admingen
```

### 2. Install Dependencies
AdminGen is a Bun-based monorepo. Install all workspace dependencies from the root:
```bash
bun install
```

### 3. Run the Monorepo Build
Compile all TypeScript packages and the Vite UI assets:
```bash
bun run build
```

### 4. Run the Automated Test Suite
Ensure all existing tests pass:
```bash
bun test
```

### 5. Run the Test Application
The included `example-app` is the fastest way to test your changes live:
```bash
bun dev
```
Open **[http://localhost:3000/admin](http://localhost:3000/admin)** in your browser (Login: `admin` / `admin`).

If you are developing UI components in `packages/ui` and want instant Vite Hot Module Replacement (HMR):
```bash
cd packages/ui
bun run dev
```

---

## 🚀 Submitting a Pull Request

1. **Create a branch:**
   ```bash
   git checkout -b feat/my-awesome-feature
   ```
2. **Make your changes:** Write clean, typed TypeScript code.
3. **Verify build & tests:**
   ```bash
   bun run build
   bun test
   ```
   *All automated status checks must pass before merging.*
4. **Commit & Push:**
   ```bash
   git commit -m "feat: add support for custom field widgets"
   git push origin feat/my-awesome-feature
   ```
5. **Open a Pull Request:** Go to [sorvien/admingen Pull Requests](https://github.com/sorvien/admingen/pulls) and submit your PR.

Thank you for helping make AdminGen the best admin panel for the Bun & Elysia ecosystem!