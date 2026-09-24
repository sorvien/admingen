import { describe, it, expect } from 'bun:test';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { introspectSchema } from '../src/introspect';

describe('AdminGen Schema Introspection', () => {
  it('should correctly introspect tables and map data types', () => {
    const teams = sqliteTable('teams', {
      id: integer('id').primaryKey({ autoIncrement: true }),
      name: text('name').notNull(),
    });

    const users = sqliteTable('users', {
      id: integer('id').primaryKey({ autoIncrement: true }),
      email: text('email').notNull(),
      name: text('name').notNull(),
      bio: text('bio'),
      teamId: integer('team_id').references(() => teams.id),
    });

    const usersRelations = relations(users, ({ one }) => ({
      team: one(teams, {
        fields: [users.teamId],
        references: [teams.id],
      }),
    }));

    const config = introspectSchema({ teams, users, usersRelations });

    expect(config.resources).toHaveLength(2);

    const userResource = config.resources.find(r => r.slug === 'users');
    expect(userResource).toBeDefined();

    const idField = userResource?.fields.find(f => f.name === 'id');
    expect(idField?.type).toBe('number');
    expect(idField?.isId).toBe(true);

    const emailField = userResource?.fields.find(f => f.name === 'email');
    expect(emailField?.type).toBe('text');

    const bioField = userResource?.fields.find(f => f.name === 'bio');
    expect(bioField?.type).toBe('textarea');

    const teamField = userResource?.fields.find(f => f.name === 'teamId');
    expect(teamField?.type).toBe('relationship');
    expect(teamField?.relationTo).toBe('teams');
  });
});
