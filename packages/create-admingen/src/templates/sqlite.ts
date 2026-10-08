import { getPackageManagerCommands, type PackageManager } from '../package-manager';

export function getSqliteFiles(projectName: string, includeSeed: boolean, packageManager: PackageManager = 'bun'): Record<string, string> {
  const packageCommands = getPackageManagerCommands(packageManager);
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'bun run --watch src/index.ts',
      seed: 'bun run src/seed.ts',
    },
    dependencies: {
      elysia: '^1.4.30',
      'drizzle-orm': 'latest',
      '@elysiajs/cors': '^1.4.2',
      '@sorvien/admingen': 'latest',
      '@sorvien/admingen-adapter-drizzle': 'latest',
    },
    devDependencies: {
      '@types/bun': 'latest',
      typescript: '^5.0.0',
    },
  };

  const tsconfig = {
    compilerOptions: {
      target: 'esnext',
      module: 'esnext',
      moduleResolution: 'bundler',
      strict: true,
      skipLibCheck: true,
      types: ['bun'],
    },
    include: ['src/**/*'],
  };

  const schema = `import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const teams = sqliteTable('teams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
});

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role', { enum: ['admin', 'member', 'guest'] }).default('member'),
  teamId: integer('team_id').references(() => teams.id),
});

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content'),
  authorId: integer('author_id').references(() => users.id),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one }) => ({
  team: one(teams, {
    fields: [users.teamId],
    references: [teams.id],
  }),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
`;

  const seed = `import { Database } from 'bun:sqlite';

export function runSeed(sqlite: Database) {
  sqlite.run(\`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT DEFAULT 'member',
      team_id INTEGER REFERENCES teams(id)
    );
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      author_id INTEGER REFERENCES users(id)
    );
  \`);

  const countRow = sqlite.query('SELECT count(*) as count FROM users').get() as { count: number };
  if (!countRow || countRow.count === 0) {
    sqlite.run(\`
      INSERT INTO teams (name) VALUES ('Core Engineering'), ('Product & Design'), ('Operations');
      INSERT INTO users (name, email, role, team_id) VALUES 
        ('Alice Johnson', 'alice@example.com', 'admin', 1),
        ('Bob Smith', 'bob@example.com', 'member', 2),
        ('Charlie Brown', 'charlie@example.com', 'guest', 3);
      INSERT INTO posts (title, content, author_id) VALUES 
        ('Welcome to AdminGen', 'This is an instant, ultra-fast admin panel powered by Elysia and Drizzle.', 1),
        ('Sub-40MB Memory', 'Running with sub-millisecond responses on Bun runtime.', 2),
        ('Interactive Data Tables', 'Dynamic tables with server-side pagination, sorting, and filtering.', 3);
    \`);
  }
}
`;

  const index = `import { Elysia } from 'elysia';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { cors } from '@elysiajs/cors';
import { AdminGen } from '@sorvien/admingen';
import { createDrizzleAdapter } from '@sorvien/admingen-adapter-drizzle';
import * as schema from './schema';
${includeSeed ? "import { runSeed } from './seed';" : ''}

// 1. Initialize SQLite Database
const sqlite = new Database('sqlite.db');
${includeSeed ? 'runSeed(sqlite);' : ''}
const db = drizzle(sqlite, { schema });

// 2. Demo Auth Provider
const authProvider = {
  authenticate: async (ctx: any) => {
    const token = ctx.cookie?.auth?.value || ctx.cookie?.auth;
    if (token === 'admin_token') {
      return { id: 1, name: 'Admin User', email: 'admin@example.com' };
    }
    return null;
  },
};

// 3. Mount AdminGen on Elysia
const app = new Elysia()
  .use(cors())
  .decorate('db', db)
  .get('/', ({ set }: any) => {
    set.redirect = '/admin';
  })
  .post('/admin/api/_auth/login', ({ body, cookie, set }: any) => {
    const { email, password } = body || {};
    if ((email === 'admin' || email === 'admin@example.com') && (password === 'admin' || password === 'admin123')) {
      cookie.auth.set({
        value: 'admin_token',
        httpOnly: true,
        path: '/',
      });
      return { success: true };
    }
    set.status = 401;
    return 'Invalid credentials. Use admin / admin';
  })
  .post('/admin/api/_auth/logout', ({ cookie }: any) => {
    cookie.auth.remove();
    return { success: true };
  })
  .use(AdminGen({
    adapterResult: createDrizzleAdapter({ schema }),
    authProvider,
  }))
  .listen(3000);

console.log(\`
┌─────────────────────────────────────────────────────────────┐
│ ⚡ AdminGen Server Live                                      │
│                                                             │
│ ➜ Admin Panel: http://localhost:3000/admin                   │
│ ➜ Demo Login:  admin / admin                                │
└─────────────────────────────────────────────────────────────┘
\`);
`;

  const gitignore = `node_modules
sqlite.db
*.sqlite
.DS_Store
dist
`;

  const readme = `# ${projectName}

Built with **[AdminGen](https://github.com/sorvien/admingen)**, **[ElysiaJS](https://elysiajs.com)**, and **[Drizzle ORM](https://orm.drizzle.team)**.

## Quick Start

\`\`\`bash
# 1. Install dependencies
${packageCommands.install}

# 2. Run dev server
${packageCommands.dev}
\`\`\`

Open **[http://localhost:3000/admin](http://localhost:3000/admin)** in your browser.  
Log in with **\`admin\`** / **\`admin\`**.
`;

  const files: Record<string, string> = {
    'package.json': JSON.stringify(packageJson, null, 2),
    'tsconfig.json': JSON.stringify(tsconfig, null, 2),
    'src/schema.ts': schema,
    'src/index.ts': index,
    '.gitignore': gitignore,
    'README.md': readme,
  };

  if (includeSeed) {
    files['src/seed.ts'] = seed;
  }

  return files;
}
