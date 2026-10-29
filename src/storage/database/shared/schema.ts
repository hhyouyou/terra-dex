import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  index,
  serial,
  doublePrecision,
} from "drizzle-orm/pg-core";

// 系统表，禁止删除
export const healthCheck = pgTable("health_check", {
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 图鉴条目表：记录用户拍照识别的动植物
export const entries = pgTable(
  "entries",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    category: varchar("category", { length: 20 }).notNull(), // animal | plant
    name: varchar("name", { length: 128 }).notNull(),
    scientific_name: varchar("scientific_name", { length: 255 }),
    description: text("description"),
    wiki_url: text("wiki_url"),
    image_key: varchar("image_key", { length: 255 }).notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    location_name: varchar("location_name", { length: 255 }),
    discovered_at: timestamp("discovered_at", { withTimezone: true }).defaultNow().notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("entries_category_idx").on(table.category),
    index("entries_discovered_at_idx").on(table.discovered_at),
  ],
);

export type Entry = typeof entries.$inferSelect;
