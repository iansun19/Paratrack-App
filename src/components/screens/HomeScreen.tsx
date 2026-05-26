"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronRight } from "lucide-react";
import Link from "next/link";
import { request } from "@/lib/api/request";

type Kid = { id: string; name: string; colorCode: string };
type Event = { id: string; title: string; type: string; startTime: string; kidId?: string | null; description?: string | null };
type Supply = { id: string; name: string; currentStock: number; lowThreshold: number; predictedRunOut?: string | null; kidId?: string | null };

export function HomeScreen() {
  const [kids, setKids] = useState<Kid[]>([]);
  const [todayEvents, setTodayEvents] = useState<Event[]>([]);
  const [lowSupplies, setLowSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      request("/api/kids").then(r => r.ok ? r.json() : null).then(d => d && setKids(d.kids)),
      request(`/api/events?from=${new Date().toISOString()}&to=${new Date(Date.now() + 86400000).toISOString()}`).then(r => r.ok ? r.json() : null).then(d => d && setTodayEvents(d.events.slice(0, 3))),
      request("/api/supplies").then(r => r.ok ? r.json() : null).then(d => d && setLowSupplies(d.supplies.filter((s: Supply) => s.currentStock <= s.lowThreshold).slice(0, 2))),
    ]).finally(() => setLoading(false));
  }, []);

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  if (loading) return (
    <div className="px-5 py-8 max-w-3xl mx-auto space-y-5">
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24" />)}
    </div>
  );

  return (
    <div className="min-h-svh bg-[#FDFBF7] px-5 py-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6">
        {/* Masthead */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#57534E]">THE MORNING CHRONICLE</span>
            <span className="font-mono text-[10px] text-[#A8A29E]">VOL. IV • NO. 297</span>
          </div>
          <div className="h-px bg-[#EDE9DF]" /><div className="h-px bg-[#EDE9DF] mt-0.5" />
          <h1 className="pt-3 text-4xl font-bold tracking-tight text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>Good Morning</h1>
          <p className="text-lg text-[#57534E] italic" style={{ fontFamily: "var(--font-heading)" }}>{dayName}, {dateStr}</p>
        </div>

        {/* AI Summary */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className="rounded-xl bg-[#FBF9F4] border border-[#EDE9DF] p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#C96A4B] font-bold flex items-center gap-1.5">
              <Sparkles size={14} /> AI Operating Insights
            </span>
            <span className="text-[10px] font-mono text-[#A8A29E]">UPDATED JUST NOW</span>
          </div>
          <p className="text-lg text-[#1C1A17] leading-relaxed italic" style={{ fontFamily: "var(--font-heading)" }}>
            {lowSupplies.length > 0
              ? `${lowSupplies[0].name} is running low. ${todayEvents.length > 0 ? `You have ${todayEvents.length} event${todayEvents.length > 1 ? "s" : ""} today.` : "Your schedule is clear."}`
              : todayEvents.length > 0
                ? `You have ${todayEvents.length} event${todayEvents.length > 1 ? "s" : ""} today. All supplies are stocked.`
                : "All systems green. A clear day ahead for the family."}
          </p>
          <div className="pt-2 border-t border-[#EDE9DF] flex items-center justify-between">
            <span className="text-xs text-[#57534E] font-mono">{lowSupplies.length} supply alert{lowSupplies.length !== 1 ? "s" : ""} today</span>
            {lowSupplies.length > 0 && (
              <Link href="/supplies" className="text-xs font-mono uppercase tracking-wider text-[#C96A4B] hover:underline font-bold flex items-center gap-1">
                Restock Now <ChevronRight size={12} />
              </Link>
            )}
          </div>
        </motion.div>

        {/* Alerts */}
        {lowSupplies.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>Required Interventions</h3>
            {lowSupplies.map((supply) => {
              const kid = kids.find(k => k.id === supply.kidId);
              const daysLeft = Math.max(0, Math.ceil(supply.currentStock / 2));
              return (
                <Link key={supply.id} href="/supplies">
                  <motion.div whileTap={{ scale: 0.98 }} className="rounded-lg p-4 flex justify-between items-center bg-white border border-[#EDE9DF] shadow-sm hover:shadow transition-shadow cursor-pointer mt-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: kid?.colorCode || "#C96A4B" }} />
                        <span className="font-mono text-[9px] uppercase tracking-wider text-[#57534E]">{kid?.name || "Household"} • Supplies</span>
                      </div>
                      <h4 className="font-bold text-sm text-[#1C1A17]">{supply.name} Critical</h4>
                      <p className="text-xs text-[#57534E]">Only {supply.currentStock} remaining — approx. {daysLeft} days left.</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-[#C96A4B] font-bold block">{daysLeft}d left</span>
                      <span className="bg-[#C96A4B]/10 text-[#C96A4B] font-mono text-[9px] uppercase font-bold px-2 py-1 rounded">RESTOCK</span>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Today's Timeline */}
        {todayEvents.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-baseline border-b border-[#EDE9DF] pb-2">
              <h3 className="text-xl font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>Chronology of Today</h3>
              <Link href="/calendar" className="text-xs font-mono uppercase tracking-wider text-[#57534E] hover:text-[#C96A4B] transition">View Full Calendar</Link>
            </div>
            <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#EDE9DF]">
              {todayEvents.map((event, idx) => {
                const kid = kids.find(k => k.id === event.kidId);
                const time = new Date(event.startTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                return (
                  <motion.div key={event.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 + 0.2 }} className="relative pl-8">
                    <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2" style={{ borderColor: kid?.colorCode || "#C96A4B" }} />
                    <span className="font-mono text-xs font-bold text-[#1C1A17]">{time}</span>
                    <h4 className="font-bold text-sm text-[#1C1A17]">{event.title}{kid && ` • ${kid.name}`}</h4>
                    {event.description && <p className="text-xs text-[#57534E]">{event.description}</p>}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Memory highlight */}
        <Link href="/memories">
          <motion.div whileTap={{ scale: 0.98 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-xl p-5 bg-stone-50 border border-[#EDE9DF] shadow-sm hover:shadow transition-shadow cursor-pointer space-y-4">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#A8A29E] font-bold">PRESERVED THIS WEEK IN 2023</span>
            <div className="border border-stone-200/50 p-2 bg-white -rotate-[0.5deg]">
              <div className="aspect-video bg-stone-100 flex items-center justify-center relative overflow-hidden rounded">
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-50 to-indigo-100 opacity-40" />
                <span className="font-mono text-[10px] text-stone-400 uppercase tracking-widest relative z-10">[ Family Memory ]</span>
              </div>
            </div>
            <div className="space-y-1 text-center">
              <p className="italic text-stone-700 text-base" style={{ fontFamily: "var(--font-heading)" }}>"The dandelions are wishes waiting to blow away, Mama."</p>
              <p className="font-mono text-[9px] tracking-widest text-stone-400 uppercase">— {kids[0]?.name || "Your child"}, Age 5</p>
            </div>
          </motion.div>
        </Link>
      </motion.div>
    </div>
  );
}
