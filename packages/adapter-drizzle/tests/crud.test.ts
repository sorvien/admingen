import { describe, it, expect, beforeEach } from 'bun:test';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
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
});
