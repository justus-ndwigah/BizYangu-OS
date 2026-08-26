import { sql } from 'drizzle-orm';
import { boolean, index, jsonb, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

// Server-side session store. One row per logged-in session (browser or mobile).
export const sessionsTable = pgTable(
  'sessions',
  {
    sid: varchar('sid').primaryKey(),
    sess: jsonb('sess').notNull(),
    expire: timestamp('expire', { withTimezone: true }).notNull(),
  },
  (table) => [index('IDX_session_expire').on(table.expire)],
);

// Local application users. Authentication is email + bcrypt password hash —
// no external identity provider is required, so the app works fully offline.
export const usersTable = pgTable('users', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 150 }).notNull().unique(),

  // bcrypt hash — never the plaintext password.
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),

  // 'admin' can manage users & shop settings, view all reports and change prices.
  // 'cashier' can record sales and view stock/customers only.
  role: varchar('role', { length: 30 }).notNull().default('admin'),

  isActive: boolean('is_active').notNull().default(true),
  profileImageUrl: varchar('profile_image_url'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type UpsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;
export type PublicUser = Omit<User, 'passwordHash'>;
