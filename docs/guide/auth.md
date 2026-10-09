# Authentication & Access Control

AdminGen features a pluggable authentication architecture. By default, it operates in **zero-config mode** (auth disabled for development). In production, you can connect your existing auth system in a few lines of code.

---

## The AuthProvider Interface

To secure your admin panel, provide an `authProvider` to `AdminGen()`:

```ts
import type { AuthProvider, AuthUser } from '@sorvien/admingen';

const authProvider: AuthProvider = {
  async authenticate(ctx) {
    // 1. Verify session cookie, JWT, or token from ctx
    // 2. Return AuthUser if valid, or null if unauthenticated
    return {
      id: 1,
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin', // Or roles: ['admin', 'editor']
    };
  },
};
```

When `authProvider` returns `null`:
- Direct API calls (`/admin/api/*`) are rejected with `401 Unauthorized`.
- The UI redirects the user to the login screen.

---

## Role-Based Access Control (RBAC)

AdminGen includes fine-grained role-based access control per resource and per action (`list`, `read`, `create`, `update`, `delete`).

### 1. Assigning Roles to Users

In your `authProvider`, return a `role` (single string) or `roles` (array of strings) for the authenticated user:

```ts
const authProvider: AuthProvider = {
  async authenticate(ctx) {
    const session = await getSession(ctx);
    if (!session) return null;

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role, // e.g. 'editor'
      // Alternatively, support multi-role users:
      // roles: ['editor', 'support'],
    };
  },
};
```

> [!NOTE] Zero-Config Default
> When no `authProvider` is specified, AdminGen automatically assigns the user the `'admin'` role, giving full access for quick local development.

### 2. Defining Resource Permissions

Configure permissions for each resource in `createDrizzleAdapter`:

```ts
import { createDrizzleAdapter } from '@sorvien/admingen-adapter-drizzle';
import * as schema from './schema';

export const adapterResult = createDrizzleAdapter({
  schema,
  config: {
    resources: [
      {
        slug: 'posts',
        permissions: {
          // Allow viewers, editors, and admins to list & view posts
          list: ['admin', 'editor', 'viewer'],
          read: ['admin', 'editor', 'viewer'],

          // Only editors and admins can create or update posts
          create: ['admin', 'editor'],
          update: ['admin', 'editor'],

          // Only admins can delete posts
          delete: ['admin'],
        },
      },
      {
        slug: 'audit_logs',
        permissions: {
          // Viewers and admins can inspect logs
          list: ['admin', 'viewer'],
          read: ['admin', 'viewer'],

          // Completely disable creation, updates, and deletes for everyone
          create: false,
          update: false,
          delete: false,
        },
      },
    ],
  },
});
```

### 3. Permission Actions

| Action | Controls | When Forbidden |
| :--- | :--- | :--- |
| `list` | Listing records (`GET /admin/api/:resource`) | Resource hidden from sidebar; API returns `403` |
| `read` | Viewing record details (`GET /admin/api/:resource/:id`) | Displays "Access Denied" screen in UI; API returns `403` |
| `create` | Creating new records (`POST /admin/api/:resource`) | "Create New" button hidden; API returns `403` |
| `update` | Updating existing records (`PATCH /admin/api/:resource/:id`) | "Edit" button hidden; Form fields disabled; API returns `403` |
| `delete` | Deleting records (`DELETE /admin/api/:resource/:id`) | "Delete" button hidden in table and form; API returns `403` |

### 4. Boolean Shorthands & Backward Compatibility

- **Disabling actions**: Pass `false` (e.g. `delete: false`) to completely disable that action for all roles, including admins.
- **Enabling for all**: Pass `true` to allow any authenticated user to perform the action.
- **Unrestricted resources**: If a resource omits the `permissions` object, full access is granted by default (backward compatible).

---

## Recipe 1: Cookie-Based Authentication

Here is a complete login & logout setup using standard HTTP-only cookies with roles:

```ts
import { Elysia } from 'elysia';
import { AdminGen } from '@sorvien/admingen';

const authProvider = {
  authenticate: async (ctx: any) => {
    const token = ctx.cookie?.admin_session?.value || ctx.cookie?.admin_session;
    if (token === 'admin_token') {
      return { id: 1, name: 'Admin', email: 'admin@example.com', role: 'admin' };
    }
    if (token === 'editor_token') {
      return { id: 2, name: 'Editor', email: 'editor@example.com', role: 'editor' };
    }
    return null;
  },
};

const app = new Elysia()
  // Login Endpoint
  .post('/admin/api/_auth/login', ({ body, cookie, set }: any) => {
    const { email, password } = body || {};
    if (email === 'admin@example.com' && password === 'supersecret') {
      cookie.admin_session.set({
        value: 'admin_token',
        httpOnly: true,
        path: '/',
      });
      return { success: true };
    }
    set.status = 401;
    return 'Invalid credentials';
  })
  // Logout Endpoint
  .post('/admin/api/_auth/logout', ({ cookie }: any) => {
    cookie.admin_session.remove();
    return { success: true };
  })
  // Mount AdminGen
  .use(AdminGen({
    adapterResult,
    authProvider,
  }));
```

---

## Recipe 2: Better-Auth Integration

If you use [Better-Auth](https://better-auth.com), integrate it directly with roles:

```ts
import { auth } from './auth'; // Your Better-Auth instance

const authProvider = {
  authenticate: async (ctx: any) => {
    const session = await auth.api.getSession({
      headers: ctx.headers,
    });

    if (session?.user) {
      return {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role || 'viewer',
      };
    }

    return null;
  },
};
```
