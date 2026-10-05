# Advanced PostgreSQL Example

This example demonstrates how to use `AdminGen` with a PostgreSQL database, featuring:
- Enums (User Roles, Post Status)
- JSONB fields (Settings, Metadata)
- Complex relationships (One-to-Many, Many-to-Many)
- UUID and Serial IDs

## 🚀 Quick Start (3 Steps)

1. **Start PostgreSQL via Docker:**
   ```bash
   docker compose up -d
   ```

2. **Run migrations and seed the database:**
   ```bash
   bun run db:setup
   # or run individually:
   # bun run db:migrate && bun run db:seed
   ```

3. **Start the development server:**
   ```bash
   bun dev
   ```

The admin panel is live at [http://localhost:3000/admin](http://localhost:3000/admin).
Log in with credentials: `admin` / `admin`.

## 🛠️ Available Scripts

- `docker compose up -d`: Starts the local PostgreSQL 16 container
- `docker compose down`: Stops the database container
- `bun run db:generate`: Generates Drizzle migrations from schema
- `bun run db:migrate`: Applies migrations to the PostgreSQL database
- `bun run db:seed`: Seeds sample users, profiles, posts, categories, and tags
- `bun run db:setup`: Shortcut to migrate and seed in one step
- `bun dev`: Starts the Elysia application with live-reloading
