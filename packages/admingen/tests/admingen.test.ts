import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { AdminGen } from '../src/index';
import { createDrizzleAdapter } from '../../adapter-drizzle/src';

describe('AdminGen Elysia Plugin', () => {
  const users = sqliteTable('users', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
  });

  const sqlite = new Database(':memory:');
  sqlite.run('CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL)');
  const db = drizzle(sqlite, { schema: { users } });
  const adapterResult = createDrizzleAdapter({ schema: { users } });

  const app = new Elysia()
    .decorate('db', db)
    .use(AdminGen({ adapterResult, adminPath: '/admin' }));

  it('should serve schema on /admin/api/_schema', async () => {
    const res = await app.handle(new Request('http://localhost/admin/api/_schema'));
    expect(res.status).toBe(200);

    const schema = await res.json();
    expect(schema.resources).toBeDefined();
    expect(schema.resources[0].name).toBe('users');
  });

  it('should serve auth info on /admin/api/_auth/me in zero-config mode', async () => {
    const res = await app.handle(new Request('http://localhost/admin/api/_auth/me'));
    expect(res.status).toBe(200);

    const auth = await res.json();
    expect(auth.user).toBeDefined();
    expect(auth.authEnabled).toBe(false);
  });

  it('should serve index.html on /admin and /admin/', async () => {
    const resRoot = await app.handle(new Request('http://localhost/admin'));
    expect(resRoot.status).toBe(200);
    expect(resRoot.headers.get('content-type')).toContain('text/html');

    const resSlash = await app.handle(new Request('http://localhost/admin/'));
    expect(resSlash.status).toBe(200);
    expect(resSlash.headers.get('content-type')).toContain('text/html');
  });

  it('should fallback to index.html for SPA deep links like /admin/users', async () => {
    const res = await app.handle(new Request('http://localhost/admin/users'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });
});
