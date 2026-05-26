"use client";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Calendar, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { request } from "@/lib/api/request";
import { AddEventModal } from "./AddEventModal";
import { TourOverlay } from "@/components/tour/TourOverlay";
import { GuideOverlay, GuideStep } from "@/components/tour/GuideOverlay";

const CALENDAR_GUIDE: GuideStep[] = [
  { icon: "📅", title: "Family Calendar", description: "Every child's events — school, sports, doctor visits, pickups — all in one place, color-coded by child." },
  { icon: "⬅️", title: "Navigate Months", description: "Use the arrows to move between months. The header badge shows upcoming supply alerts for that month." },
  { icon: "🔵", title: "Color-Coded Days", description: "Colored dots under a date show events. Red dots = supply runs out. Amber = stock running low. Tap any day to see details." },
  { icon: "➕", title: "Add an Event", description: "Tap '+ Add Event' to log a school activity, doctor appointment, birthday, or any family event. Assign it to one child or keep it family-wide." },
  { icon: "🛒", title: "Supply Alerts in Calendar", description: "When a supply is predicted to run out, an alert card automatically appears on that day. Tap it to go straight to the Supply Tracker." },
];

type Kid = { id: string; name: string; colorCode: string };
type CalendarEvent = {
  id: string;
  title: string;
  type: string;
  startTime: string;
  endTime?: string | null;
  location?: string | null;
  description?: string | null;
  kidId?: string | null;
};
type Supply = {
  id: string;
  name: string;
  currentStock: number;
  lowThreshold: number;
  dailyUsage?: number | null;
  predictedRunOut?: string | null;
  kidId?: string | null;
};

/** A virtual calendar entry synthesised from a supply run-out date */
type SupplyAlert = {
  id: string;
  supplyId: string;
  name: string;
  daysLeft: number;
  date: string; // YYYY-MM-DD
  kidId?: string | null;
  level: "critical" | "warning";
};

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getMonthDays(y: number, m: number) {
  const firstDay = new Date(y, m, 1).getDay();
  return { daysInMonth: new Date(y, m + 1, 0).getDate(), startOffset: firstDay === 0 ? 6 : firstDay - 1 };
}

function computeAlerts(supplies: Supply[]): SupplyAlert[] {
  const alerts: SupplyAlert[] = [];

  for (const s of supplies) {
    const usage = s.dailyUsage && s.dailyUsage > 0 ? s.dailyUsage : null;
    const daysToEmpty = usage ? Math.floor(s.currentStock / usage) : null;
    const daysToThreshold = usage ? Math.floor((s.currentStock - s.lowThreshold) / usage) : null;

    // ── Run-out alert (red) — the day stock hits zero ──────────────
    if (s.predictedRunOut) {
      const currentDays = daysToEmpty ?? Math.ceil(s.currentStock / 2);
      alerts.push({
        id: `supply-runout-${s.id}`,
        supplyId: s.id,
        name: s.name,
        daysLeft: currentDays,
        date: s.predictedRunOut,
        kidId: s.kidId,
        level: "critical",
      });
    }

    // ── Warning alert (orange) — the day stock crosses the low threshold ──
    if (usage && daysToThreshold !== null && daysToThreshold > 0) {
      const warnDate = new Date();
      warnDate.setDate(warnDate.getDate() + daysToThreshold);
      const warnDateStr = warnDate.toISOString().split("T")[0];
      // Don't add a warning on the same day as the run-out
      if (warnDateStr !== s.predictedRunOut) {
        alerts.push({
          id: `supply-warn-${s.id}`,
          supplyId: s.id,
          name: s.name,
          daysLeft: daysToThreshold,
          date: warnDateStr,
          kidId: s.kidId,
          level: "warning",
        });
      }
    }
  }

  return alerts;
}

export function CalendarScreen() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [kids, setKids] = useState<Kid[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    request("/api/kids").then(r => r.ok ? r.json() : null).then(d => d && setKids(d.kids));
    request("/api/supplies").then(r => r.ok ? r.json() : null).then(d => d && setSupplies(d.supplies || []));
    fetchEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMonth, viewYear]);

  async function fetchEvents() {
    setLoading(true);
    try {
      const from = new Date(viewYear, viewMonth, 1).toISOString();
      const to = new Date(viewYear, viewMonth + 1, 0, 23, 59).toISOString();
      const res = await request(`/api/events?from=${from}&to=${to}`);
      if (res.ok) { const d = await res.json(); setEvents(d.events); }
    } finally { setLoading(false); }
  }

  // Build alert map keyed by YYYY-MM-DD
  const alertsByDate = useMemo(() => {
    const alerts = computeAlerts(supplies);
    const map = new Map<string, SupplyAlert[]>();
    for (const alert of alerts) {
      const existing = map.get(alert.date) || [];
      map.set(alert.date, [...existing, alert]);
    }
    return map;
  }, [supplies]);

  const { daysInMonth, startOffset } = getMonthDays(viewYear, viewMonth);
  const cells = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function eventsForDay(day: number) {
    return events.filter(e => {
      const d = new Date(e.startTime);
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth && d.getDate() === day;
    });
  }

  function alertsForDay(day: number): SupplyAlert[] {
    const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return alertsByDate.get(key) || [];
  }

  const selectedDayEvents = selectedDay ? eventsForDay(selectedDay) : [];
  const selectedDayAlerts = selectedDay ? alertsForDay(selectedDay) : [];

  return (
    <div className="min-h-svh bg-[#FDFBF7] px-5 py-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#57534E]">THE LOGISTICAL GRID</span>
          <div className="h-px bg-[#EDE9DF]" /><div className="h-px bg-[#EDE9DF] mt-0.5" />
          <div className="flex items-center justify-between pt-3">
            <h1 className="text-3xl font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>Family Calendar</h1>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAdd(true)}
              data-tour="cal-add"
              className="flex items-center gap-1.5 bg-[#C96A4B] text-white text-xs font-mono uppercase font-bold px-3 py-2 rounded-lg">
              <Plus size={14} />Add Event
            </motion.button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="rounded-xl p-4 bg-white border border-[#EDE9DF] shadow-sm space-y-4">
          <div data-tour="cal-nav" className="flex justify-between items-center border-b border-[#EDE9DF] pb-2">
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1 hover:bg-stone-100 rounded transition"><ChevronLeft size={16} /></button>
              <span className="text-base font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>{MONTHS[viewMonth]} {viewYear}</span>
              <button onClick={nextMonth} className="p-1 hover:bg-stone-100 rounded transition"><ChevronRight size={16} /></button>
            </div>
            <div className="flex items-center gap-2">
              {alertsByDate.size > 0 && (
                <Link href="/supplies" className="flex items-center gap-1 font-mono text-[9px] text-[#D97706] uppercase font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  <ShoppingCart size={10} />{alertsByDate.size} supply alert{alertsByDate.size !== 1 ? "s" : ""}
                </Link>
              )}
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#A8A29E]">{events.length} events</span>
            </div>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px]">
            {DAYS.map((d, i) => <div key={i} className="text-[#A8A29E] font-bold">{d}</div>)}
          </div>

          {/* Day cells */}
          <div data-tour="cal-grid" className="grid grid-cols-7 gap-1 text-center font-mono text-[10px]">
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
              const isSel = day === selectedDay;
              const dayEvs = eventsForDay(day);
              const dayAlerts = alertsForDay(day);
              const hasCriticalAlert = dayAlerts.some(a => a.level === "critical");
              const hasWarningAlert = dayAlerts.some(a => a.level === "warning");

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(day)}
                  className={[
                    "relative py-1 rounded-md transition-all",
                    isSel ? "bg-[#C96A4B]/10 text-[#C96A4B] font-bold" : "",
                    isToday && !isSel ? "bg-[#C96A4B] text-white font-bold rounded-full" : "",
                    !isSel && !isToday ? "text-stone-600 hover:bg-stone-100" : "",
                  ].join(" ")}
                >
                  {day}
                  {/* Event + alert dots */}
                  {(dayEvs.length > 0 || dayAlerts.length > 0) && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5 items-center">
                      {dayEvs.slice(0, 2).map((e, ei) => {
                        const kid = kids.find(k => k.id === e.kidId);
                        return <span key={ei} className="w-1 h-1 rounded-full" style={{ backgroundColor: kid?.colorCode || "#C96A4B" }} />;
                      })}
                      {/* Supply alert dots: red for run-out, amber for low warning */}
                      {dayAlerts.filter(a => a.level === "critical").slice(0, 1).map((a) => (
                        <span key={a.id} className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                      ))}
                      {dayAlerts.filter(a => a.level === "warning").slice(0, 1).map((a) => (
                        <span key={a.id} className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div data-tour="cal-legend" className="flex items-center gap-4 pt-1 border-t border-[#EDE9DF] flex-wrap">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#A8A29E]">
              <span className="w-2 h-2 rounded-full bg-[#C96A4B] inline-block" />Events
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#A8A29E]">
              <span className="w-2 h-2 rounded-full bg-[#DC2626] inline-block" />Supply critical
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#A8A29E]">
              <span className="w-2 h-2 rounded-full bg-[#D97706] inline-block" />Supply low
            </div>
          </div>
        </div>

        {/* Selected day detail */}
        {selectedDay && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>
              {selectedDay === today.getDate() && viewMonth === today.getMonth() ? "Today — " : `${MONTHS[viewMonth]} ${selectedDay} — `}
              {selectedDayEvents.length + selectedDayAlerts.length === 0
                ? "Nothing scheduled"
                : `${selectedDayEvents.length + selectedDayAlerts.length} item${selectedDayEvents.length + selectedDayAlerts.length !== 1 ? "s" : ""}`}
            </h3>

            {loading ? (
              <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="skeleton h-24" />)}</div>
            ) : (
              <div className="space-y-3">
                {/* Supply alerts first — they're actionable */}
                {selectedDayAlerts.map((alert, idx) => {
                  const kid = kids.find(k => k.id === alert.kidId);
                  const alertColor = alert.level === "critical" ? "#DC2626" : "#D97706";
                  const alertBg = alert.level === "critical" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200";
                  const headline = alert.level === "critical"
                    ? `${alert.name} runs out today`
                    : `${alert.name} running low today`;
                  const sub = alert.level === "critical"
                    ? "Stock reaches zero — restock now"
                    : `Crosses the low-stock threshold · ${alert.daysLeft} day${alert.daysLeft !== 1 ? "s" : ""} until empty`;
                  return (
                    <Link key={alert.id} href="/supplies">
                      <motion.div
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className={`rounded-lg p-4 border ${alertBg} flex items-start gap-3 hover:shadow-sm transition cursor-pointer mt-1`}
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${alertColor}15` }}>
                          <ShoppingCart size={16} style={{ color: alertColor }} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="font-mono text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: `${alertColor}20`, color: alertColor }}
                            >
                              Supply {alert.level}
                            </span>
                            {kid && (
                              <span className="font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: `${kid.colorCode}20`, color: kid.colorCode }}>
                                {kid.name}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-[#1C1A17]">{headline}</h4>
                          <p className="text-xs" style={{ color: alertColor }}>{sub}</p>
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}

                {/* Regular events */}
                {selectedDayEvents.length === 0 && selectedDayAlerts.length === 0 ? (
                  <div className="rounded-xl bg-white border border-[#EDE9DF] p-8 text-center space-y-3">
                    <Calendar size={24} className="text-[#A8A29E] mx-auto" />
                    <p className="text-sm text-[#57534E]">No events on this day.</p>
                    <button onClick={() => setShowAdd(true)}
                      className="text-xs font-mono uppercase font-bold text-[#C96A4B] hover:underline">
                      Add Event
                    </button>
                  </div>
                ) : (
                  selectedDayEvents.map((event, idx) => {
                    const kid = kids.find(k => k.id === event.kidId);
                    const time = new Date(event.startTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (idx + selectedDayAlerts.length) * 0.08 }}
                        className="rounded-lg p-4 bg-white border border-[#EDE9DF] shadow-sm space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            {kid && (
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                style={{ backgroundColor: kid.colorCode }}>
                                {kid.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <h4 className="font-bold text-sm text-[#1C1A17]">{event.title}</h4>
                              <p className="text-xs text-[#57534E]">
                                {time}{event.location ? ` • ${event.location}` : ""}{kid ? ` • ${kid.name}` : ""}
                              </p>
                            </div>
                          </div>
                          <span
                            className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border shrink-0"
                            style={{ backgroundColor: `${kid?.colorCode || "#C96A4B"}20`, color: kid?.colorCode || "#C96A4B", borderColor: `${kid?.colorCode || "#C96A4B"}40` }}
                          >
                            {event.type}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-xs text-[#57534E] bg-stone-50 p-3 rounded border border-stone-200/50 font-mono">{event.description}</p>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {showAdd && (
        <AddEventModal
          kids={kids}
          defaultDate={selectedDay ? new Date(viewYear, viewMonth, selectedDay) : new Date()}
          onClose={() => setShowAdd(false)}
          onAdded={e => { setEvents(p => [...p, e]); setShowAdd(false); }}
        />
      )}
      <GuideOverlay guideId="calendar" steps={CALENDAR_GUIDE} color="#5B9BD5" />
    </div>
  );
}
