import { eq, asc, desc, like, count } from 'drizzle-orm';
import type {
  AdminConfig,
  AdapterResult,
  AdminHandlers,
  AdminSchema,
  AdminResourceConfig,
  PaginatedResponse
} from '@sorvien/admingen-types';
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

type AdminResourceOverride =
  Pick<AdminResourceConfig, 'slug'> &
  Partial<Omit<AdminResourceConfig, 'slug'>>;

export function createDrizzleAdapter(options: {
  schema: Record<string, any>;
  config?: {
    resources?: AdminResourceOverride[];
  };
}): AdapterResult {

  // INTROSPECTION STEP:
  // Generate the default resource config from the Drizzle schema, then layer
  // explicit resource overrides on top. This keeps zero-config behavior intact
  // while allowing per-resource behavior such as lifecycle hooks.
  const autoConfig = introspectSchema(options.schema);
  const resourceOverrides = new Map(
    (options.config?.resources ?? []).map(resource => [resource.slug, resource])
  );
  const config: AdminConfig = {
    resources: autoConfig.resources.map(resource => {
      const override = resourceOverrides.get(resource.slug);
      if (!override) return resource;

      return {
        ...resource,
        ...override,
        table: override.table ?? resource.table,
        fields: override.fields ?? resource.fields,
        hooks: override.hooks ?? resource.hooks,
      };
    })
  };

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

    const hooks = resourceConfig.hooks;
    const validFields = new Set(resourceConfig.fields.map(field => field.name));

    const cleanWriteData = (input: any) => {
      const data = { ...(input ?? {}) };

      for (const key of Object.keys(data)) {
        if (!validFields.has(key) && !foreignKeyMap[key]) {
          delete data[key];
        }
      }

      return data;
    };

    const remapRelationshipFields = (input: any) => {
      const data = { ...input };

      for (const [fieldName, dbColumn] of Object.entries(foreignKeyMap)) {
        if (data[fieldName] !== undefined && fieldName !== dbColumn) {
          data[dbColumn] = data[fieldName];
          delete data[fieldName];
        }
      }

      return data;
    };

    const prepareChangeData = async (
      input: any,
      operation: 'create' | 'update',
      id?: string | number
    ) => {
      let data = cleanWriteData(input);

      if (hooks?.beforeChange) {
        const nextData = await hooks.beforeChange({ data, operation, id });

        if (nextData === null || typeof nextData !== 'object' || Array.isArray(nextData)) {
          throw new TypeError(
            `beforeChange hook for '${resourceSlug}' must return a record object`
          );
        }

        // Re-apply the write boundary after user code so hooks cannot
        // accidentally persist fields outside the resource schema.
        data = cleanWriteData(nextData);
      }

      return remapRelationshipFields(data);
    };

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
            const field = resourceConfig.fields.find(field => field.name === col);
            let filterValue: string | number | boolean = val;

            if (field?.type === 'boolean') {
              if (val === 'true') filterValue = true;
              if (val === 'false') filterValue = false;
            } else if (field?.type === 'number') {
              const numberValue = Number(val);
              if (!Number.isNaN(numberValue)) filterValue = numberValue;
            } else if (field?.type === 'select' && field.options) {
              const option = field.options.find(option => String(option.value) === val);
              if (option) filterValue = option.value;
            }

            if (field?.type !== 'select' && ['text', 'string', 'varchar'].includes(dType)) {
              where = like(column, `%${val}%`);
            } else {
              where = eq(column, filterValue);
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
        const data = await prepareChangeData(body, 'create');
        const res = await db.insert(table).values(data).returning();
        const record = res[0];
        const response = sanitizeData(record);

        if (record !== undefined && hooks?.afterChange) {
          await hooks.afterChange({
            record,
            operation: 'create'
          });
        }

        return response;
      },

      // UPDATE
      update: async ({ db, params, body }: { db: any, params: { id: any }, body: any }) => {
        const pkField = resourceConfig.fields.find(f => f.isId);
        const pkColumn = table[pkField?.name || 'id'];
        const id = pkField?.type === 'number' ? Number(params.id) : params.id;
        const data = await prepareChangeData(body, 'update', id);

        const res = await db.update(table)
          .set(data)
          .where(eq(pkColumn, id))
          .returning();

        const record = res[0];
        const response = sanitizeData(record);

        if (record !== undefined && hooks?.afterChange) {
          await hooks.afterChange({
            record,
            operation: 'update',
            id
          });
        }

        return response;
      },

      // DELETE
      delete: async ({ db, params }: { db: any, params: { id: any } }) => {
        const pkField = resourceConfig.fields.find(f => f.isId);
        const pkColumn = table[pkField?.name || 'id'];
        const id = pkField?.type === 'number' ? Number(params.id) : params.id;

        if (hooks?.beforeDelete) {
          const shouldDelete = await hooks.beforeDelete({ id });

          if (shouldDelete === false) {
            throw new Error(
              `Deletion cancelled by beforeDelete hook for '${resourceSlug}'`
            );
          }
        }

        const res = await db.delete(table)
          .where(eq(pkColumn, id))
          .returning();

        if (res[0] !== undefined && hooks?.afterDelete) {
          await hooks.afterDelete({ id });
        }

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