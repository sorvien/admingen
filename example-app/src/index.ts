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

// --- THE CONFIGURATION ---
const adapterResult = createDrizzleAdapter({
  // We pass the raw Drizzle schema objects here for introspection
  schema: { posts, users, teams },
});

const app = new Elysia()
  .use(cors())
  .decorate('db', db)
  .use(AdminGen({ adapterResult }))
  .listen(3000);

console.log(`🚀 Admin Panel live at http://localhost:3000/admin`);