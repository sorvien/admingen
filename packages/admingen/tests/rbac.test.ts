import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { AdminGen } from '../src/index';
import { createDrizzleAdapter } from '../../adapter-drizzle/src';
import type { AuthProvider, AuthUser } from '@sorvien/admingen-types';

describe('AdminGen RBAC Permissions', () => {
  const posts = sqliteTable('posts', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
  });

  const sqlite = new Database(':memory:');
  sqlite.run('CREATE TABLE posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL)');
  sqlite.run("INSERT INTO posts (title) VALUES ('First Post')");

  const db = drizzle(sqlite, { schema: { posts } });

  // Resource with custom permissions
  const adapterResult = createDrizzleAdapter({
    schema: { posts },
    config: {
      resources: [
        {
          slug: 'posts',
          permissions: {
            list: ['admin', 'editor', 'viewer'],
            read: ['admin', 'editor', 'viewer'],
            create: ['admin', 'editor'],
            update: ['admin', 'editor'],
            delete: ['admin'],
          },
        },
      ],
    },
  });

  const currentRole: string | undefined = 'viewer';

  const mockAuthProvider: AuthProvider = {
    authenticate: async (ctx: any): Promise<AuthUser | null> => {
      const headerRole = ctx.request.headers.get('x-test-role');
      const role = headerRole ?? currentRole;
      if (!role) return null;
      return {
        id: '1',
        email: `${role}@example.com`,
        role,
      };
    },
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
  };

  const app = new Elysia()
    .decorate('db', db)
    .use(AdminGen({ adapterResult, adminPath: '/admin', authProvider: mockAuthProvider }));

  it('exposes permissions in schema JSON', async () => {
    const res = await app.handle(new Request('http://localhost/admin/api/_schema', {
      headers: { 'x-test-role': 'admin' },
    }));
    expect(res.status).toBe(200);

    const schema = await res.json();
    const postsResource = schema.resources.find((r: any) => r.name === 'posts');
    expect(postsResource.permissions).toBeDefined();
    expect(postsResource.permissions.list).toEqual(['admin', 'editor', 'viewer']);
    expect(postsResource.permissions.delete).toEqual(['admin']);
  });

  it('allows viewer to list and read', async () => {
    const listRes = await app.handle(new Request('http://localhost/admin/api/posts', {
      headers: { 'x-test-role': 'viewer' },
    }));
    expect(listRes.status).toBe(200);

    const readRes = await app.handle(new Request('http://localhost/admin/api/posts/1', {
      headers: { 'x-test-role': 'viewer' },
    }));
    expect(readRes.status).toBe(200);
  });

  it('forbids viewer from creating, updating, and deleting', async () => {
    const createRes = await app.handle(new Request('http://localhost/admin/api/posts', {
      method: 'POST',
      headers: {
        'x-test-role': 'viewer',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Unauthorized Post' }),
    }));
    expect(createRes.status).toBe(403);
    const createJson = await createRes.json();
    expect(createJson.error).toContain('Forbidden');

    const updateRes = await app.handle(new Request('http://localhost/admin/api/posts/1', {
      method: 'PATCH',
      headers: {
        'x-test-role': 'viewer',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Updated' }),
    }));
    expect(updateRes.status).toBe(403);

    const deleteRes = await app.handle(new Request('http://localhost/admin/api/posts/1', {
      method: 'DELETE',
      headers: { 'x-test-role': 'viewer' },
    }));
    expect(deleteRes.status).toBe(403);
  });

  it('allows editor to create and update, but forbids delete', async () => {
    const createRes = await app.handle(new Request('http://localhost/admin/api/posts', {
      method: 'POST',
      headers: {
        'x-test-role': 'editor',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Editor Post' }),
    }));
    expect(createRes.status).toBe(200);

    const updateRes = await app.handle(new Request('http://localhost/admin/api/posts/1', {
      method: 'PATCH',
      headers: {
        'x-test-role': 'editor',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Editor Updated' }),
    }));
    expect(updateRes.status).toBe(200);

    const deleteRes = await app.handle(new Request('http://localhost/admin/api/posts/1', {
      method: 'DELETE',
      headers: { 'x-test-role': 'editor' },
    }));
    expect(deleteRes.status).toBe(403);
  });

  it('allows admin to delete', async () => {
    const deleteRes = await app.handle(new Request('http://localhost/admin/api/posts/1', {
      method: 'DELETE',
      headers: { 'x-test-role': 'admin' },
    }));
    expect(deleteRes.status).toBe(200);
  });

  it('supports boolean permissions (e.g. delete: false)', async () => {
    const lockedAdapter = createDrizzleAdapter({
      schema: { posts },
      config: {
        resources: [
          {
            slug: 'posts',
            permissions: {
              delete: false,
            },
          },
        ],
      },
    });

    const lockedApp = new Elysia()
      .decorate('db', db)
      .use(AdminGen({ adapterResult: lockedAdapter, adminPath: '/admin', authProvider: mockAuthProvider }));

    const deleteRes = await lockedApp.handle(new Request('http://localhost/admin/api/posts/1', {
      method: 'DELETE',
      headers: { 'x-test-role': 'admin' },
    }));
    expect(deleteRes.status).toBe(403);
  });

  it('supports user with roles array', async () => {
    const rolesAuthProvider: AuthProvider = {
      authenticate: async (): Promise<AuthUser> => ({
        id: '2',
        email: 'multi@example.com',
        roles: ['viewer', 'editor'],
      }),
      login: async () => ({ success: true }),
      logout: async () => ({ success: true }),
    };

    const rolesApp = new Elysia()
      .decorate('db', db)
      .use(AdminGen({ adapterResult, adminPath: '/admin', authProvider: rolesAuthProvider }));

    // Editor in roles array should allow update
    const updateRes = await rolesApp.handle(new Request('http://localhost/admin/api/posts/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Multi Roles Updated' }),
    }));
    expect(updateRes.status).toBe(200);

    // But delete is admin-only, so multi roles without admin should be forbidden
    const deleteRes = await rolesApp.handle(new Request('http://localhost/admin/api/posts/1', {
      method: 'DELETE',
    }));
    expect(deleteRes.status).toBe(403);
  });

  it('allows full access when resource has no permissions config (backward compatibility)', async () => {
    const defaultAdapter = createDrizzleAdapter({ schema: { posts } });
    const defaultApp = new Elysia()
      .decorate('db', db)
      .use(AdminGen({ adapterResult: defaultAdapter, adminPath: '/admin', authProvider: mockAuthProvider }));

    const res = await defaultApp.handle(new Request('http://localhost/admin/api/posts', {
      headers: { 'x-test-role': 'viewer' },
    }));
    expect(res.status).toBe(200);
  });

  it('defaults to role admin in zero-config mode', async () => {
    // In zero config mode (no authProvider), user is { role: 'admin' }
    const zeroConfigApp = new Elysia()
      .decorate('db', db)
      .use(AdminGen({ adapterResult, adminPath: '/admin' }));

    const deleteRes = await zeroConfigApp.handle(new Request('http://localhost/admin/api/posts/1', {
      method: 'DELETE',
    }));
    expect(deleteRes.status).toBe(200);
  });
});
