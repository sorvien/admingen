import { Elysia } from 'elysia';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { cors } from '@elysiajs/cors';
import * as schema from './schema';

import { AdminGen } from '@blackwaves/admingen';
import { createDrizzleAdapter } from '@blackwaves/admingen-adapter-drizzle';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/admingen_advanced';
const client = postgres(connectionString);
const db = drizzle(client, { schema });

// --- DUMMY AUTH PROVIDER ---
const dummyAuthProvider = {
  authenticate: async (ctx: any) => {
    const token = ctx.cookie?.auth?.value || ctx.cookie?.auth;
    if (token === 'secret_token') {
      return { id: 1, name: 'Admin User', email: 'admin@example.com' };
    }
    return null;
  }
};

// --- THE CONFIGURATION ---
const adapterResult = createDrizzleAdapter({
  schema: schema,
});

const app = new Elysia()
  .use(cors())
  .decorate('db', db)
  // Custom Login Handler
  .post('/admin/api/_auth/login', ({ body, cookie, set }: any) => {
    const { email, password } = body;
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

console.log(`🚀 Advanced Admin Panel live at http://localhost:3000/admin`);
