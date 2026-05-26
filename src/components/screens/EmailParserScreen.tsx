"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RotateCcw, Calendar, ShoppingCart, CheckCircle, Heart, AlertCircle } from "lucide-react";
import Link from "next/link";
import { request } from "@/lib/api/request";
import { memory } from "@eazo/sdk";
import { TourOverlay } from "@/components/tour/TourOverlay";
import { GuideOverlay, GuideStep } from "@/components/tour/GuideOverlay";

const AUTOFILL_GUIDE: GuideStep[] = [
  { icon: "✉️", title: "Auto-Fill Events", description: "Paste any school email, newsletter, or notice here. The AI reads it and automatically creates calendar events, adds supplies, and saves health notes — all in one tap." },
  { icon: "📋", title: "Paste Your Email", description: "Paste the full text into the big text area. Try the 'Load Example' button to see a sample school newsletter and what gets extracted from it." },
  { icon: "🤖", title: "Extract & Auto-Fill", description: "Tap 'Parse with AI'. In a few seconds it shows extracted events, supplies, and health notes — each one saved automatically to the right section of the app." },
  { icon: "📍", title: "Review the Results", description: "After parsing, you'll see cards for each item found — events link to Calendar, supplies to Tracker, and health notes to the child's profile." },
];

const DEMO_EMAIL = `Subject: Weekly Kindergarten Update & Supply Drive
From: Meadow View Academy <office@meadowview.edu>

Hi parents! Your child's class will be visiting the Botanical Garden next Wednesday at 10:00 AM. Please pack a zero-waste cold lunch.

We're also running low on size 4 pull-ups for the toddlers. If you can donate a pack by Monday morning, that would be wonderful!

Reminder: Flu shot clinic is available for all students on Friday. Please check with the nurse if your child has any allergies to the vaccine.

Also: Parent-teacher conferences are scheduled for November 15th at 3:00 PM.`;

type HealthNote = { note: string; person_name: string | null };
type ParsedResult = {
  summary: string;
  events: { title: string; date: string; time?: string; type: string }[];
  supplies: string[];
  healthNotes: HealthNote[];
  importantNotes: string[];
  createdEventsCount: number;
  createdSuppliesCount: number;
  createdHealthCount: number;
};

export function EmailParserScreen() {
  const [emailContent, setEmailContent] = useState("");
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleParse() {
    if (!emailContent.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await request("/api/email-parser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: emailContent }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to parse email"); return; }
      memory.reportAction({
        content: `User parsed school email, extracted ${data.createdEventsCount} events, ${data.createdSuppliesCount} supplies, ${data.createdHealthCount} health notes`,
        event_type: "create",
        page: "email-parser",
        metadata: { type: "parse_email" },
      }).catch(() => {});
      setResult(data);
    } catch {
      setError("Failed to connect to the AI parser. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-svh bg-[#FDFBF7] px-5 py-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

        {/* Header */}
        <div className="space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#57534E]">THE INTELLIGENCE ENGINE</span>
          <div className="h-px bg-[#EDE9DF]" /><div className="h-px bg-[#EDE9DF] mt-0.5" />
          <h1 className="pt-3 text-3xl font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>
            Auto-Fill Events
          </h1>          <p className="text-sm text-[#57534E]">
            Paste a school newsletter or family email. The AI extracts events into your calendar, supplies into the tracker, and health notes into kid profiles — automatically.
          </p>
        </div>

        {/* Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E]">Email Content</label>
            <button
              onClick={() => setEmailContent(DEMO_EMAIL)}
              className="font-mono text-[10px] uppercase text-[#C96A4B] hover:underline"
            >
              Load Example
            </button>
          </div>
          <textarea
              data-tour="autofill-input"
            value={emailContent}
            onChange={e => setEmailContent(e.target.value)}
            placeholder="Paste the email or newsletter text here…"
            rows={8}
            className="w-full text-sm border border-[#EDE9DF] rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#C96A4B]/30 resize-none text-[#1C1A17] placeholder:text-[#C8C2BA] leading-relaxed"
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleParse}
              data-tour="autofill-run"
            disabled={loading || !emailContent.trim()}
            className="w-full py-3 bg-[#C96A4B] text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                  <RotateCcw size={15} />
                </motion.div>
                Parsing email…
              </>
            ) : (
              <><Sparkles size={15} /> Parse with AI</>
            )}
          </motion.button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {/* Auto-import summary */}
              {(result.createdEventsCount > 0 || result.createdSuppliesCount > 0 || result.createdHealthCount > 0) && (
                <div className="rounded-xl bg-[#508D76]/8 border border-[#508D76]/20 p-4 space-y-1.5">
                  <p className="font-mono text-[10px] uppercase font-bold text-[#508D76] tracking-wider">Auto-imported</p>
                  {result.createdEventsCount > 0 && (
                    <p className="text-xs text-[#1C1A17]">
                      📅 <strong>{result.createdEventsCount}</strong> event{result.createdEventsCount !== 1 ? "s" : ""} added to Family Calendar
                    </p>
                  )}
                  {result.createdSuppliesCount > 0 && (
                    <p className="text-xs text-[#1C1A17]">
                      🛒 <strong>{result.createdSuppliesCount}</strong> supply item{result.createdSuppliesCount !== 1 ? "s" : ""} added to Supply Tracker
                    </p>
                  )}
                  {result.createdHealthCount > 0 && (
                    <p className="text-xs text-[#1C1A17]">
                      ❤️ <strong>{result.createdHealthCount}</strong> health note{result.createdHealthCount !== 1 ? "s" : ""} added to Kid Profile
                    </p>
                  )}
                </div>
              )}

              {/* Summary */}
              {result.summary && (
                <div className="rounded-xl p-5 bg-white border border-[#EDE9DF] shadow-sm">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] mb-2">Summary</p>
                  <p className="text-sm italic text-[#1C1A17] leading-relaxed" style={{ fontFamily: "var(--font-heading)" }}>
                    {result.summary}
                  </p>
                </div>
              )}

              {/* Events */}
              {result.events.map((ev, i) => (
                <Link key={`ev-${i}`} href="/calendar">
                  <motion.div
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }} whileTap={{ scale: 0.98 }}
                    className="rounded-lg p-4 bg-white border border-[#EDE9DF] shadow-sm flex justify-between items-start hover:shadow transition cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#8A7BA7]" />
                        <span className="font-mono text-[9px] uppercase tracking-wider text-[#8A7BA7] font-bold">Calendar Event</span>
                      </div>
                      <h4 className="font-bold text-sm text-[#1C1A17]">{ev.title}</h4>
                      <p className="text-xs text-[#57534E]">{ev.date}{ev.time ? ` · ${ev.time}` : ""} · {ev.type}</p>
                    </div>
                    <Calendar size={16} className="text-[#A8A29E] mt-0.5 shrink-0" />
                  </motion.div>
                </Link>
              ))}

              {/* Supplies */}
              {result.supplies.map((supply, i) => (
                <Link key={`sup-${i}`} href="/supplies">
                  <motion.div
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }} whileTap={{ scale: 0.98 }}
                    className="rounded-lg p-4 bg-white border border-amber-100 shadow-sm flex justify-between items-start hover:shadow transition cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                        <span className="font-mono text-[9px] uppercase tracking-wider text-[#D97706] font-bold">Supply Needed</span>
                      </div>
                      <h4 className="font-bold text-sm text-[#1C1A17]">{supply}</h4>
                    </div>
                    <ShoppingCart size={16} className="text-[#A8A29E] mt-0.5 shrink-0" />
                  </motion.div>
                </Link>
              ))}

              {/* Health notes */}
              {result.healthNotes && result.healthNotes.map((h, i) => (
                <Link key={`h-${i}`} href="/kids">
                  <motion.div
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }} whileTap={{ scale: 0.98 }}
                    className="rounded-lg p-4 bg-white border border-red-100 shadow-sm flex justify-between items-start hover:shadow transition cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                        <span className="font-mono text-[9px] uppercase tracking-wider text-[#DC2626] font-bold">Health Note{h.person_name ? ` — ${h.person_name}` : ""}</span>
                      </div>
                      <h4 className="font-bold text-sm text-[#1C1A17]">{h.note}</h4>
                      {h.person_name && (
                        <p className="text-[10px] text-[#A8A29E] font-mono">Saved to {h.person_name}&apos;s profile</p>
                      )}
                    </div>
                    <Heart size={16} className="text-red-300 mt-0.5 shrink-0" />
                  </motion.div>
                </Link>
              ))}

              {/* Important notes */}
              {result.importantNotes && result.importantNotes.length > 0 && (
                <div className="rounded-lg p-4 bg-white border border-[#EDE9DF] shadow-sm space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] font-bold">Other Notes</p>
                  <ul className="space-y-1.5">
                    {result.importantNotes.map((note, i) => (
                      <li key={i} className="text-xs text-stone-700 flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#D97706] shrink-0" />
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <GuideOverlay guideId="email-parser" steps={AUTOFILL_GUIDE} color="#508D76" />
    </div>
  );
}
