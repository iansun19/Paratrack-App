import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { browserConnections } from "@/lib/db/schema/kids";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

const _NEOCLAW_BASE = process.env.NEOCLAW_API_URL ?? ""; // reserved for future server-side calls

/**
 * POST /api/browser-connections
 * Body: { action: "create" | "upsert" | "list" | "disconnect" | "update_prefs", ...fields }
 *
 * This is the single endpoint the client calls for all browser-connection CRUD.
 * It talks to both the NeoClaw backend (for browser session management) and our
 * own Postgres (for persisting connection state).
 */
export async function POST(request: NextRequest) {
  const result = requireAuth(request);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;

  const body = await request.json();
  const { action } = body;

  try {
    // ── Persist a confirmed connection to Postgres ───────────────────
    if (action === "upsert") {
      const { slug, url, platform, prefs } = body;
      // Try to find existing row for this user+slug
      const existing = await db
        .select()
        .from(browserConnections)
        .where(and(eq(browserConnections.userId, userId), eq(browserConnections.slug, slug)));

      let row;
      if (existing.length > 0) {
        const updated = await db
          .update(browserConnections)
          .set({ url, platform, connected: 1, prefs: prefs ?? existing[0].prefs, updatedAt: new Date() })
          .where(eq(browserConnections.id, existing[0].id))
          .returning();
        row = updated[0];
      } else {
        const inserted = await db
          .insert(browserConnections)
          .values({ id: nanoid(), userId, slug, url, platform, connected: 1, prefs: prefs ?? null })
          .returning();
        row = inserted[0];
      }
      return NextResponse.json({ connection: row });
    }

    // ── Update preferences for a connection ─────────────────────────
    if (action === "update_prefs") {
      const { slug, prefs } = body;
      const updated = await db
        .update(browserConnections)
        .set({ prefs, updatedAt: new Date() })
        .where(and(eq(browserConnections.userId, userId), eq(browserConnections.slug, slug)))
        .returning();
      return NextResponse.json({ connection: updated[0] ?? null });
    }

    // ── Disconnect a service ─────────────────────────────────────────
    if (action === "disconnect") {
      const { slug } = body;
      await db
        .update(browserConnections)
        .set({ connected: 0, updatedAt: new Date() })
        .where(and(eq(browserConnections.userId, userId), eq(browserConnections.slug, slug)));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[browser-connections]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * GET /api/browser-connections
 * Returns all connected services for the current user.
 */
export async function GET(request: NextRequest) {
  const result = requireAuth(request);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;
  try {
    const rows = await db
      .select()
      .from(browserConnections)
      .where(eq(browserConnections.userId, userId));
    return NextResponse.json({ connections: rows });
  } catch {
    return NextResponse.json({ error: "Failed to load connections" }, { status: 500 });
  }
}
