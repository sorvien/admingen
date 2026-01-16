import { Elysia } from 'elysia';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { cors } from '@elysiajs/cors';
// Import your tables specifically
import { posts, users, postsRelations, usersRelations, teams } from './schema';

import { AdminGen } from '@blackwaves/admingen';
import { createDrizzleAdapter } from '@blackwaves/admingen-adapter-drizzle';

const sqlite = new Database('sqlite.db');
// IMPORTANT: You MUST pass schema to Drizzle so query API works
const db = drizzle(sqlite, { schema: { posts, teams, users, postsRelations, usersRelations } });

// --- DUMMY AUTH PROVIDER ---
const dummyAuthProvider = {
  authenticate: async (ctx: any) => {
    // Simple check: looking for a header or cookie?
    const cookie = ctx.cookie?.auth;
    if (cookie?.value === 'secret_token') {
      return { id: 1, name: 'Admin User', email: 'admin@example.com' };
    }
    return null;
  }
};

// --- THE CONFIGURATION ---
const adapterResult = createDrizzleAdapter({
  // We pass the raw Drizzle schema objects here for introspection
  schema: { posts, users, teams },
});

const app = new Elysia()
  .use(cors())
  .decorate('db', db)
  // Implement Custom Login Handler for the Example
  .post('/admin/api/_auth/login', ({ body, cookie, set }: any) => {
    const { email, password } = body;
    // Dummy check
    if (email === 'admin' && password === 'admin') {
      cookie.auth.set({
        value: 'secret_token',
        httpOnly: true,
        path: '/'
      });
      return { success: true };
    }
    set.status = 401;
    return "Invalid credentials";
  })
  .post('/admin/api/_auth/logout', ({ cookie }: any) => {
    cookie.auth.remove();
    return { success: true };
  })
  .use(AdminGen({
    adapterResult,
    authProvider: dummyAuthProvider
  }))
  .listen(3000);

console.log(`🚀 Admin Panel live at http://localhost:3000/admin`);