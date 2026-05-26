import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getMilestonesByKid, createMilestone, deleteMilestone } from "@/lib/db/queries/kids";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
  const result = requireAuth(request);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;
  try {
    const kidId = new URL(request.url).searchParams.get("kidId");
    const typeFilter = new URL(request.url).searchParams.get("type");
    if (!kidId) return NextResponse.json({ error: "Missing kidId" }, { status: 400 });
    const allMilestones = await getMilestonesByKid(kidId, userId);
    const filtered = typeFilter
      ? allMilestones.filter(m => m.type === typeFilter)
      : allMilestones;
    return NextResponse.json({ milestones: filtered });
  } catch { return NextResponse.json({ error: "Failed to fetch milestones" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const result = requireAuth(request);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;
  try {
    const { kidId, type, title, content, mediaUrl, date } = await request.json();
    if (!kidId?.trim()) return NextResponse.json({ error: "kidId is required" }, { status: 400 });
    const milestone = await createMilestone({ id: nanoid(), kidId, userId, type: type || "achievement", title: title || null, content: content || null, mediaUrl: mediaUrl || null, date: date || new Date().toISOString().split("T")[0] });
    return NextResponse.json({ milestone }, { status: 201 });
  } catch { return NextResponse.json({ error: "Failed to create milestone" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  const result = requireAuth(request);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await deleteMilestone(id, userId);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed to delete milestone" }, { status: 500 }); }
}
