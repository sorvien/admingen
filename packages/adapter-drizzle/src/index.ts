import { eq } from 'drizzle-orm';
import type { Context } from 'elysia';
import type {
  AdminConfig,
  AdapterResult,
  AdminHandlers,
  AdminSchema,
  AdminField
} from '@blackwaves/admingen-types';
import { introspectSchema } from './introspect';

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
      findMany: async ({ db }: { db: any }) => {
        // Drizzle query builder needs the *property name* in the schema object (e.g. `db.query.users`)
        // introspection sets `slug` to this key.
        if (!db.query[resourceSlug]) {
          throw new Error(`Drizzle query not found for '${resourceSlug}'. Did you pass the schema to drizzle()?`);
        }
        return db.query[resourceSlug].findMany({
          with: Object.keys(withRelations).length > 0 ? withRelations : undefined
        });
      },

      // FIND ONE
      findOne: async ({ db, params }: { db: any, params: { id: any } }) => {
        const id = Number(params.id);
        const pkField = resourceConfig.fields.find(f => f.isId);
        // Fallback to 'id' if not detected, though introspection tries to find it.
        // We need the ACTUAL table column object for `eq()`.
        // `table` is the Drizzle table object.
        const pkColumn = table[pkField?.name || 'id'];

        if (!pkColumn) {
          throw new Error(`Primary key column not found for ${resourceSlug}`);
        }

        return db.query[resourceSlug].findFirst({
          where: eq(pkColumn, id),
          with: Object.keys(withRelations).length > 0 ? withRelations : undefined
        });
      },

      // CREATE
      create: async ({ db, body }: { db: any, body: any }) => {
        const data = { ...body };
        // Clean up data for insertion (map relations)
        for (const [fieldName, dbColumn] of Object.entries(foreignKeyMap)) {
          if (data[fieldName] !== undefined) {
            // For a relationship, we expect an ID or an object with ID
            // If we implement Relation Field nicely, it sends the ID.
            data[dbColumn] = data[fieldName];
            delete data[fieldName];
          }
        }

        // Remove fields that are not columns (like relationship fields that didn't match FKs)
        // ... (Skipping robust cleanup for now, reliance on Drizzle to ignore or error)

        const res = await db.insert(table).values(data).returning();
        return res[0];
      },

      // UPDATE
      update: async ({ db, params, body }: { db: any, params: { id: any }, body: any }) => {
        const id = Number(params.id);
        const data = { ...body };
        const pkField = resourceConfig.fields.find(f => f.isId);
        const pkColumn = table[pkField?.name || 'id'];

        for (const [fieldName, dbColumn] of Object.entries(foreignKeyMap)) {
          if (data[fieldName] !== undefined) {
            data[dbColumn] = data[fieldName];
            delete data[fieldName];
          }
        }

        const res = await db.update(table)
          .set(data)
          .where(eq(pkColumn, id))
          .returning();

        return res[0];
      },

      // DELETE
      delete: async ({ db, params }: { db: any, params: { id: any } }) => {
        const id = Number(params.id);
        const pkField = resourceConfig.fields.find(f => f.isId);
        const pkColumn = table[pkField?.name || 'id'];

        const res = await db.delete(table)
          .where(eq(pkColumn, id))
          .returning();

        return res[0];
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