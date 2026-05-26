import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getKidById, updateKid, deleteKid } from "@/lib/db/queries/kids";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = requireAuth(request);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;
  const { id } = await params;
  try {
    const body = await request.json();
    const allowed = ["name", "birthDate", "colorCode", "favorites", "avatar"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }
    const kid = await updateKid(id, userId, updates);
    if (!kid) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ kid });
  } catch {
    return NextResponse.json({ error: "Failed to update kid" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = requireAuth(request);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;
  const { id } = await params;
  try {
    const existing = await getKidById(id, userId);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await deleteKid(id, userId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete kid" }, { status: 500 });
  }
}
