import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ai } from "@eazo/sdk";
import { createSchoolEmail, updateSchoolEmail, getSchoolEmails, createEvent, createSupply, createMilestone } from "@/lib/db/queries/kids";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
  const result = requireAuth(request);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;
  try {
    const emails = await getSchoolEmails(userId);
    return NextResponse.json({ emails });
  } catch { return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const result = requireAuth(request);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;

  try {
    const { content, kidId } = await request.json();
    if (!content?.trim()) return NextResponse.json({ error: "Email content is required" }, { status: 400 });

    const emailRecord = await createSchoolEmail({ id: nanoid(), userId, rawContent: content });
    const today = new Date().toISOString().split("T")[0];

    const systemPrompt = `You are a helpful assistant that extracts structured information from school newsletters and family emails.

Extract the following from the email:
- **events**: array of { "title": string, "date": "YYYY-MM-DD", "time": "HH:MM" (optional), "type": "school" | "dropoff" | "pickup" | "birthday" | "lesson" | "doctor" | "other" }
- **supplies**: array of supply item strings mentioned (diapers, wipes, snacks, school materials, etc.)
- **health_notes**: array of { "note": string, "person_name": string | null } — health-related mentions (medications, allergies, doctor visits, symptoms, checkups). Set person_name to the child's first name if the note is clearly about a specific child, otherwise null.
- **summary**: a 2-3 sentence summary of the email
- **important_notes**: array of other actionable items that don't fit above

Today is ${today}.

Respond with valid JSON matching this exact structure:
{
  "summary": "...",
  "events": [{"title": "...", "date": "YYYY-MM-DD", "time": "HH:MM", "type": "school"}],
  "supplies": ["..."],
  "health_notes": [{"note": "...", "person_name": "Ava"}],
  "important_notes": ["..."]
}`;

    const aiResponse = await ai.chat({
      model: "deepseek.v3.1", // v3.1 is a pure completion model, not a reasoning model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Email content:\n\n${content}` },
      ],
      temperature: 0.2,
    });

    const rawText = aiResponse.choices[0]?.message?.content ?? "";
    if (!rawText) throw new Error("AI returned empty response");

    // Extract JSON from markdown code blocks or raw text
    let parsed;
    try {
      // Try direct parse first
      parsed = JSON.parse(rawText);
    } catch {
      // Extract from ```json ... ``` or ``` ... ``` blocks
      const jsonMatch = rawText.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        // Fallback: extract first {...} block
        const firstBrace = rawText.indexOf("{");
        const lastBrace = rawText.lastIndexOf("}");
        if (firstBrace >= 0 && lastBrace > firstBrace) {
          parsed = JSON.parse(rawText.slice(firstBrace, lastBrace + 1));
        } else {
          throw new Error("No valid JSON found in AI response");
        }
      }
    }

    const updatedEmail = await updateSchoolEmail(emailRecord.id, userId, {
      parsedSummary: parsed.summary,
      extractedEvents: parsed.events ?? [],
      extractedSupplies: parsed.supplies ?? [],
      parsedAt: new Date(),
    });

    // Auto-import events into the calendar
    let createdEventsCount = 0;
    if (Array.isArray(parsed.events)) {
      for (const ev of parsed.events) {
        if (ev.date) {
          try {
            const startTime = ev.time
              ? new Date(`${ev.date}T${ev.time}:00`)
              : new Date(`${ev.date}T08:00:00`);
            await createEvent({
              id: nanoid(),
              userId,
              kidId: kidId ?? null,
              title: ev.title ?? "Event from email",
              type: ev.type ?? "school",
              startTime,
              description: `Auto-imported from school email: ${emailRecord.id}`,
            });
            createdEventsCount++;
          } catch {}
        }
      }
    }

    // Auto-import supply mentions into the Supply Tracker
    let createdSuppliesCount = 0;
    if (Array.isArray(parsed.supplies)) {
      for (const supplyName of parsed.supplies) {
        if (typeof supplyName === "string" && supplyName.trim()) {
          try {
            await createSupply({
              id: nanoid(),
              userId,
              kidId: kidId ?? null,
              name: supplyName.trim(),
              category: "school",
              currentStock: 0,
              lowThreshold: 5,
              dailyUsage: 1,
              predictedRunOut: null,
              lastRestocked: null,
            });
            createdSuppliesCount++;
          } catch {}
        }
      }
    }

    // Auto-import health notes as milestones — matched to kids by name
    let createdHealthCount = 0;
    if (Array.isArray(parsed.health_notes)) {
      // Fetch all kids for this user so we can match by name
      const { getKidsByUser } = await import("@/lib/db/queries/kids");
      const allKids = await getKidsByUser(userId);

      for (const item of parsed.health_notes) {
        // Support both old string format and new { note, person_name } format
        const noteText = typeof item === "string" ? item : item?.note;
        const personName: string | null = typeof item === "string" ? null : (item?.person_name ?? null);
        if (!noteText?.trim()) continue;

        // Try to match person_name to a kid — case-insensitive first-name match
        let targetKidId: string | null = kidId ?? null;
        if (personName) {
          const matched = allKids.find(k =>
            k.name.split(" ")[0].toLowerCase() === personName.toLowerCase()
          );
          if (matched) targetKidId = matched.id;
        }

        if (targetKidId) {
          try {
            await createMilestone({
              id: nanoid(),
              userId,
              kidId: targetKidId,
              type: "health",
              title: personName ? `Health Note — ${personName}` : "Health Note",
              content: noteText.trim(),
              date: today,
            });
            createdHealthCount++;
          } catch {}
        }
      }
    }

    return NextResponse.json({
      email: updatedEmail,
      summary: parsed.summary,
      events: parsed.events || [],
      supplies: parsed.supplies || [],
      healthNotes: (parsed.health_notes || []).map((h: unknown) =>
        typeof h === "string" ? { note: h, person_name: null } : h
      ),
      importantNotes: parsed.important_notes || [],
      createdEventsCount,
      createdSuppliesCount,
      createdHealthCount,
    });
  } catch (error) {
    console.error("[Email parser error]", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to parse email"
    }, { status: 500 });
  }
}
