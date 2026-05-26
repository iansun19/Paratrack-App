import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ai } from "@eazo/sdk";

/**
 * POST /api/supplies/price-suggest
 * Body: { name: string, category: string }
 * Returns: { price: number | null, label: string }
 */
export async function POST(request: NextRequest) {
  const result = requireAuth(request);
  if (!result.ok) return result.response;

  const { name, category } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const response = await ai.chat({
      model: "deepseek.v3.1",
      messages: [
        {
          role: "system",
          content: `You are a retail pricing assistant. When asked about a product, you respond ONLY with a JSON object — no explanation, no markdown, no code fences. Format: {"price": <number>, "label": "<string>"}`,
        },
        {
          role: "user",
          content: `What is the approximate US retail cost per single unit of "${name}" (category: ${category})?

Rules:
- "price" = cost per single unit in USD as a plain number (e.g. per diaper, per wipe, per oz of formula)
- If sold in packs, divide pack price by pack size
- "label" = short human label like "$0.28 per diaper" or "$0.04 per wipe"
- Use 2024 Target/Amazon/Walmart average prices
- If unsure, make a reasonable estimate rather than returning null

Respond with only: {"price": 0.28, "label": "$0.28 per diaper"}`,
        },
      ],
      temperature: 0.1,
    });

    const rawText = (response.choices[0]?.message?.content ?? "").trim();
    if (!rawText) {
      return NextResponse.json({ price: null, label: "AI returned empty response" });
    }

    // Strip markdown fences if present
    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    // Extract first JSON object
    const match = cleaned.match(/\{[\s\S]*?\}/);
    if (!match) {
      return NextResponse.json({ price: null, label: `Could not parse: ${rawText.slice(0, 80)}` });
    }

    const parsed = JSON.parse(match[0]) as { price: number | null; label: string };
    return NextResponse.json({
      price: typeof parsed.price === "number" ? parsed.price : null,
      label: parsed.label ?? "Unknown",
      source: "ai",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[price-suggest]", msg);
    // Return the real error so the UI can show it
    return NextResponse.json({ price: null, label: `Error: ${msg}` });
  }
}
