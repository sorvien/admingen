import { Elysia } from 'elysia';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { cors } from '@elysiajs/cors';
import { posts, users, postsRelations, usersRelations, teams, teamsRelations } from './schema';
import { AdminGen } from '@blackwaves/admingen';
import { createDrizzleAdapter } from '@blackwaves/admingen-adapter-drizzle';

// 1. Initialize SQLite database & ensure schema tables exist
const sqlite = new Database('sqlite.db');

sqlite.run(`
  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    team_id INTEGER REFERENCES teams(id)
  );
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    author_id INTEGER REFERENCES users(id)
  );
`);

// 2. Seed initial demo data if database is empty
const row = sqlite.query('SELECT count(*) as count FROM users').get() as { count: number };
if (!row || row.count === 0) {
  sqlite.run(`
    INSERT INTO teams (name) VALUES ('Core Team'), ('Engineering'), ('Design');
    INSERT INTO users (name, email, team_id) VALUES 
      ('Alice Johnson', 'alice@example.com', 1),
      ('Bob Smith', 'bob@example.com', 2),
      ('Charlie Brown', 'charlie@example.com', 3);
    INSERT INTO posts (title, content, author_id) VALUES 
      ('Welcome to AdminGen', 'This is an instant, ultra-fast admin panel powered by Elysia and Drizzle.', 1),
      ('Bun is Blazing Fast', 'Running under 40MB of memory with sub-millisecond responses.', 2),
      ('TanStack + Shadcn UI', 'Dynamic tables with server-side pagination, sorting, and filtering.', 3);
  `);
}

const db = drizzle(sqlite, { schema: { posts, teams, users, postsRelations, usersRelations, teamsRelations } });

// 3. Demo Auth Provider
const authProvider = {
  authenticate: async (ctx: any) => {
    const token = ctx.cookie?.auth?.value || ctx.cookie?.auth;
    if (token === 'admin_token') {
      return { id: 1, name: 'Admin User', email: 'admin@example.com' };
    }
    return null;
  }
};

// 4. Create Adapter
const adapterResult = createDrizzleAdapter({
  schema: { posts, users, teams, postsRelations, usersRelations, teamsRelations },
});

// 5. Start Elysia Server with AdminGen
const app = new Elysia()
  .use(cors())
  .decorate('db', db)
  // Demo login endpoint
  .post('/admin/api/_auth/login', ({ body, cookie, set }: any) => {
    const { email, password } = body || {};
    if ((email === 'admin' || email === 'admin@example.com') && (password === 'admin' || password === 'admin123')) {
      cookie.auth.set({
        value: 'admin_token',
        httpOnly: true,
        path: '/'
      });
      return { success: true };
    }
    set.status = 401;
    return 'Invalid credentials. Use admin / admin';
  })
  // Demo logout endpoint
  .post('/admin/api/_auth/logout', ({ cookie }: any) => {
    cookie.auth.remove();
    return { success: true };
  })
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(AdminGen({
    adapterResult,
    authProvider
  }))
  .listen(port);

console.log(`
┌─────────────────────────────────────────────────────────────┐
│ ⚡ AdminGen Example Server Live                              │
│                                                             │
│ ➜ Admin Panel: http://localhost:${port}/admin                   │
│ ➜ Demo Login:  admin / admin                                │
└─────────────────────────────────────────────────────────────┘
`);