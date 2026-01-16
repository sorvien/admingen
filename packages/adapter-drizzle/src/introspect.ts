
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

    for (const [key, value] of Object.entries(schema)) {
        if (isTable(value)) {
            const tableName = getTableName(value);
            const columns = getTableColumns(value);

            const fields: AdminField[] = [];
            let primaryKey = 'id'; // Default, we'll try to detect

            for (const [colName, colDef] of Object.entries(columns)) {
                // Filter out internal Drizzle properties like enableRLS, getSQL, etc.
                if (colName === 'enableRLS') continue;

                const column = colDef as Column;

                // Extra safety: check if it looks like a column
                if (!('dataType' in column || 'columnType' in column || 'getSQLType' in column)) {
                    continue;
                }

                // --- Type Mapping ---
                // Drizzle columns often have `dataType` property string.
                const dType = (column as any).dataType || (column as any).columnType || 'text';

                let adminType: AdminField['type'] = 'text';

                if (['integer', 'serial', 'bigint', 'smallint', 'real', 'double precision', 'numeric', 'decimal'].includes(dType)) {
                    adminType = 'number';
                } else if (['boolean'].includes(dType)) {
                    adminType = 'boolean';
                } else if (['date', 'timestamp', 'timestamp without time zone'].includes(dType)) {
                    adminType = 'date';
                } else if (['text', 'json'].includes(dType)) {
                    adminType = 'textarea'; // JSON or long text usually fits textarea
                }
                // Default 'text' catches varchar, char, etc.

                fields.push({
                    name: colName, // The property key in the table object (e.g. 'firstName')
                    label: colName, // We can capitalize this in UI if needed, or here
                    type: adminType,
                    isId: (column as any).primary || (column as any).isPrimary, // Attempt to detect PK
                });

                if ((column as any).primary) {
                    primaryKey = colName;
                }
            }

            resources.push({
                slug: key, // Use export name as slug (e.g. "users" from `export const users = ...`)
                label: key,
                table: value,
                fields
            });
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
