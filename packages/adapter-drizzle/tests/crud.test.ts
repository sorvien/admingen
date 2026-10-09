import { describe, it, expect, beforeEach } from 'bun:test';
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { createDrizzleAdapter } from '../src/index';

describe('AdminGen CRUD Handlers', () => {
  const posts = sqliteTable('posts', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    content: text('content'),
  });

  let db: any;
  let adapter: any;

  beforeEach(() => {
    const sqlite = new Database(':memory:');
    sqlite.run(`
      CREATE TABLE posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT
      )
    `);
    db = drizzle(sqlite, { schema: { posts } });
    adapter = createDrizzleAdapter({ schema: { posts } });
  });

  it('should create and retrieve a record', async () => {
    const created = await adapter.handlers.create('posts')({
      db,
      body: { title: 'First Post', content: 'Hello World' },
    });

    expect(created.id).toBe(1);
    expect(created.title).toBe('First Post');

    const found = await adapter.handlers.findOne('posts')({
      db,
      params: { id: 1 },
    });
    expect(found.title).toBe('First Post');
    expect(found.content).toBe('Hello World');
  });

  it('should list records with pagination', async () => {
    await adapter.handlers.create('posts')({ db, body: { title: 'Post 1' } });
    await adapter.handlers.create('posts')({ db, body: { title: 'Post 2' } });
    await adapter.handlers.create('posts')({ db, body: { title: 'Post 3' } });

    const result = await adapter.handlers.findMany('posts')({
      db,
      query: { page: '1', pageSize: '2' },
    }) as any;

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(3);
    expect(result.totalPages).toBe(2);
    expect(result.page).toBe(1);
  });

  it('should update a record', async () => {
    await adapter.handlers.create('posts')({ db, body: { title: 'Old Title' } });
    const updated = await adapter.handlers.update('posts')({
      db,
      params: { id: 1 },
      body: { title: 'New Title' },
    });

    expect(updated.title).toBe('New Title');
  });

  it('should delete a record', async () => {
    await adapter.handlers.create('posts')({ db, body: { title: 'To Delete' } });
    const deleted = await adapter.handlers.delete('posts')({
      db,
      params: { id: 1 },
    });

    expect(deleted.id).toBe(1);

    const list = await adapter.handlers.findMany('posts')({
      db,
      query: {},
    }) as any;
    expect(list.data).toHaveLength(0);
  });

  it('should run lifecycle hooks around create and update', async () => {
    const afterChangeCalls: any[] = [];

    adapter = createDrizzleAdapter({
      schema: { posts },
      config: {
        resources: [{
          slug: 'posts',
          hooks: {
            beforeChange: async ({ data, operation, id }) => {
              await Promise.resolve();
              return {
                ...data,
                title: `${operation}:${data.title.trim()}`,
                content: id === undefined ? 'created' : `updated-${id}`,
              };
            },
            afterChange: async (ctx) => {
              await Promise.resolve();
              afterChangeCalls.push(ctx);
            },
          },
        }],
      },
    });

    const created = await adapter.handlers.create('posts')({
      db,
      body: { title: '  First  ', ignored: 'not-a-column' },
    });

    expect(created.title).toBe('create:First');
    expect(created.content).toBe('created');

    const updated = await adapter.handlers.update('posts')({
      db,
      params: { id: 1 },
      body: { title: '  Second  ' },
    });

    expect(updated.title).toBe('update:Second');
    expect(updated.content).toBe('updated-1');

    expect(afterChangeCalls).toHaveLength(2);
    expect(afterChangeCalls[0]).toEqual({
      record: created,
      operation: 'create',
    });
    expect(afterChangeCalls[1]).toEqual({
      record: updated,
      operation: 'update',
      id: 1,
    });
  });

  it('should cancel deletes when beforeDelete returns false and run afterDelete on success', async () => {
    const deletedIds: Array<string | number> = [];

    adapter = createDrizzleAdapter({
      schema: { posts },
      config: {
        resources: [{
          slug: 'posts',
          hooks: {
            beforeDelete: async ({ id }) => {
              await Promise.resolve();
              return id !== 1;
            },
            afterDelete: async ({ id }) => {
              await Promise.resolve();
              deletedIds.push(id);
            },
          },
        }],
      },
    });

    await adapter.handlers.create('posts')({ db, body: { title: 'Protected' } });
    await adapter.handlers.create('posts')({ db, body: { title: 'Removable' } });

    await expect(
      adapter.handlers.delete('posts')({ db, params: { id: 1 } })
    ).rejects.toThrow("Deletion cancelled by beforeDelete hook for 'posts'");

    const protectedRecord = await adapter.handlers.findOne('posts')({
      db,
      params: { id: 1 },
    });
    expect(protectedRecord.title).toBe('Protected');
    expect(deletedIds).toEqual([]);

    const deleted = await adapter.handlers.delete('posts')({
      db,
      params: { id: 2 },
    });

    expect(deleted.title).toBe('Removable');
    expect(deletedIds).toEqual([2]);
  });

  it('should propagate beforeChange errors without writing the record', async () => {
    adapter = createDrizzleAdapter({
      schema: { posts },
      config: {
        resources: [{
          slug: 'posts',
          hooks: {
            beforeChange: () => {
              throw new Error('change rejected');
            },
          },
        }],
      },
    });

    await expect(
      adapter.handlers.create('posts')({ db, body: { title: 'Blocked' } })
    ).rejects.toThrow('change rejected');

    const list = await adapter.handlers.findMany('posts')({
      db,
      query: {},
    }) as any;

    expect(list.data).toHaveLength(0);
  });

  it('should reject invalid beforeChange return values', async () => {
    adapter = createDrizzleAdapter({
      schema: { posts },
      config: {
        resources: [{
          slug: 'posts',
          hooks: {
            beforeChange: (() => undefined) as any,
          },
        }],
      },
    });

    await expect(
      adapter.handlers.create('posts')({ db, body: { title: 'Invalid' } })
    ).rejects.toThrow("beforeChange hook for 'posts' must return a record object");
  });

  it('should filter boolean columns using query-string values', async () => {
    const flags = sqliteTable('flags', {
      id: integer('id').primaryKey({ autoIncrement: true }),
      enabled: integer('enabled', { mode: 'boolean' }).notNull(),
    });

    const sqlite = new Database(':memory:');
    sqlite.run('CREATE TABLE flags (id INTEGER PRIMARY KEY AUTOINCREMENT, enabled INTEGER NOT NULL)');
    const flagDb = drizzle(sqlite, { schema: { flags } });
    const flagAdapter = createDrizzleAdapter({ schema: { flags } });

    await flagAdapter.handlers.create('flags')({ db: flagDb, body: { enabled: true } });
    await flagAdapter.handlers.create('flags')({ db: flagDb, body: { enabled: false } });

    const result = await flagAdapter.handlers.findMany('flags')({
      db: flagDb,
      query: { filter: 'enabled:false' },
    }) as any;

    expect(result.data).toHaveLength(1);
    expect(result.data[0].enabled).toBe(false);
  });

  it('should use exact matching for select filters', async () => {
    const statuses = sqliteTable('statuses', {
      id: integer('id').primaryKey({ autoIncrement: true }),
      status: text('status').notNull(),
    });

    const sqlite = new Database(':memory:');
    sqlite.run('CREATE TABLE statuses (id INTEGER PRIMARY KEY AUTOINCREMENT, status TEXT NOT NULL)');
    const statusDb = drizzle(sqlite, { schema: { statuses } });
    const statusAdapter = createDrizzleAdapter({
      schema: { statuses },
      config: {
        resources: [{
          slug: 'statuses',
          fields: [
            { name: 'id', type: 'number', isId: true },
            {
              name: 'status',
              type: 'select',
              options: [
                { label: 'Draft', value: 'draft' },
                { label: 'Published', value: 'published' },
              ],
            },
          ],
        }],
      },
    });

    await statusAdapter.handlers.create('statuses')({ db: statusDb, body: { status: 'draft' } });
    await statusAdapter.handlers.create('statuses')({ db: statusDb, body: { status: 'draft-old' } });

    const result = await statusAdapter.handlers.findMany('statuses')({
      db: statusDb,
      query: { filter: 'status:draft' },
    }) as any;

    expect(result.data).toHaveLength(1);
    expect(result.data[0].status).toBe('draft');
  });

  it('should support CRUD operations on tables with composite primary keys', async () => {
    const userRoles = sqliteTable('user_roles', {
      userId: integer('user_id').notNull(),
      roleId: integer('role_id').notNull(),
      assignedBy: text('assigned_by'),
    }, (table) => [
      primaryKey({ columns: [table.userId, table.roleId] })
    ]);

    const sqlite = new Database(':memory:');
    sqlite.run(`
      CREATE TABLE user_roles (
        user_id INTEGER NOT NULL,
        role_id INTEGER NOT NULL,
        assigned_by TEXT,
        PRIMARY KEY (user_id, role_id)
      )
    `);

    const compositeDb = drizzle(sqlite, { schema: { userRoles } });
    const compositeAdapter = createDrizzleAdapter({ schema: { userRoles } });

    // 1. Check schemaJson has primaryKey array
    const resourceSchema = compositeAdapter.schemaJson.resources.find(r => r.name === 'userRoles');
    expect(resourceSchema).toBeDefined();
    expect(resourceSchema?.primaryKey).toEqual(['userId', 'roleId']);

    // 2. Create
    const created = await compositeAdapter.handlers.create('userRoles')({
      db: compositeDb,
      body: { userId: 1, roleId: 42, assignedBy: 'admin' },
    });
    expect(created.userId).toBe(1);
    expect(created.roleId).toBe(42);
    expect(created.assignedBy).toBe('admin');

    // 3. Find One via delimiter '1_42'
    const found = await compositeAdapter.handlers.findOne('userRoles')({
      db: compositeDb,
      params: { id: '1_42' },
    });
    expect(found).toBeDefined();
    expect(found.userId).toBe(1);
    expect(found.roleId).toBe(42);
    expect(found.assignedBy).toBe('admin');

    // 4. Find One via JSON string
    const foundJson = await compositeAdapter.handlers.findOne('userRoles')({
      db: compositeDb,
      params: { id: JSON.stringify({ userId: 1, roleId: 42 }) },
    });
    expect(foundJson.assignedBy).toBe('admin');

    // 5. Update via composite ID
    const updated = await compositeAdapter.handlers.update('userRoles')({
      db: compositeDb,
      params: { id: '1_42' },
      body: { assignedBy: 'superadmin' },
    });
    expect(updated.assignedBy).toBe('superadmin');

    const foundAfterUpdate = await compositeAdapter.handlers.findOne('userRoles')({
      db: compositeDb,
      params: { id: '1_42' },
    });
    expect(foundAfterUpdate.assignedBy).toBe('superadmin');

    // 6. Delete via composite ID
    const deleted = await compositeAdapter.handlers.delete('userRoles')({
      db: compositeDb,
      params: { id: '1_42' },
    });
    expect(deleted.userId).toBe(1);
    expect(deleted.roleId).toBe(42);

    const foundAfterDelete = await compositeAdapter.handlers.findOne('userRoles')({
      db: compositeDb,
      params: { id: '1_42' },
    });
    expect(foundAfterDelete).toBeUndefined();
  });
});
