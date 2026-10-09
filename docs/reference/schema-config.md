# Schema Configuration & API Reference

This page documents the type mapping and configuration options available in AdminGen.

---

## AdminGen Options

Passed to `AdminGen(options)`:

```ts
export interface AdminGenOptions {
  /** The adapter result produced by createDrizzleAdapter */
  adapterResult: AdapterResult;

  /** Route prefix where AdminGen is mounted. Defaults to '/admin' */
  adminPath?: string;

  /** Optional auth provider to verify user sessions */
  authProvider?: AuthProvider;

  /** Elysia beforeHandle hook for custom request filtering */
  beforeHandle?: (context: any) => any;

  /** Enable verbose diagnostic logs */
  debug?: boolean;
}
```

---

## Field Type Mapping

When `createDrizzleAdapter({ schema })` runs, it introspects your Drizzle tables and maps column data types to AdminGen field types:

| Drizzle Column Type | AdminGen Field Type | Rendered Component |
| :--- | :--- | :--- |
| `text()`, `varchar()`, `char()` | `text` | Text Input |
| Multi-line `text()` | `textarea` | Resizable Textarea |
| `integer()`, `serial()`, `real()`, `numeric()` | `number` | Numeric Input with step controls |
| `boolean()` | `boolean` | Switch / Toggle Badge |
| `timestamp()`, `date()` | `date` | Date Picker & Relative Timestamp |
| `json()`, `jsonb()` | `json` | Interactive JSON syntax editor |
| `references(() => otherTable.id)` | `relationship` | Dynamic Searchable Select Dropdown |
| Enum fields with predefined values | `select` | Dropdown Select |

---

## Overrides & Resource Configuration

You can customize individual field behaviors, labels, permissions, and lifecycle hooks by providing custom config overrides to `createDrizzleAdapter`:

```ts
const adapterResult = createDrizzleAdapter({
  schema,
  config: {
    resources: [
      {
        slug: 'users',
        label: 'App Members',
        // 1. Override specific fields (merged with introspected columns)
        fields: [
          {
            name: 'role',
            type: 'select',
            options: [
              { label: 'Admin', value: 'admin' },
              { label: 'Editor', value: 'editor' },
              { label: 'Viewer', value: 'viewer' },
            ],
          },
          {
            name: 'hashedPassword',
            hidden: true, // Hide sensitive internal fields from UI
          },
        ],
        // 2. Action permissions (RBAC)
        permissions: {
          list: ['admin', 'editor', 'viewer'],
          read: ['admin', 'editor', 'viewer'],
          create: ['admin', 'editor'],
          update: ['admin', 'editor'],
          delete: ['admin'],
        },
        // 3. Lifecycle hooks
        hooks: {
          beforeChange: async ({ data, operation, id }) => {
            return { ...data, email: data.email?.toLowerCase() };
          },
          afterChange: async ({ record, operation, id }) => {
            console.log(`User ${operation}d:`, record.id);
          },
          beforeDelete: async ({ id }) => {
            return id !== 1; // cancel if ID is 1
          },
          afterDelete: async ({ id }) => {
            console.log(`User deleted:`, id);
          },
        },
      },
    ],
  },
});
```

> [!TIP] Intelligent Field Merging
> When you declare `fields` in `config.resources`, AdminGen **merges** your specific field overrides with the automatically introspected table columns. You only need to define the specific fields you want to alter or enrich.

---

## AdminResourceConfig

```ts
export interface AdminResourceConfig<T = any> {
  /** Database table slug matching the introspected table name (e.g. 'users', 'posts') */
  slug: string;

  /** Human-readable display label in sidebar and table headers */
  label?: string;

  /** Primary key column name, or string[] for composite primary keys */
  primaryKey?: string | string[];

  /** Field overrides merged with introspected columns */
  fields?: AdminField[];

  /** Role-based action permissions */
  permissions?: ResourcePermissions;

  /** Lifecycle hooks */
  hooks?: ResourceHooks<T>;
}
```

---

## AdminField Properties

```ts
export interface AdminField {
  /** Column name matching the database schema */
  name: string;

  /** Custom display label in form inputs and table headers */
  label?: string;

  /** Input and presentation widget type */
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'relationship' | 'select' | 'json' | 'password';

  /** Indicates primary key column (cannot be edited) */
  isId?: boolean;

  /** Marks input as mandatory */
  required?: boolean;

  /** Renders field as non-editable in create/edit forms */
  readOnly?: boolean;

  /** Hides field from data tables and form inputs */
  hidden?: boolean;

  /** Select dropdown choices when type is 'select' */
  options?: { label: string; value: string | number }[];

  /** Target resource name for relationship fields */
  relationTo?: string;

  /** Foreign key column name for relationships */
  foreignKey?: string;

  /** Relationship property name used in Drizzle "with" queries */
  relationName?: string;
}
```

---

## ResourcePermissions

```ts
export interface ResourcePermissions {
  /** Roles allowed to view table list and navigate sidebar */
  list?: string[] | boolean;

  /** Roles allowed to view detail records */
  read?: string[] | boolean;

  /** Roles allowed to create new records */
  create?: string[] | boolean;

  /** Roles allowed to edit and save existing records */
  update?: string[] | boolean;

  /** Roles allowed to delete records */
  delete?: string[] | boolean;
}
```

---

## Auth Types

```ts
export interface AuthUser {
  id: string | number;
  name?: string;
  email?: string;
  avatar?: string;
  role?: string;
  roles?: string[];
}

export interface AuthProvider {
  /** Verify request credentials and return user or null */
  authenticate: (context: any) => Promise<AuthUser | null>;

  /** Optional custom login route URL */
  loginUrl?: string;
}
```

For more details on security, see the [Authentication & Access Control Guide](/guide/auth) and [Lifecycle Hooks Guide](/guide/hooks).
