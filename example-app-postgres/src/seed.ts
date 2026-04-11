import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/admingen_advanced';
const sql = postgres(connectionString);
const db = drizzle(sql, { schema });

async function main() {
  console.log('Seeding database...');

  // Clear existing data (order matters for FKs)
  await db.delete(schema.postsToTags);
  await db.delete(schema.tags);
  await db.delete(schema.posts);
  await db.delete(schema.users);
  await db.delete(schema.categories);
  await db.delete(schema.organizations);
  console.log('Cleared old data.');

  // 1. Organizations
  const [org] = await db.insert(schema.organizations).values({
    name: 'Black Waves',
    slug: 'black-waves',
    settings: { theme: 'dark', notifications: true }
  }).returning();

  // 2. Categories
  const [catTech, catDesign] = await db.insert(schema.categories).values([
    { name: 'Technology', description: 'All things tech' },
    { name: 'Design', description: 'UI/UX and Graphic Design' }
  ]).returning();

  // 3. Users
  const [admin, editor] = await db.insert(schema.users).values([
    { 
        email: 'admin@example.com', 
        name: 'Admin', 
        role: 'admin', 
        organizationId: org.id,
        metadata: { bio: 'System Administrator' }
    },
    { 
        email: 'editor@example.com', 
        name: 'Editor', 
        role: 'editor', 
        organizationId: org.id,
        metadata: { bio: 'Content Editor' }
    },
  ]).returning();

  // 4. Tags
  const [tagBun, tagElysia, tagDrizzle] = await db.insert(schema.tags).values([
    { name: 'Bun' },
    { name: 'Elysia' },
    { name: 'Drizzle' }
  ]).returning();

  // 5. Posts
  const [post1] = await db.insert(schema.posts).values([
    { 
        title: 'Building AdminGen', 
        slug: 'building-admingen', 
        content: 'An advanced guide to building admin panels.',
        status: 'published',
        authorId: admin.id,
        categoryId: catTech.id
    },
  ]).returning();

  // 6. Post Tags
  await db.insert(schema.postsToTags).values([
    { postId: post1.id, tagId: tagBun.id },
    { postId: post1.id, tagId: tagElysia.id },
    { postId: post1.id, tagId: tagDrizzle.id },
  ]);

  console.log('✅ Seed complete!');
  await sql.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});