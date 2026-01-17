import { Elysia } from 'elysia';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { cors } from '@elysiajs/cors';
// Import your tables specifically
import { posts, users, postsRelations, usersRelations, teams, teamsRelations } from './schema';

import { AdminGen } from '@blackwaves/admingen';
import { createDrizzleAdapter } from '@blackwaves/admingen-adapter-drizzle';

const sqlite = new Database('sqlite.db');
// IMPORTANT: You MUST pass schema to Drizzle so query API works
const db = drizzle(sqlite, { schema: { posts, teams, users, postsRelations, usersRelations } });

// --- DUMMY AUTH PROVIDER ---
const dummyAuthProvider = {
  authenticate: async (ctx: any) => {
    // Debug logging for request details
    const method = ctx.request?.method || 'UNKNOWN_METHOD';
    const url = ctx.request?.url || 'UNKNOWN_URL';
    console.log(`--- [Debug] AuthProvider [${method} ${url}] ---`);

    // Inspect headers and cookies
    if (!ctx.headers) console.log('⚠️ Headers are UNDEFINED');
    if (!ctx.cookie) console.log('⚠️ Cookie proxy is UNDEFINED');

    if (ctx.cookie && ctx.cookie.auth) {
      console.log('Auth Cookie Value:', ctx.cookie.auth.value);
    }

    // Try multiple ways to get the token
    const token = ctx.cookie?.auth?.value || ctx.cookie?.auth;

    if (token === 'secret_token') {
      console.log('✅ Auth success');
      return { id: 1, name: 'Admin User', email: 'admin@example.com' };
    }
    console.log('❌ Auth failed. Token found:', token);
    return null;
  }
};

// --- THE CONFIGURATION ---
const adapterResult = createDrizzleAdapter({
  // We pass the raw Drizzle schema objects here for introspection
  schema: { posts, users, teams, postsRelations, usersRelations, teamsRelations },
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