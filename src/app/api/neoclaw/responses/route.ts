import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getKidsByUser, createEvent, createMilestone, createSupply } from "@/lib/db/queries/kids";
import { nanoid } from "nanoid";

const NEOCLAW_BASE = (process.env.NEXT_PUBLIC_NEOCLAW_API_URL ?? "").trim();
const NEOCLAW_TOKEN = (process.env.NEXT_PUBLIC_NEOCLAW_API_KEY ?? "").trim();

// ── Tool definitions exposed to the AI ───────────────────────────────────────

const PARATRACK_TOOLS = [
  {
    type: "function",
    name: "create_calendar_event",
    description:
      "Create a new calendar event in Paratrack for a specific child or the whole family. Use this whenever the user mentions a date, appointment, activity, or deadline.",
    parameters: {
      type: "object",
      required: ["title", "startTime", "type"],
      properties: {
        title: { type: "string", description: "Event title" },
        startTime: { type: "string", description: "ISO 8601 datetime, e.g. 2025-05-29T10:00:00" },
        endTime: { type: "string", description: "ISO 8601 datetime (optional)" },
        type: {
          type: "string",
          enum: ["school", "doctor", "pickup", "dropoff", "birthday", "lesson", "sports", "other"],
        },
        kidId: { type: "string", description: "Paratrack kid ID — omit for whole-family events" },
        location: { type: "string", description: "Location or address (optional)" },
        description: { type: "string", description: "Extra notes (optional)" },
      },
    },
  },
  {
    type: "function",
    name: "add_health_note",
    description:
      "Save a health note to a specific child's profile. Use for medications, allergies, diagnoses, symptoms, vaccination records, or any health-related information.",
    parameters: {
      type: "object",
      required: ["kidId", "content"],
      properties: {
        kidId: { type: "string", description: "Paratrack kid ID" },
        content: { type: "string", description: "The health note text" },
        title: { type: "string", description: "Short title for the note" },
      },
    },
  },
  {
    type: "function",
    name: "create_supply",
    description:
      "Add a supply item to Paratrack's supply tracker. Use when the user mentions needing to buy or track a product.",
    parameters: {
      type: "object",
      required: ["name", "category"],
      properties: {
        name: { type: "string" },
        category: {
          type: "string",
          enum: ["diapers", "wipes", "formula", "medicine", "school", "snacks", "household", "other"],
        },
        kidId: { type: "string", description: "Kid ID if supply is for a specific child (optional)" },
        currentStock: { type: "number", description: "Starting quantity (default 0)" },
        dailyUsage: { type: "number", description: "Estimated daily usage (optional)" },
      },
    },
  },
];

// ── Execute tool calls made by the AI — direct DB, no localhost fetch ────────

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  if (name === "create_calendar_event") {
    try {
      const event = await createEvent({
        id: nanoid(),
        userId,
        kidId: (args.kidId as string) || null,
        title: args.title as string,
        type: (args.type as string) || "other",
        startTime: new Date(args.startTime as string),
        endTime: args.endTime ? new Date(args.endTime as string) : null,
        location: (args.location as string) || null,
        description: (args.description as string) || null,
      });
      return `✓ Calendar event created: "${args.title}" on ${args.startTime}. Event ID: ${event.id}`;
    } catch (e) {
      return `Failed to create event: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  if (name === "add_health_note") {
    try {
      const today = new Date().toISOString().split("T")[0];
      await createMilestone({
        id: nanoid(),
        userId,
        kidId: args.kidId as string,
        type: "health",
        title: (args.title as string) || "Health Note",
        content: args.content as string,
        date: today,
      });
      return `✓ Health note saved to child's profile: "${args.content}"`;
    } catch (e) {
      return `Failed to save health note: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  if (name === "create_supply") {
    try {
      const supply = await createSupply({
        id: nanoid(),
        userId,
        kidId: (args.kidId as string) || null,
        name: args.name as string,
        category: (args.category as string) || "other",
        currentStock: (args.currentStock as number) ?? 0,
        lowThreshold: 5,
        dailyUsage: (args.dailyUsage as number) ?? 1,
        predictedRunOut: null,
        lastRestocked: new Date().toISOString().split("T")[0],
      });
      return `✓ Supply added to tracker: "${args.name}" (${args.category}). ID: ${supply.id}`;
    } catch (e) {
      return `Failed to add supply: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return `Unknown tool: ${name}`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (!authResult.ok) return authResult.response;
  const { id: userId } = authResult.user;

  if (!NEOCLAW_BASE || !NEOCLAW_TOKEN) {
    return NextResponse.json(
      { error: "NeoClaw API not configured" },
      { status: 503 },
    );
  }

  const {
    messages,
    connectedServices = [],
  }: {
    messages: Array<{ role: string; content: string }>;
    connectedServices: string[];
  } = await request.json();

  // Fetch the user's kids to give the AI real names + IDs
  let kidsContext = "";
  try {
    const kids = await getKidsByUser(userId);
    if (kids.length > 0) {
      kidsContext =
        "\n\nChildren in this family:\n" +
        kids
          .map((k) => `- ${k.name} (id: ${k.id}, born: ${k.birthDate ?? "unknown"})`)
          .join("\n");
    }
  } catch {}

  // Build a grounded system prompt
  const connectedList =
    connectedServices.length > 0
      ? connectedServices.join(", ")
      : "none yet";

  const systemPrompt = `You are Paratrack AI — an intelligent family assistant embedded inside the Paratrack parenting app. You help parents manage their family's schedules, supplies, health records, and memories.

Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.

Connected external services the user has logged into: ${connectedList}.
${kidsContext}

Your capabilities:
1. BROWSER ACCESS — You can read and interact with any connected service (Gmail, Outlook, Google Calendar, iCloud Photos, Amazon, Instacart, Canvas) through the user's authenticated remote browser session. When the user asks you to check an email, find a message, or look something up in a connected service, do it.
2. CALENDAR — Use create_calendar_event to add events to Paratrack's family calendar.
3. HEALTH NOTES — Use add_health_note to save health-related information to a child's profile.
4. SUPPLIES — Use create_supply to add items to the supply tracker.

Key rules:
- Only attempt to access services the user has connected (listed above). If a service is not connected, tell the user to connect it first from the Integrations tab.
- When you find actionable information (an appointment date, a supply need, a health note) in an external service, proactively offer to save it to Paratrack — or just do it if the user's intent is clear.
- Be concise. Confirm every action you take with a short ✓ summary.
- Use the child's real name (from the list above) when referring to them, not "the child".`;

  // Convert message history to plain text for context in instructions
  // OpenClaw only accepts a plain string for `input` — history goes in instructions
  const historyText = messages.slice(0, -1).map(m =>
    `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`
  ).join("\n");

  const lastMessage = messages[messages.length - 1]?.content ?? "";

  const fullInstructions = historyText
    ? `${systemPrompt}\n\n--- Conversation so far ---\n${historyText}`
    : systemPrompt;

  // ── First OpenClaw call ───────────────────────────────────────────────────

  const requestBody = {
    model: "openclaw",
    tools: PARATRACK_TOOLS,
    instructions: fullInstructions,
    input: lastMessage,
    truncation: "auto",
  };

  let response: Response;
  try {
    response = await fetch(
      `${NEOCLAW_BASE.replace(/\/+$/, "")}/api/gw/v1/responses`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${NEOCLAW_TOKEN}`,
        },
        body: JSON.stringify(requestBody),
      },
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to reach OpenClaw: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }

  if (!response.ok) {
    const errText = await response.text();
    return NextResponse.json(
      { error: `OpenClaw error ${response.status}: ${errText}` },
      { status: response.status },
    );
  }

  let data = await response.json();

  // ── Tool call loop — execute tools and feed results back ──────────────────

  const toolResults: Array<{ call_id: string; output: string }> = [];
  let iterations = 0;

  while (iterations < 5) {
    iterations++;

    const toolCalls = (data.output ?? []).filter(
      (o: { type: string }) => o.type === "function_call",
    );

    if (toolCalls.length === 0) break;

    // Execute all tool calls
    for (const call of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.arguments ?? "{}");
      } catch {}

      const result = await executeTool(call.name, args, userId);

      toolResults.push({
        call_id: call.call_id ?? call.id ?? nanoid(),
        output: result,
      });
    }

    // Send tool results back — append them as context in instructions
    const toolSummary = toolResults.map(r => `Tool result: ${r.output}`).join("\n");
    const continueBody = {
      ...requestBody,
      instructions: `${fullInstructions}\n\n--- Tool results ---\n${toolSummary}`,
      input: lastMessage,
      previous_response_id: data.id,
    };

    response = await fetch(
      `${NEOCLAW_BASE.replace(/\/+$/, "")}/api/gw/v1/responses`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${NEOCLAW_TOKEN}`,
        },
        body: JSON.stringify(continueBody),
      },
    );

    if (!response.ok) break;
    data = await response.json();
  }

  // Extract final text response
  const text = (data.output ?? [])
    .flatMap((m: { content?: Array<{ type?: string; text?: string }> }) => m.content ?? [])
    .filter((c: { type?: string }) => c.type === "output_text")
    .map((c: { text?: string }) => c.text ?? "")
    .join("")
    .trim();

  return NextResponse.json({
    text: text || "(No response)",
    toolsExecuted: toolResults.length,
  });
}
