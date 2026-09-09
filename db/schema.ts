import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
export const quotes = sqliteTable("quote_requests", {
 id:text("id").primaryKey(), reference:text("reference").notNull(), payload:text("payload").notNull(),
 name:text("name").notNull(),email:text("email").notNull(),vehicle:text("vehicle").notNull(),
 status:text("status").notNull().default("new"),notes:text("notes").notNull().default(""),
 createdAt:integer("created_at").notNull(),updatedAt:integer("updated_at").notNull(),version:integer("version").notNull().default(0),
},t=>[uniqueIndex("quotes_reference_unique").on(t.reference),index("quotes_created_idx").on(t.createdAt),index("quotes_status_created_idx").on(t.status,t.createdAt)]);
export const quoteThrottle = sqliteTable("quote_throttle", {id:text("id").primaryKey(),hits:integer("hits").notNull(),token:text("token").notNull(),expiresAt:integer("expires_at").notNull()},t=>[index("quote_throttle_expiry_idx").on(t.expiresAt)]);
export const siteSettings = sqliteTable("site_settings", {id:text("id").primaryKey(),value:text("value").notNull()});
