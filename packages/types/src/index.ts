// packages/types/src/index.ts

// 1. The Field Definition
export interface AdminField {
  name: string;
  label?: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'relationship' | 'select' | 'json' | 'password';
  isId?: boolean;
  required?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
  options?: { label: string; value: string | number }[];
  // For relationships
  relationTo?: string; // e.g. "users"
  foreignKey?: string; // e.g. "authorId"
  relationName?: string; // e.g. "author" - used for Drizzle "with" queries
}

// 2. The Resource Definition
export interface ResourceHooks<T = any> {
  beforeChange?: (ctx: {
    data: T;
    operation: 'create' | 'update';
    id?: string | number | Record<string, string | number>;
  }) => Promise<T> | T;
  afterChange?: (ctx: {
    record: T;
    operation: 'create' | 'update';
    id?: string | number | Record<string, string | number>;
  }) => Promise<void> | void;
  beforeDelete?: (ctx: {
    id: string | number | Record<string, string | number>;
  }) => Promise<void | boolean> | void | boolean;
  afterDelete?: (ctx: {
    id: string | number | Record<string, string | number>;
  }) => Promise<void> | void;
}

export interface ResourcePermissions {
  list?: string[] | boolean;
  read?: string[] | boolean;
  create?: string[] | boolean;
  update?: string[] | boolean;
  delete?: string[] | boolean;
}

export interface AdminResourceConfig<T = any> {
  slug: string; // e.g. "posts"
  label?: string;
  table: any; // The Drizzle table object
  fields: AdminField[];
  primaryKey?: string | string[];
  permissions?: ResourcePermissions;
  hooks?: ResourceHooks<T>;
}

// 3. The Master Config
export interface AdminConfig {
  resources: AdminResourceConfig[];
}

// ... (Keep your existing AdminSchema, AdminHandlers, AdapterResult interfaces)
export interface AdminSchema {
  resources: {
    name: string;
    label: string;
    fields: AdminField[];
    primaryKey?: string | string[];
    permissions?: ResourcePermissions;
  }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminHandlers {
  findMany: (resource: string) => (ctx: any) => Promise<PaginatedResponse<any> | any[]>;
  findOne: (resource: string) => (ctx: any) => Promise<any>;
  create: (resource: string) => (ctx: any) => Promise<any>;
  update: (resource: string) => (ctx: any) => Promise<any>;
  delete: (resource: string) => (ctx: any) => Promise<any>;
}

export interface AdapterResult {
  schemaJson: AdminSchema;
  handlers: AdminHandlers;
}

// --- Auth Types ---
export interface AuthUser {
  id: string | number;
  name?: string;
  email?: string;
  avatar?: string;
  role?: string;
  roles?: string[];
}

export interface AuthProvider {
  // Return the user if logged in, or null
  authenticate: (context: any) => Promise<AuthUser | null>;
  // Optional: Return a custom login page HTML or boolean to use default
  loginUrl?: string;
}