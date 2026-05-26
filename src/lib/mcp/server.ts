import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getKidsByUser, createKid, getEventsByUser, createEvent, getSuppliesByUser, getMilestonesByKid } from "@/lib/db/queries/kids";
import { nanoid } from "nanoid";

export function buildMcpServer(userId: string): McpServer {
  const server = new McpServer({ name: "paratrack-mcp", version: "1.0.0" });

  server.tool("list_children", "List all children in the family.", {}, async () => {
    const kids = await getKidsByUser(userId);
    return { content: [{ type: "text" as const, text: JSON.stringify({ children: kids }, null, 2) }] };
  });

  server.tool("add_child", "Add a new child profile.", {
    name: z.string().describe("Child's first name"),
    birth_date: z.string().optional().describe("Birth date YYYY-MM-DD"),
    color_code: z.string().optional(),
  }, async ({ name, birth_date, color_code }) => {
    const kid = await createKid({ id: nanoid(), userId, name, birthDate: birth_date || null, colorCode: color_code || "#C96A4B", favorites: {} });
    return { content: [{ type: "text" as const, text: `Created profile for ${name} (ID: ${kid.id})` }] };
  });

  server.tool("get_today_events", "Get all events scheduled for today.", {}, async () => {
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const events = await getEventsByUser(userId, today, tomorrow);
    return { content: [{ type: "text" as const, text: events.length === 0 ? "No events today." : JSON.stringify({ events }, null, 2) }] };
  });

  server.tool("add_event", "Add an event to the family calendar.", {
    title: z.string(),
    event_type: z.enum(["school", "sports", "doctor", "birthday", "lesson", "pickup", "dropoff", "other"]),
    start_time: z.string().describe("ISO 8601 datetime"),
    kid_id: z.string().optional(),
    location: z.string().optional(),
  }, async ({ title, event_type, start_time, kid_id, location }) => {
    await createEvent({ id: nanoid(), userId, title, type: event_type, startTime: new Date(start_time), kidId: kid_id || null, location: location || null });
    return { content: [{ type: "text" as const, text: `Event "${title}" added to family calendar on ${start_time}` }] };
  });

  server.tool("check_low_supplies", "Check which supplies are running low.", {}, async () => {
    const supplies = await getSuppliesByUser(userId);
    const low = supplies.filter(s => s.currentStock <= s.lowThreshold);
    return { content: [{ type: "text" as const, text: low.length === 0 ? "All supplies stocked." : `Low: ${low.map(s => `${s.name} (${s.currentStock} left)`).join(", ")}` }] };
  });

  server.tool("get_child_memories", "Get memories and milestones for a child.", {
    kid_id: z.string(),
  }, async ({ kid_id }) => {
    const memories = await getMilestonesByKid(kid_id, userId);
    return { content: [{ type: "text" as const, text: memories.length === 0 ? "No memories yet." : JSON.stringify({ memories: memories.slice(0, 20) }, null, 2) }] };
  });

  return server;
}
