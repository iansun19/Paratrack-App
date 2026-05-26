import { pgTable, text, timestamp, integer, jsonb, boolean, real } from "drizzle-orm/pg-core";

export const kids = pgTable("kids", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  birthDate: text("birth_date"),
  avatar: text("avatar"),
  colorCode: text("color_code").notNull().default("#C96A4B"),
  favorites: jsonb("favorites").$type<{ foods?: string[]; hobbies?: string[]; interests?: string[] }>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const milestones = pgTable("milestones", {
  id: text("id").primaryKey(),
  kidId: text("kid_id").notNull().references(() => kids.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title"),
  content: text("content"),
  mediaUrl: text("media_url"),
  date: text("date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supplies = pgTable("supplies", {
  id: text("id").primaryKey(),
  kidId: text("kid_id").references(() => kids.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  currentStock: integer("current_stock").notNull().default(0),
  lowThreshold: integer("low_threshold").notNull().default(5),
  dailyUsage: real("daily_usage").default(1),
  unitPrice: real("unit_price"),
  predictedRunOut: text("predicted_run_out"),
  lastRestocked: text("last_restocked"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  kidId: text("kid_id").references(() => kids.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),
  location: text("location"),
  reminderMinutes: integer("reminder_minutes").default(30),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const schoolEmails = pgTable("school_emails", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  rawContent: text("raw_content").notNull(),
  parsedSummary: text("parsed_summary"),
  extractedEvents: jsonb("extracted_events").$type<{ title: string; date: string; time?: string; type: string }[]>().default([]),
  extractedSupplies: jsonb("extracted_supplies").$type<string[]>().default([]),
  parsedAt: timestamp("parsed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insights = pgTable("insights", {
  id: text("id").primaryKey(),
  kidId: text("kid_id").references(() => kids.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  confidence: integer("confidence").default(80),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  dismissed: boolean("dismissed").default(false),
});

export const browserConnections = pgTable("browser_connections", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  slug: text("slug").notNull(),
  url: text("url").notNull(),
  platform: text("platform").notNull(),
  connected: integer("connected").notNull().default(1),
  prefs: text("prefs"),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
