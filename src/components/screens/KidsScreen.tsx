"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, BookOpen, Heart, ChevronRight, Plus, Sparkles, Pencil, X, Check, ShoppingCart, FileText } from "lucide-react";
import Link from "next/link";
import { request } from "@/lib/api/request";
import { AddKidModal } from "./AddKidModal";
import { TourOverlay } from "@/components/tour/TourOverlay";
import { GuideOverlay, GuideStep } from "@/components/tour/GuideOverlay";

const KIDS_GUIDE: GuideStep[] = [
  { icon: "👨‍👩‍👧‍👦", title: "Welcome to Kids Profiles", description: "Every child gets their own color-coded profile with schedules, supplies, interests, health notes, and memories." },
  { icon: "🎨", title: "Switch Between Children", description: "Tap a name in the tab strip to jump between kids. Each child's color appears everywhere — calendar events, supply cards, and memory timelines." },
  { icon: "➕", title: "Add a New Child", description: "Tap the '+ Add Child' button to create a profile. Choose any color from the palette, use the eyedropper, or type a hex code." },
  { icon: "❤️", title: "Interests & Favorites", description: "Add their favorite foods, hobbies, and interests. The AI uses these to make personalized recommendations." },
  { icon: "📦", title: "Supplies for This Child", description: "See supplies assigned to this child with live day-counters. Tap 'Manage All' to add or update items." },
  { icon: "📸", title: "Memory Vault", description: "Tap 'View Memory Vault' to open their personal timeline — photos, quotes, milestones, organized by date." },
];

type Kid = {
  id: string;
  name: string;
  birthDate?: string | null;
  colorCode: string;
  favorites?: { foods?: string[]; hobbies?: string[]; interests?: string[] } | null;
};
type Supply = {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  lowThreshold: number;
  dailyUsage?: number | null;
  predictedRunOut?: string | null;
  kidId?: string | null;
};
type HealthNote = { id: string; title: string | null; content: string | null; date: string };

const SWATCHES = [
  "#C96A4B","#E07B5A","#D4956A","#D97706","#C4A63B",
  "#508D76","#3B8A6E","#5B9BD5","#4A7EC4","#6A72C9",
  "#8A7BA7","#A066B0","#C46A9A","#D46085","#C46070",
  "#5A6A7A","#7A8A9A","#2D3B4A","#6B5F52","#3D3530",
];

function isValidHex(v: string) { return /^#[0-9A-Fa-f]{6}$/.test(v); }

function getAge(birthDate?: string | null) {
  if (!birthDate) return "";
  const b = new Date(birthDate), n = new Date();
  const totalMonths = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth());
  const y = Math.floor(totalMonths / 12), m = totalMonths % 12;
  return y === 0 ? `${m}mo` : m > 0 ? `${y}y ${m}mo` : `${y}yo`;
}

function getDaysLeft(s: Supply): number {
  const usage = s.dailyUsage && s.dailyUsage > 0 ? s.dailyUsage : null;
  if (usage) return Math.max(0, Math.floor(s.currentStock / usage));
  if (s.predictedRunOut) return Math.max(0, Math.ceil((new Date(s.predictedRunOut).getTime() - Date.now()) / 86400000));
  return Math.max(0, Math.ceil(s.currentStock / 2));
}

function supplyLevel(s: Supply) {
  const d = getDaysLeft(s);
  if (d <= 2 || s.currentStock <= s.lowThreshold) return "critical";
  if (d <= 5 || s.currentStock <= s.lowThreshold * 2) return "warning";
  return "healthy";
}

/* ── Inline tag list editor ─────────────────────────── */
function TagEditor({
  label,
  tags,
  color,
  onSave,
}: {
  label: string;
  tags: string[];
  color: string;
  onSave: (next: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tags);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function open() { setDraft(tags); setEditing(true); setTimeout(() => inputRef.current?.focus(), 50); }
  function add() {
    const v = input.trim();
    if (v && !draft.includes(v)) setDraft(d => [...d, v]);
    setInput("");
  }
  function remove(t: string) { setDraft(d => d.filter(x => x !== t)); }
  function save() { onSave(draft); setEditing(false); }
  function cancel() { setDraft(tags); setEditing(false); }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#57534E]">{label}</span>
        {!editing
          ? <button onClick={open} className="flex items-center gap-1 font-mono text-[10px] uppercase text-[#A8A29E] hover:text-[#C96A4B] transition"><Pencil size={11} />Edit</button>
          : <div className="flex gap-2">
              <button onClick={cancel} className="font-mono text-[10px] uppercase text-[#A8A29E] hover:text-[#C96A4B] transition"><X size={12} /></button>
              <button onClick={save} className="font-mono text-[10px] uppercase font-bold" style={{ color }}><Check size={12} /></button>
            </div>
        }
      </div>
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {(editing ? draft : tags).map(t => (
          <span
            key={t}
            className="font-mono text-[10px] px-2 py-1 rounded-full border flex items-center gap-1"
            style={{ backgroundColor: `${color}12`, color, borderColor: `${color}30` }}
          >
            {t}
            {editing && (
              <button onClick={() => remove(t)} className="opacity-60 hover:opacity-100"><X size={9} /></button>
            )}
          </span>
        ))}
        {(editing ? draft : tags).length === 0 && (
          <span className="text-[11px] text-[#A8A29E] italic">None added yet</span>
        )}
      </div>
      {editing && (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder={`Add ${label.toLowerCase()}...`}
            className="flex-1 text-sm border border-[#EDE9DF] rounded-lg px-3 py-2 bg-[#FDFBF7] focus:outline-none focus:ring-2"
            style={{ ["--tw-ring-color" as string]: `${color}40` }}
          />
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={add}
            disabled={!input.trim()}
            className="px-3 py-2 text-white rounded-lg text-sm font-semibold disabled:opacity-40"
            style={{ backgroundColor: color }}
          >
            <Plus size={14} />
          </motion.button>
        </div>
      )}
    </div>
  );
}

/* ── Inline color picker for existing kid ───────────── */
function ColorEditor({ kid, onSaved }: { kid: Kid; onSaved: (color: string) => void }) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(kid.colorCode);
  const [hex, setHex] = useState(kid.colorCode);
  const nativeRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  function apply(c: string) { setColor(c); setHex(c); }

  async function save() {
    setSaving(true);
    const res = await request(`/api/kids/${kid.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colorCode: color }),
    });
    setSaving(false);
    if (res.ok) { onSaved(color); setOpen(false); }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#A8A29E] hover:text-[#1C1A17] transition"
      >
        <div className="w-4 h-4 rounded-full border border-white/50 shadow" style={{ backgroundColor: kid.colorCode }} />
        Edit color
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[#EDE9DF] bg-[#FDFBF7] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#57534E]">Profile Color</span>
        <button onClick={() => setOpen(false)}><X size={14} className="text-[#A8A29E]" /></button>
      </div>
      <div className="grid grid-cols-10 gap-1.5">
        {SWATCHES.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => apply(c)}
            className="w-full aspect-square rounded-full border-2 transition-all hover:scale-110"
            style={{
              backgroundColor: c,
              borderColor: color === c ? "#1C1A17" : "transparent",
              boxShadow: color === c ? "0 0 0 2px white inset" : "none",
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="w-7 h-7 rounded-md border border-[#EDE9DF] cursor-pointer" style={{ backgroundColor: color }} onClick={() => nativeRef.current?.click()} />
          <input ref={nativeRef} type="color" value={color} onChange={e => apply(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" tabIndex={-1} />
        </div>
        <input
          type="text"
          value={hex}
          onChange={e => { const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`; setHex(v); if (isValidHex(v)) setColor(v); }}
          maxLength={7}
          className="flex-1 text-sm font-mono border border-[#EDE9DF] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#C96A4B]/30 uppercase"
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={save}
          disabled={saving}
          className="px-4 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
          style={{ backgroundColor: color }}
        >
          {saving ? "…" : "Save"}
        </motion.button>
      </div>
    </div>
  );
}

/* ── Main screen ─────────────────────────────────────── */
export function KidsScreen() {
  const [kids, setKids] = useState<Kid[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [selected, setSelected] = useState<Kid | null>(null);
  const [healthNotes, setHealthNotes] = useState<HealthNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addingHealthNote, setAddingHealthNote] = useState(false);
  const [healthNoteInput, setHealthNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    Promise.all([
      request("/api/kids").then(r => r.ok ? r.json() : null),
      request("/api/supplies").then(r => r.ok ? r.json() : null),
    ]).then(([kd, sd]) => {
      if (kd?.kids?.length) { setKids(kd.kids); setSelected(kd.kids[0]); }
      if (sd?.supplies) setSupplies(sd.supplies);
    }).finally(() => setLoading(false));
  }, []);

  // Fetch health notes whenever selected kid changes
  useEffect(() => {
    if (!selected) return;
    setHealthNotes([]);
    request(`/api/milestones?kidId=${selected.id}&type=health`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.milestones) setHealthNotes(d.milestones); });
  }, [selected?.id]);

  async function saveFavorites(kid: Kid, field: "foods" | "hobbies" | "interests", next: string[]) {
    const newFavs = { ...(kid.favorites || {}), [field]: next };
    const res = await request(`/api/kids/${kid.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorites: newFavs }),
    });
    if (res.ok) {
      const data = await res.json();
      setKids(prev => prev.map(k => k.id === kid.id ? data.kid : k));
      if (selected?.id === kid.id) setSelected(data.kid);
    }
  }

  async function saveHealthNote(kid: Kid) {
    if (!healthNoteInput.trim()) return;
    setSavingNote(true);
    const res = await request("/api/milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kidId: kid.id,
        type: "health",
        title: "Health Note",
        content: healthNoteInput.trim(),
        date: new Date().toISOString().split("T")[0],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setHealthNotes(prev => [data.milestone, ...prev]);
      setHealthNoteInput("");
      setAddingHealthNote(false);
    }
    setSavingNote(false);
  }

  function applyColorChange(kidId: string, color: string) {
    setKids(prev => prev.map(k => k.id === kidId ? { ...k, colorCode: color } : k));
    if (selected?.id === kidId) setSelected(prev => prev ? { ...prev, colorCode: color } : prev);
  }

  if (loading) return (
    <div className="px-5 py-8 max-w-3xl mx-auto space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24" />)}
    </div>
  );

  const kidSupplies = selected ? supplies.filter(s => s.kidId === selected.id) : [];

  return (
    <div className="min-h-svh bg-[#FDFBF7] px-5 py-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#57534E]">FAMILY DIRECTORY</span>
          <div className="h-px bg-[#EDE9DF]" /><div className="h-px bg-[#EDE9DF] mt-0.5" />
          <div className="flex items-center justify-between pt-3">
            <h1 className="text-3xl font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>Personal Profiles</h1>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-white text-xs font-mono uppercase font-bold px-3 py-2 rounded-lg"
              data-tour="kids-add"
              style={{ backgroundColor: selected?.colorCode || "#C96A4B" }}>
              <Plus size={14} /> Add Child
            </motion.button>
          </div>
        </div>

        {/* Kid tab strip */}
        {kids.length > 0 && (
          <div data-tour="kids-tabs" className="flex gap-2 p-1 bg-stone-100 rounded-lg border border-[#EDE9DF] overflow-x-auto">
            {kids.map(k => (
              <button
                key={k.id}
                onClick={() => setSelected(k)}
                className={["flex items-center gap-1.5 flex-shrink-0 py-1.5 px-3 text-xs font-mono uppercase tracking-wider font-bold rounded-md transition-all",
                  selected?.id === k.id ? "bg-white shadow-sm" : "text-[#A8A29E] hover:text-[#1C1A17]"].join(" ")}
                style={selected?.id === k.id ? { color: k.colorCode } : {}}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: k.colorCode }} />
                {k.name}
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {kids.length === 0 && (
          <div className="rounded-xl bg-white border border-[#EDE9DF] p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#C96A4B]/10 flex items-center justify-center mx-auto">
              <Sparkles size={28} className="text-[#C96A4B]" />
            </div>
            <h3 className="text-xl font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>Add Your First Child</h3>
            <p className="text-sm text-[#57534E] max-w-xs mx-auto">Create a profile for each child to track milestones, schedule, and more.</p>
            <button onClick={() => setShowAdd(true)} style={{ backgroundColor: "#C96A4B" }} className="text-white text-sm font-semibold px-5 py-2.5 rounded-lg">Get Started</button>
          </div>
        )}

        {/* Selected kid profile */}
        <AnimatePresence mode="wait">
          {selected && (
            <motion.div key={selected.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }} className="space-y-4">

              {/* Identity card */}
              <div className="rounded-xl p-5 bg-white border border-[#EDE9DF] shadow-sm space-y-4"
                style={{ borderLeft: `4px solid ${selected.colorCode}` }}>
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shrink-0"
                    style={{ backgroundColor: selected.colorCode, fontFamily: "var(--font-heading)" }}
                  >
                    {selected.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <h2 className="text-2xl font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>{selected.name}</h2>
                    <p className="font-mono text-xs text-[#57534E] uppercase">Age: {getAge(selected.birthDate) || "Unknown"}</p>
                    <span
                      className="inline-block font-mono text-[9px] uppercase font-bold px-2 py-0.5 rounded mt-0.5"
                      style={{ backgroundColor: `${selected.colorCode}20`, color: selected.colorCode, border: `1px solid ${selected.colorCode}40` }}
                    >
                      {selected.birthDate
                        ? `Born ${new Date(selected.birthDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
                        : "Profile Active"}
                    </span>
                  </div>
                </div>
                <ColorEditor kid={selected} onSaved={c => applyColorChange(selected.id, c)} />
              </div>

              {/* Interests & Favorites editor */}
              <div data-tour="kids-interests" className="rounded-lg p-4 bg-white border border-[#EDE9DF] shadow-sm space-y-5">
                <div className="flex items-center gap-2 border-b border-[#EDE9DF] pb-2">
                  <Heart size={15} style={{ color: selected.colorCode }} />
                  <span className="text-base font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>Interests &amp; Favorites</span>
                </div>
                <TagEditor
                  label="Interests"
                  tags={selected.favorites?.interests || []}
                  color={selected.colorCode}
                  onSave={tags => saveFavorites(selected, "interests", tags)}
                />
                <TagEditor
                  label="Hobbies"
                  tags={selected.favorites?.hobbies || []}
                  color={selected.colorCode}
                  onSave={tags => saveFavorites(selected, "hobbies", tags)}
                />
                <TagEditor
                  label="Favorite Foods"
                  tags={selected.favorites?.foods || []}
                  color={selected.colorCode}
                  onSave={tags => saveFavorites(selected, "foods", tags)}
                />
              </div>

              {/* Health & Vitality Notes — live, from milestones of type "health" */}
              <div className="rounded-lg p-4 bg-white border border-[#EDE9DF] shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#EDE9DF] pb-2">
                  <span className="text-base font-bold text-[#1C1A17] flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
                    <Activity size={15} style={{ color: selected.colorCode }} />Health &amp; Vitality Notes
                  </span>
                  <button
                    onClick={() => setAddingHealthNote(v => !v)}
                    className="font-mono text-[10px] uppercase tracking-wider font-bold hover:underline flex items-center gap-1"
                    style={{ color: selected.colorCode }}
                  >
                    <Plus size={11} /> Add Note
                  </button>
                </div>

                {/* Inline add form */}
                <AnimatePresence>
                  {addingHealthNote && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex gap-2 pb-2">
                        <input
                          type="text"
                          value={healthNoteInput}
                          onChange={e => setHealthNoteInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") saveHealthNote(selected); }}
                          placeholder="e.g. Allergy to penicillin, flu shot due…"
                          autoFocus
                          className="flex-1 text-sm border border-[#EDE9DF] rounded-lg px-3 py-2 bg-[#FDFBF7] focus:outline-none focus:ring-2"
                          style={{ ["--tw-ring-color" as string]: `${selected.colorCode}40` }}
                        />
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => saveHealthNote(selected)}
                          disabled={savingNote || !healthNoteInput.trim()}
                          className="px-3 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-40"
                          style={{ backgroundColor: selected.colorCode }}
                        >
                          {savingNote ? "…" : <Check size={14} />}
                        </motion.button>
                        <button onClick={() => setAddingHealthNote(false)} className="px-2 py-2 rounded-lg bg-stone-100">
                          <X size={14} className="text-[#A8A29E]" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Notes list */}
                {healthNotes.length === 0 ? (
                  <p className="text-xs text-[#A8A29E] italic">No health notes yet. Add allergies, medications, doctor visit summaries, or anything important.</p>
                ) : (
                  <div className="space-y-2">
                    {healthNotes.map(note => (
                      <div key={note.id} className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50/60 border border-red-100">
                        <FileText size={13} className="text-[#DC2626] mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#1C1A17] leading-snug">{note.content}</p>
                          <p className="font-mono text-[9px] text-[#A8A29E] mt-0.5 uppercase">
                            {new Date(note.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Link href="/email-parser" className="text-xs font-mono font-bold uppercase tracking-wider hover:underline flex items-center gap-1"
                  style={{ color: selected.colorCode }}>
                  <BookOpen size={12} />Auto-Fill Events <ChevronRight size={12} />
                </Link>
              </div>

              {/* Supplies for this kid */}
              <div data-tour="kids-supplies" className="rounded-lg p-4 bg-white border border-[#EDE9DF] shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#EDE9DF] pb-2">
                  <span className="text-base font-bold text-[#1C1A17] flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
                    <ShoppingCart size={15} style={{ color: selected.colorCode }} />{selected.name}&apos;s Supplies
                  </span>
                  <Link href="/supplies" className="font-mono text-[10px] uppercase tracking-wider hover:underline font-bold" style={{ color: selected.colorCode }}>
                    Manage All
                  </Link>
                </div>
                {kidSupplies.length === 0 ? (
                  <div className="text-center py-4 space-y-2">
                    <p className="text-xs text-[#A8A29E]">No supplies tracked for {selected.name} yet.</p>
                    <Link href="/supplies" className="text-xs font-mono uppercase font-bold hover:underline" style={{ color: selected.colorCode }}>
                      + Add supply
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {kidSupplies.map(s => {
                      const level = supplyLevel(s);
                      const days = getDaysLeft(s);
                      const alertColor = level === "critical" ? "#DC2626" : level === "warning" ? "#D97706" : selected.colorCode;
                      const barWidth = Math.min(100, s.dailyUsage && s.dailyUsage > 0 ? Math.min(100, (days / 14) * 100) : Math.min(100, (s.currentStock / (s.lowThreshold * 3)) * 100));
                      return (
                        <div
                          key={s.id}
                          className="rounded-lg p-3 border"
                          style={{ borderColor: `${alertColor}30`, backgroundColor: `${alertColor}06` }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-[#1C1A17]">{s.name}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${alertColor}20`, color: alertColor }}>
                                {days}d left
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${barWidth}%`, backgroundColor: alertColor }} />
                          </div>
                          <p className="font-mono text-[10px] text-[#A8A29E] mt-1">{s.currentStock} in stock{s.dailyUsage ? ` · ${s.dailyUsage}/day` : ""}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Memory vault link */}
              <Link href="/memories" data-tour="kids-memory">
                <motion.div whileTap={{ scale: 0.98 }}
                  className="rounded-lg p-4 flex justify-between items-center bg-white border border-[#EDE9DF] shadow-sm hover:shadow transition cursor-pointer">
                  <span className="text-sm font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>View Memory Vault</span>
                  <ChevronRight size={16} className="text-[#A8A29E]" />
                </motion.div>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {showAdd && (
        <AddKidModal
          onClose={() => setShowAdd(false)}
          onAdded={k => { setKids(p => [...p, k]); setSelected(k); setShowAdd(false); }}
        />
      )}
      <GuideOverlay guideId="kids" steps={KIDS_GUIDE} color={selected?.colorCode ?? "#C96A4B"} />
    </div>
  );
}
