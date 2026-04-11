# Advanced PostgreSQL Example

This example demonstrates how to use `AdminGen` with a PostgreSQL database, featuring:
- Enums (User Roles, Post Status)
- JSONB fields (Settings, Metadata)
- Complex relationships (One-to-Many, Many-to-Many)
- UUID and Serial IDs

## Setup

1. **Start PostgreSQL:**
   ```bash
   docker-compose up -d
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Generate migrations:**
   ```bash
   bun run db:generate
   ```

4. **Run migrations:**
   ```bash
   bun run db:migrate
   ```

5. **Seed the database:**
   ```bash
   bun run db:seed
   ```

6. **Start the app:**
   ```bash
   bun run dev
   ```

The admin panel will be available at [http://localhost:3000/admin](http://localhost:3000/admin).
Log in with `admin/admin`.
