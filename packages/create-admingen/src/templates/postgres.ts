import { getPackageManagerCommands, type PackageManager } from '../package-manager';

export function getPostgresFiles(projectName: string, _includeSeed: boolean, packageManager: PackageManager = 'bun'): Record<string, string> {
  const packageCommands = getPackageManagerCommands(packageManager);
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'bun run --watch src/index.ts',
      'docker:up': 'docker compose up -d',
      'docker:down': 'docker compose down',
    },
    dependencies: {
      elysia: '^1.4.30',
      'drizzle-orm': 'latest',
      postgres: 'latest',
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

  const schema = `import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(),
  role: text('role').default('member'),
  organizationId: integer('organization_id').references(() => organizations.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(members),
}));

export const membersRelations = relations(members, ({ one }) => ({
  organization: one(organizations, {
    fields: [members.organizationId],
    references: [organizations.id],
  }),
}));
`;

  const index = `import { Elysia } from 'elysia';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { cors } from '@elysiajs/cors';
import { AdminGen } from '@sorvien/admingen';
import { createDrizzleAdapter } from '@sorvien/admingen-adapter-drizzle';
import * as schema from './schema';

// 1. Connect to PostgreSQL
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/${projectName}';
const client = postgres(connectionString);
const db = drizzle(client, { schema });

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

// 3. Mount AdminGen
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
│ ⚡ AdminGen PostgreSQL Server Live                           │
│                                                             │
│ ➜ Admin Panel: http://localhost:3000/admin                   │
│ ➜ Demo Login:  admin / admin                                │
└─────────────────────────────────────────────────────────────┘
\`);
`;

  const dockerCompose = `version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: ${projectName}-postgres
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ${projectName}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
`;

  const gitignore = `node_modules
.env
.DS_Store
dist
`;

  const readme = `# ${projectName}

Built with **[AdminGen](https://github.com/sorvien/admingen)**, **[ElysiaJS](https://elysiajs.com)**, and **[PostgreSQL](https://orm.drizzle.team)**.

## Quick Start

\`\`\`bash
# 1. Start Postgres with Docker
${packageCommands.run('docker:up')}

# 2. Install dependencies & run dev
${packageCommands.install}
${packageCommands.dev}
\`\`\`

Open **[http://localhost:3000/admin](http://localhost:3000/admin)** in your browser.  
Log in with **\`admin\`** / **\`admin\`**.
`;

  return {
    'package.json': JSON.stringify(packageJson, null, 2),
    'tsconfig.json': JSON.stringify(tsconfig, null, 2),
    'src/schema.ts': schema,
    'src/index.ts': index,
    'docker-compose.yml': dockerCompose,
    '.gitignore': gitignore,
    'README.md': readme,
  };
}
