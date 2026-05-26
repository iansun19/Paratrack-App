import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getEventsByUser, createEvent, deleteEvent } from "@/lib/db/queries/kids";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
  const result = requireAuth(request);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;
    const allEvents = await getEventsByUser(userId, from, to);
    return NextResponse.json({ events: allEvents });
  } catch { return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const result = requireAuth(request);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;
  try {
    const { title, description, type, startTime, endTime, location, kidId } = await request.json();
    const event = await createEvent({ id: nanoid(), userId, title, description: description || null, type: type || "school", startTime: new Date(startTime), endTime: endTime ? new Date(endTime) : null, location: location || null, kidId: kidId || null });
    return NextResponse.json({ event }, { status: 201 });
  } catch { return NextResponse.json({ error: "Failed to create event" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  const result = requireAuth(request);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await deleteEvent(id, userId);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed to delete event" }, { status: 500 }); }
}
