
import {
    getTableName,
    isTable,
    type Column
} from 'drizzle-orm';
import type {
    AdminConfig,
    AdminResourceConfig,
    AdminField
} from '@blackwaves/admingen-types';

export function introspectSchema(schema: Record<string, any>): AdminConfig {
    const resources: AdminResourceConfig[] = [];
    const tableToResourceMap = new Map<any, AdminResourceConfig>();
    // NEW: Map to lookup field name by column instance
    const columnToFieldName = new Map<any, string>();

    // 1. First Pass: Tables
    for (const [key, value] of Object.entries(schema)) {
        if (isTable(value)) {
            const tableName = getTableName(value);
            const columns = getTableColumns(value);

            const fields: AdminField[] = [];
            let primaryKey = 'id';

            for (const [colName, colDef] of Object.entries(columns)) {
                if (colName === 'enableRLS') continue;
                const column = colDef as Column;

                // STORE MAPPING: Column Instance -> 'authorId'
                columnToFieldName.set(column, colName);

                // Basic Type Mapping
                const dType = (column as any).dataType || (column as any).columnType || 'text';
                let adminType: AdminField['type'] = 'text';

                if (['integer', 'serial', 'bigint', 'smallint', 'real', 'double precision', 'numeric', 'decimal'].includes(dType)) {
                    adminType = 'number';
                } else if (['boolean'].includes(dType)) {
                    adminType = 'boolean';
                } else if (['date', 'timestamp', 'timestamp without time zone'].includes(dType)) {
                    adminType = 'date';
                } else if (['text', 'json'].includes(dType)) {
                    adminType = 'textarea';
                }

                fields.push({
                    name: colName,
                    label: colName,
                    type: adminType,
                    isId: (column as any).primary || (column as any).isPrimary,
                });

                if ((column as any).primary) {
                    primaryKey = colName;
                }
            }

            const resource: AdminResourceConfig = {
                slug: key,
                label: key,
                table: value,
                fields
            };
            resources.push(resource);
            tableToResourceMap.set(value, resource);
        }
    }

    // 2. Second Pass: Relations
    for (const [key, value] of Object.entries(schema)) {
        if (!isTable(value) && (value as any).config && typeof (value as any).config === 'function') {
            try {
                const sourceTable = (value as any).table;

                // Helper to create a mock relation object that satisfies Drizzle's expectations
                const createMockRelation = (type: 'one' | 'many', table: any, config: any) => {
                    const rel = { type, sourceTable, referencedTable: table, ...config };
                    // Mock Drizzle internal method to avoid crash during iteration
                    (rel as any).withFieldName = (fieldName: string) => {
                        (rel as any).fieldName = fieldName;
                        return rel;
                    };
                    return rel;
                };

                const relationsConfig = (value as any).config({
                    one: (table: any, config: any) => createMockRelation('one', table, config),
                    many: (table: any, config: any) => createMockRelation('many', table, config),
                });

                for (const [relName, relConfig] of Object.entries(relationsConfig)) {
                    const conf = relConfig as any;
                    // We only care about "owning" side of relations for now (fields that hold the FK)
                    // Usually 'one' type with 'fields' array.
                    if (conf.type === 'one' && conf.fields && conf.fields.length > 0) {
                        const foreignKeyColumn = conf.fields[0];
                        // USE MAP: Get 'authorId' from the column instance
                        const fieldName = columnToFieldName.get(foreignKeyColumn);

                        console.log(`Processing Relation ${relName}: Found FK Column? ${!!fieldName} (${fieldName})`);

                        // Find the resource and field
                        const resource = tableToResourceMap.get(sourceTable);
                        if (resource && fieldName) {
                            const field = resource.fields.find(f => f.name === fieldName);
                            if (field) {
                                console.log(`-> Updating field ${fieldName} to use relationship`);
                                field.type = 'relationship';
                                // Try to find the referenced resource slug
                                const refResource = tableToResourceMap.get(conf.referencedTable);
                                if (refResource) {
                                    field.relationTo = refResource.slug;
                                } else {
                                    // Fallback to table name
                                    field.relationTo = getTableName(conf.referencedTable);
                                }
                                console.log(`   > Set relationTo: ${field.relationTo}`);
                                field.foreignKey = fieldName; // Store property name
                                field.relationName = relName; // Store the relation name (e.g. 'author') for Drizzle queries
                            } else {
                                console.warn(`-> Field ${fieldName} not found in resource ${resource.slug}`);
                            }
                        } else {
                            console.warn(`-> Resource or FieldName not found for sourceTable of ${relName}`);
                        }
                    }
                }
            } catch (e) {
                console.warn(`Failed to process relations for ${key}:`, e);
            }
        }
    }

    return { resources };
}

// Helper to access internal columns map
function getTableColumns(table: any) {
    // Drizzle tables usually have a Symbol or property for columns
    // The standard way is `getTableColumns` from drizzle-orm but that requires import.
    // Let's use the property that `drizzle-orm` uses internally if we can,
    // or just iterate the keys if they are exposed.
    // 
    // Actually, `table` IS often the object with keys as columns in Drizzle usage,
    // BUT only for the query builder syntax. `sqliteTable` returns an object where keys are columns.
    // Let's verify this assumption.
    return table;
}
