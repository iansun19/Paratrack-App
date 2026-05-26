"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { request } from "@/lib/api/request";
import { memory } from "@eazo/sdk";

const EVENT_TYPES = ["school", "sports", "doctor", "birthday", "lesson", "pickup", "dropoff", "other"];
type Kid = { id: string; name: string; colorCode: string };
type CalendarEvent = { id: string; title: string; type: string; startTime: string; kidId?: string | null };

export function AddEventModal({ kids, defaultDate, onClose, onAdded }: { kids: Kid[]; defaultDate: Date; onClose: () => void; onAdded: (e: CalendarEvent) => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("school");
  const [date, setDate] = useState(defaultDate.toISOString().split("T")[0]);
  const [time, setTime] = useState("08:00");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [kidId, setKidId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await request("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, type, startTime: `${date}T${time}:00`, location, description, kidId: kidId || null }) });
      if (res.ok) {
        const data = await res.json();
        memory.reportAction({ content: `User added event "${title}" to family calendar`, event_type: "create", page: "calendar", metadata: { type: "add_event", event_id: data.event.id } }).catch(() => {});
        onAdded(data.event);
      }
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative z-10 bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-lg max-h-[90svh] overflow-y-auto"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>Add Calendar Event</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block mb-1.5">Event Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Ballet class..."
              className="w-full text-base border border-[#EDE9DF] rounded-lg px-3 py-2.5 bg-[#FDFBF7] focus:outline-none focus:ring-2 focus:ring-[#C96A4B]/30" />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block mb-1.5">Type</label>
            <div className="flex gap-1.5 flex-wrap">
              {EVENT_TYPES.map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={["font-mono text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border transition-all", type === t ? "bg-[#C96A4B] text-white border-transparent" : "bg-white text-[#A8A29E] border-[#EDE9DF]"].join(" ")}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block mb-1.5">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                className="w-full text-base border border-[#EDE9DF] rounded-lg px-3 py-2.5 bg-[#FDFBF7] focus:outline-none focus:ring-2 focus:ring-[#C96A4B]/30" />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block mb-1.5">Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full text-base border border-[#EDE9DF] rounded-lg px-3 py-2.5 bg-[#FDFBF7] focus:outline-none focus:ring-2 focus:ring-[#C96A4B]/30" />
            </div>
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block mb-1.5">Location (Optional)</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Dance Studio..."
              className="w-full text-base border border-[#EDE9DF] rounded-lg px-3 py-2.5 bg-[#FDFBF7] focus:outline-none focus:ring-2 focus:ring-[#C96A4B]/30" />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block mb-1.5">Notes (Optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Any prep or notes..."
              className="w-full text-base border border-[#EDE9DF] rounded-lg px-3 py-2.5 bg-[#FDFBF7] resize-none focus:outline-none focus:ring-2 focus:ring-[#C96A4B]/30" />
          </div>
          {kids.length > 0 && (
            <div>
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block mb-1.5">Assign to Child (Optional)</label>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => setKidId("")}
                  className={["font-mono text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border transition-all", !kidId ? "bg-[#C96A4B] text-white border-transparent" : "bg-white text-[#A8A29E] border-[#EDE9DF]"].join(" ")}>
                  Family
                </button>
                {kids.map(k => (
                  <button key={k.id} type="button" onClick={() => setKidId(k.id)}
                    className={["font-mono text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border transition-all", kidId === k.id ? "text-white border-transparent" : "bg-white text-[#A8A29E] border-[#EDE9DF]"].join(" ")}
                    style={{ backgroundColor: kidId === k.id ? k.colorCode : undefined }}>
                    {k.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }} className="w-full py-3 bg-[#C96A4B] text-white font-semibold rounded-lg text-sm disabled:opacity-60">
            {loading ? "Adding..." : "Add Event"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
