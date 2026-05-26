import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getKidsByUser, createKid } from "@/lib/db/queries/kids";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
  const result = requireAuth(request);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;
  try {
    const kids = await getKidsByUser(userId);
    return NextResponse.json({ kids });
  } catch { return NextResponse.json({ error: "Failed to fetch kids" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const result = requireAuth(request);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;
  try {
    const { name, birthDate, colorCode, favorites } = await request.json();
    const kid = await createKid({ id: nanoid(), userId, name, birthDate: birthDate || null, colorCode: colorCode || "#C96A4B", favorites: favorites || {} });
    return NextResponse.json({ kid }, { status: 201 });
  } catch { return NextResponse.json({ error: "Failed to create kid" }, { status: 500 }); }
}
