"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Quote, Star, Image as ImageIcon } from "lucide-react";
import { request } from "@/lib/api/request";
import { AddMilestoneModal } from "./AddMilestoneModal";
import { TourOverlay } from "@/components/tour/TourOverlay";
import { GuideOverlay, GuideStep } from "@/components/tour/GuideOverlay";

const MEMORIES_GUIDE: GuideStep[] = [
  { icon: "📖", title: "Memory Vault", description: "A cinematic timeline of your child's life — photos, milestones, quotes, achievements, and report cards, organized by date." },
  { icon: "🧒", title: "Filter by Child", description: "If you have multiple children, switch between them using the name chips at the top. Each child has their own private memory archive." },
  { icon: "✨", title: "AI Year Summary", description: "The dark strip at the top tracks memories, milestones, and photos for the year. The AI uses these to generate personalized yearly recaps." },
  { icon: "➕", title: "Add a Memory", description: "Tap '+ Add Memory' to record a new milestone, funny quote, achievement, or photo. You can attach an image from your device for any memory type." },
  { icon: "🖼️", title: "Timeline View", description: "Entries are shown newest-first on a timeline. Photos fill their card automatically. Tap any entry to read its full content." },
];

type Kid = { id: string; name: string; colorCode: string };
type Milestone = { id: string; kidId: string; type: string; title?: string | null; content?: string | null; mediaUrl?: string | null; date: string };

export function MemoriesScreen() {
  const [kids, setKids] = useState<Kid[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    request("/api/kids").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.kids?.length > 0) { setKids(d.kids); setSelectedKidId(d.kids[0].id); }
      else setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedKidId) return;
    setLoading(true);
    request(`/api/milestones?kidId=${selectedKidId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.milestones) {
          // Health notes belong in the Kids profile — exclude from Memory Vault
          setMilestones(d.milestones.filter((m: { type: string }) => m.type !== "health"));
        }
      })
      .finally(() => setLoading(false));
  }, [selectedKidId]);

  const selectedKid = kids.find(k => k.id === selectedKidId);
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-svh bg-[#FDFBF7] px-5 py-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#57534E]">THE LIVING ARCHIVE</span>
          <div className="h-px bg-[#EDE9DF]" /><div className="h-px bg-[#EDE9DF] mt-0.5" />
          <div className="flex items-center justify-between pt-3">
            <h1 className="text-3xl font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>Memory Vault</h1>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 bg-[#C96A4B] text-white text-xs font-mono uppercase font-bold px-3 py-2 rounded-lg"
              data-tour="mem-add">
              <Plus size={14} />Add Memory
            </motion.button>
          </div>
        </div>

        {/* AI summary strip */}
        <div data-tour="mem-summary" className="rounded-xl bg-[#1C1A17] text-white p-4 space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-stone-400">AI YEAR SUMMARY</span>
          <p className="text-base font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            {selectedKid ? `${currentYear}: ${selectedKid.name}'s Year of Growth` : `${currentYear}: A Year of Milestones`}
          </p>
          <div className="flex gap-4 text-stone-400 font-mono text-[10px] pt-1">
            <span>{milestones.length} Captured Memories</span>
            <span>{milestones.filter(m => m.type === "achievement").length} Milestones Verified</span>
            <span>{milestones.filter(m => !!m.mediaUrl).length} Photos</span>
          </div>
        </div>

        {/* Kid selector */}
        {kids.length > 1 && (
          <div data-tour="mem-kid-filter" className="flex gap-2 flex-wrap">
            {kids.map(k => (
              <button key={k.id} onClick={() => setSelectedKidId(k.id)}
                className={["font-mono text-[10px] uppercase font-bold px-3 py-1.5 rounded-full border transition-all",
                  selectedKidId === k.id ? "text-white border-transparent" : "bg-white text-[#A8A29E] border-[#EDE9DF]"].join(" ")}
                style={{ backgroundColor: selectedKidId === k.id ? k.colorCode : undefined }}>
                {k.name}
              </button>
            ))}
          </div>
        )}

        {/* Timeline */}
        {loading ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-32" />)}</div>
        ) : milestones.length === 0 ? (
          <div className="rounded-xl bg-white border border-[#EDE9DF] p-10 text-center space-y-4">
            <Star size={32} className="text-[#A8A29E] mx-auto" />
            <p className="text-lg font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>Start Your Archive</p>
            <p className="text-sm text-[#57534E]">Add the first memory to build your family timeline.</p>
            <button onClick={() => setShowAdd(true)} className="bg-[#C96A4B] text-white text-sm font-semibold px-5 py-2.5 rounded-lg">Add First Memory</button>
          </div>
        ) : (
          <div data-tour="mem-timeline" className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#EDE9DF]">
            {milestones.map((entry, idx) => {
              const kid = kids.find(k => k.id === entry.kidId);
              const dateStr = new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
              return (
                <motion.div key={entry.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.07 }} className="relative pl-8 space-y-2">
                  {/* Timeline dot */}
                  <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2" style={{ borderColor: kid?.colorCode || "#C96A4B" }} />

                  {/* Date + kid badge */}
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[10px] text-[#A8A29E] uppercase tracking-wider">{dateStr}</span>
                    {kid && (
                      <span className="font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${kid.colorCode}20`, color: kid.colorCode }}>
                        {kid.name}
                      </span>
                    )}
                  </div>

                  {/* Memory card */}
                  <div className="rounded-xl bg-white border border-[#EDE9DF] shadow-sm overflow-hidden">
                    {/* Photo — fixed height, full width, covers the space */}
                    {entry.mediaUrl && (
                      <div className="w-full h-52 overflow-hidden -mx-0 rounded-t-xl -mt-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={entry.mediaUrl}
                          alt={entry.title ?? "Memory photo"}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="p-4 space-y-2">
                      {entry.title && (
                        <h4 className="font-bold text-sm text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>
                          {entry.title}
                        </h4>
                      )}
                      {entry.content && (
                        <p className="text-sm text-[#57534E] leading-relaxed italic">&ldquo;{entry.content}&rdquo;</p>
                      )}
                      {/* Type badge */}
                      <div className="flex items-center gap-1.5 text-[#A8A29E] font-mono text-[9px] uppercase tracking-wider pt-1">
                        {entry.mediaUrl ? <ImageIcon size={11} /> : entry.type === "quote" ? <Quote size={11} /> : <Star size={11} />}
                        <span>{entry.type}{entry.mediaUrl ? " · Photo" : ""}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {showAdd && selectedKidId && (
        <AddMilestoneModal
          kidId={selectedKidId}
          onClose={() => setShowAdd(false)}
          onAdded={m => { setMilestones(p => [m, ...p]); setShowAdd(false); }}
        />
      )}
      <GuideOverlay guideId="memories" steps={MEMORIES_GUIDE} color="#8A7BA7" />
    </div>
  );
}
