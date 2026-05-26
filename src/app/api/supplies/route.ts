import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSuppliesByUser, createSupply, updateSupply, deleteSupply } from "@/lib/db/queries/kids";
import { nanoid } from "nanoid";

/** Compute ISO date when stock hits zero given dailyUsage */
function computeRunOut(currentStock: number, dailyUsage: number): string | null {
  if (!dailyUsage || dailyUsage <= 0) return null;
  const daysLeft = currentStock / dailyUsage;
  const d = new Date();
  d.setDate(d.getDate() + Math.floor(daysLeft));
  return d.toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  const result = requireAuth(request);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;
  try {
    const allSupplies = await getSuppliesByUser(userId);
    return NextResponse.json({ supplies: allSupplies });
  } catch { return NextResponse.json({ error: "Failed to fetch supplies" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const result = requireAuth(request);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;
  try {
    const { name, category, currentStock, lowThreshold, kidId, dailyUsage } = await request.json();
    const usage = Number(dailyUsage) || 1;
    const stock = currentStock ?? 10;
    const supply = await createSupply({
      id: nanoid(),
      userId,
      kidId: kidId || null,
      name,
      category: category || "other",
      currentStock: stock,
      lowThreshold: lowThreshold ?? 5,
      dailyUsage: usage,
      predictedRunOut: computeRunOut(stock, usage),
      lastRestocked: new Date().toISOString().split("T")[0],
    });
    return NextResponse.json({ supply }, { status: 201 });
  } catch { return NextResponse.json({ error: "Failed to create supply" }, { status: 500 }); }
}

export async function PATCH(request: NextRequest) {
  const result = requireAuth(request);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;
  try {
    const { id, dailyUsage, currentStock, unitPrice, ...rest } = await request.json();
    const usage = dailyUsage !== undefined ? Number(dailyUsage) : undefined;
    const stock = currentStock !== undefined ? Number(currentStock) : undefined;
    const price = unitPrice !== undefined ? Number(unitPrice) : undefined;
    const updates: Record<string, unknown> = { ...rest };
    if (usage !== undefined) updates.dailyUsage = usage;
    if (stock !== undefined) updates.currentStock = stock;
    if (price !== undefined) updates.unitPrice = price;
    // Recompute run-out whenever stock or usage changes
    if ((stock !== undefined || usage !== undefined)) {
      const existing = (await getSuppliesByUser(userId)).find(s => s.id === id);
      const finalStock = stock ?? existing?.currentStock ?? 0;
      const finalUsage = usage ?? existing?.dailyUsage ?? 1;
      updates.predictedRunOut = computeRunOut(finalStock, finalUsage as number);
    }
    const supply = await updateSupply(id, userId, updates);
    if (!supply) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ supply });
  } catch { return NextResponse.json({ error: "Failed to update supply" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  const result = requireAuth(request);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await deleteSupply(id, userId);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed to delete supply" }, { status: 500 }); }
}
