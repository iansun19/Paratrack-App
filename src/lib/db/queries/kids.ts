import { db } from "@/lib/db/client";
import { kids, milestones, supplies, events, schoolEmails } from "@/lib/db/schema/kids";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

export async function getKidsByUser(userId: string) {
  return db.select().from(kids).where(eq(kids.userId, userId)).orderBy(asc(kids.createdAt));
}
export async function getKidById(id: string, userId: string) {
  const rows = await db.select().from(kids).where(and(eq(kids.id, id), eq(kids.userId, userId)));
  return rows[0] ?? null;
}
export async function createKid(data: typeof kids.$inferInsert) {
  const rows = await db.insert(kids).values(data).returning();
  return rows[0];
}
export async function updateKid(id: string, userId: string, data: Partial<typeof kids.$inferInsert>) {
  const rows = await db.update(kids).set({ ...data, updatedAt: new Date() }).where(and(eq(kids.id, id), eq(kids.userId, userId))).returning();
  return rows[0] ?? null;
}
export async function deleteKid(id: string, userId: string) {
  await db.delete(kids).where(and(eq(kids.id, id), eq(kids.userId, userId)));
}
export async function getMilestonesByKid(kidId: string, userId: string) {
  return db.select().from(milestones).where(and(eq(milestones.kidId, kidId), eq(milestones.userId, userId))).orderBy(desc(milestones.date));
}
export async function createMilestone(data: typeof milestones.$inferInsert) {
  const rows = await db.insert(milestones).values(data).returning();
  return rows[0];
}
export async function deleteMilestone(id: string, userId: string) {
  await db.delete(milestones).where(and(eq(milestones.id, id), eq(milestones.userId, userId)));
}
export async function getSuppliesByUser(userId: string) {
  return db.select().from(supplies).where(eq(supplies.userId, userId)).orderBy(asc(supplies.name));
}
export async function createSupply(data: typeof supplies.$inferInsert) {
  const rows = await db.insert(supplies).values(data).returning();
  return rows[0];
}
export async function updateSupply(id: string, userId: string, data: Partial<typeof supplies.$inferInsert>) {
  const rows = await db.update(supplies).set({ ...data, updatedAt: new Date() }).where(and(eq(supplies.id, id), eq(supplies.userId, userId))).returning();
  return rows[0] ?? null;
}
export async function deleteSupply(id: string, userId: string) {
  await db.delete(supplies).where(and(eq(supplies.id, id), eq(supplies.userId, userId)));
}
export async function getEventsByUser(userId: string, from?: Date, to?: Date) {
  const conditions = [eq(events.userId, userId)];
  if (from) conditions.push(gte(events.startTime, from));
  if (to) conditions.push(lte(events.startTime, to));
  return db.select().from(events).where(and(...conditions)).orderBy(asc(events.startTime));
}
export async function createEvent(data: typeof events.$inferInsert) {
  const rows = await db.insert(events).values(data).returning();
  return rows[0];
}
export async function deleteEvent(id: string, userId: string) {
  await db.delete(events).where(and(eq(events.id, id), eq(events.userId, userId)));
}
export async function getSchoolEmails(userId: string) {
  return db.select().from(schoolEmails).where(eq(schoolEmails.userId, userId)).orderBy(desc(schoolEmails.createdAt));
}
export async function createSchoolEmail(data: typeof schoolEmails.$inferInsert) {
  const rows = await db.insert(schoolEmails).values(data).returning();
  return rows[0];
}
export async function updateSchoolEmail(id: string, userId: string, data: Partial<typeof schoolEmails.$inferInsert>) {
  const rows = await db.update(schoolEmails).set(data).where(and(eq(schoolEmails.id, id), eq(schoolEmails.userId, userId))).returning();
  return rows[0] ?? null;
}
