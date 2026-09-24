import { eq, asc, desc, like, sql, count } from 'drizzle-orm';
import type { Context } from 'elysia';
import type {
  AdminConfig,
  AdapterResult,
  AdminHandlers,
  AdminSchema,
  AdminField,
  PaginatedResponse
} from '@blackwaves/admingen-types';
import { introspectSchema } from './introspect';

// Helper to sanitize data for JSON serialization (BigInt -> Number, Date -> ISOString)
function sanitizeData(data: any): any {
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'bigint') return Number(data);
  
  if (data instanceof Date) return data.toISOString();
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeData(value);
    }
    return sanitized;
  }
  
  return data;
}

export function createDrizzleAdapter(options: {
  schema: Record<string, any>;
  config?: Partial<AdminConfig>; // Allow optional override/extension in future
}): AdapterResult {

  // INTROSPECTION STEP:
  // Automatically generate the AdminConfig from the raw Drizzle schema
  const autoConfig = introspectSchema(options.schema);
  const config = autoConfig; // In future we can merge with options.config

  const schemaJson: AdminSchema = { resources: [] };

  // We will store the logic for each resource here, 
  // so the main 'handlers' object can look it up dynamically.
  const handlerMap: Record<string, any> = {};

  // Loop over the GENERATED CONFIG
  for (const resourceConfig of config.resources) {
    const resourceSlug = resourceConfig.slug;
    const table = resourceConfig.table;

    // 1. Build Schema for UI
    schemaJson.resources.push({
      name: resourceSlug,
      label: resourceConfig.label || resourceSlug,
      fields: resourceConfig.fields
    });

    // 2. Prepare Relationship Logic
    const withRelations: Record<string, boolean> = {};
    const foreignKeyMap: Record<string, string> = {};

    for (const field of resourceConfig.fields) {
      if (field.type === 'relationship') {
        // Use the proper relation name for Drizzle 'with' if available (e.g. 'author')
        // Fallback to field name (e.g. 'authorId') is likely wrong for 'with', but safe to keep as default
        const relName = field.relationName || field.name;
        withRelations[relName] = true;

        if (field.foreignKey) {
          foreignKeyMap[field.name] = field.foreignKey;
        }
      }
    }

    // 3. Build Handlers specific to this resource
    handlerMap[resourceSlug] = {

      // FIND MANY
      findMany: async ({ db, query }: { db: any, query: any }) => {
        if (!db.query[resourceSlug]) {
          throw new Error(`Drizzle query not found for '${resourceSlug}'. Did you pass the schema to drizzle()?`);
        }

        const page = parseInt(query.page || '1');
        const pageSize = parseInt(query.pageSize || '10');
        const offset = (page - 1) * pageSize;
        const sort = query.sort;
        const order = query.order || 'asc';
        const filterStr = query.filter; // column:value

        let where: any = undefined;
        if (filterStr && filterStr.includes(':')) {
          const [col, val] = filterStr.split(':');
          if (table[col]) {
            const column = table[col];
            const dType = (column as any).dataType || (column as any).columnType;
            if (['text', 'string', 'varchar'].includes(dType)) {
              where = like(column, `%${val}%`);
            } else {
              where = eq(column, val);
            }
          }
        }

        const orderBy = sort && table[sort]
          ? (order === 'desc' ? desc(table[sort]) : asc(table[sort]))
          : undefined;

        const data = await db.query[resourceSlug].findMany({
          with: Object.keys(withRelations).length > 0 ? withRelations : undefined,
          limit: pageSize,
          offset: offset,
          orderBy: orderBy,
          where: where,
        });

        const countRes = await db.select({ count: count() }).from(table).where(where);
        const total = Number(countRes[0].count);

        return sanitizeData({
          data,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        }) as PaginatedResponse<any>;
      },

      // FIND ONE
      findOne: async ({ db, params }: { db: any, params: { id: any } }) => {
        const pkField = resourceConfig.fields.find(f => f.isId);
        const pkColumn = table[pkField?.name || 'id'];
        
        // Handle ID type (Drizzle integer vs string)
        const id = pkField?.type === 'number' ? Number(params.id) : params.id;

        if (!pkColumn) {
          throw new Error(`Primary key column not found for ${resourceSlug}`);
        }

        return sanitizeData(await db.query[resourceSlug].findFirst({
          where: eq(pkColumn, id),
          with: Object.keys(withRelations).length > 0 ? withRelations : undefined
        }));
      },

      // CREATE
      create: async ({ db, body }: { db: any, body: any }) => {
        const data = { ...body };
        // Clean up data for insertion
        const validFields = new Set(resourceConfig.fields.map(f => f.name));
        for (const key of Object.keys(data)) {
          if (!validFields.has(key) && !foreignKeyMap[key]) {
            delete data[key];
          }
        }

        // Remap relationship fields to FK columns
        for (const [fieldName, dbColumn] of Object.entries(foreignKeyMap)) {
          if (data[fieldName] !== undefined) {
            if (fieldName !== dbColumn) {
              data[dbColumn] = data[fieldName];
              delete data[fieldName];
            }
          }
        }

        const res = await db.insert(table).values(data).returning();
        return sanitizeData(res[0]);
      },

      // UPDATE
      update: async ({ db, params, body }: { db: any, params: { id: any }, body: any }) => {
        const pkField = resourceConfig.fields.find(f => f.isId);
        const pkColumn = table[pkField?.name || 'id'];
        const id = pkField?.type === 'number' ? Number(params.id) : params.id;

        const data = { ...body };
        // Clean up data for update
        const validFields = new Set(resourceConfig.fields.map(f => f.name));
        for (const key of Object.keys(data)) {
          if (!validFields.has(key) && !foreignKeyMap[key]) {
            delete data[key];
          }
        }

        // Remap relationship fields to FK columns
        for (const [fieldName, dbColumn] of Object.entries(foreignKeyMap)) {
          if (data[fieldName] !== undefined) {
            if (fieldName !== dbColumn) {
              data[dbColumn] = data[fieldName];
              delete data[fieldName];
            }
          }
        }

        const res = await db.update(table)
          .set(data)
          .where(eq(pkColumn, id))
          .returning();

        return sanitizeData(res[0]);
      },

      // DELETE
      delete: async ({ db, params }: { db: any, params: { id: any } }) => {
        const pkField = resourceConfig.fields.find(f => f.isId);
        const pkColumn = table[pkField?.name || 'id'];
        const id = pkField?.type === 'number' ? Number(params.id) : params.id;

        const res = await db.delete(table)
          .where(eq(pkColumn, id))
          .returning();

        return sanitizeData(res[0]);
      }
    };
  }

  // 4. Create the Routing Proxy
  const handlers: AdminHandlers = {
    findMany: (resource) => (ctx: any) => {
      if (!handlerMap[resource]) throw new Error(`Resource ${resource} not found`);
      return handlerMap[resource].findMany(ctx);
    },
    findOne: (resource) => (ctx: any) => {
      if (!handlerMap[resource]) throw new Error(`Resource ${resource} not found`);
      return handlerMap[resource].findOne(ctx);
    },
    create: (resource) => (ctx: any) => {
      if (!handlerMap[resource]) throw new Error(`Resource ${resource} not found`);
      return handlerMap[resource].create(ctx);
    },
    update: (resource) => (ctx: any) => {
      if (!handlerMap[resource]) throw new Error(`Resource ${resource} not found`);
      return handlerMap[resource].update(ctx);
    },
    delete: (resource) => (ctx: any) => {
      if (!handlerMap[resource]) throw new Error(`Resource ${resource} not found`);
      return handlerMap[resource].delete(ctx);
    },
  };



  return { schemaJson, handlers };
}