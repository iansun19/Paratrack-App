"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, Sparkles, Loader2, Pencil } from "lucide-react";
import { request } from "@/lib/api/request";
import { memory } from "@eazo/sdk";

const CATEGORIES = ["diapers", "wipes", "formula", "medicine", "school", "snacks", "household", "other"];
type Kid = { id: string; name: string; colorCode: string };
type Supply = {
  id: string; name: string; category: string;
  currentStock: number; lowThreshold: number;
  dailyUsage?: number | null; unitPrice?: number | null; kidId?: string | null;
};

function UsageStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const steps = [0.25, 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
  const idx = steps.findIndex(s => s === value);
  function dec() { if (idx > 0) onChange(steps[idx - 1]); }
  function inc() { if (idx < steps.length - 1) onChange(steps[idx + 1]); }
  function label(v: number) {
    if (v < 1) return `${v * (v === 0.25 ? 4 : 2)} every ${v === 0.25 ? "4" : "2"} days`;
    return `${v} per day`;
  }
  return (
    <div className="flex items-center gap-3">
      <motion.button type="button" whileTap={{ scale: 0.85 }} onClick={dec} disabled={idx <= 0}
        className="w-9 h-9 rounded-full border border-[#EDE9DF] bg-white flex items-center justify-center text-[#57534E] disabled:opacity-30 hover:bg-stone-50 transition">
        <Minus size={14} />
      </motion.button>
      <div className="flex-1 text-center">
        <span className="text-base font-bold text-[#1C1A17]">{value}</span>
        <p className="text-[10px] font-mono text-[#A8A29E] uppercase tracking-wider mt-0.5">{label(value)}</p>
      </div>
      <motion.button type="button" whileTap={{ scale: 0.85 }} onClick={inc} disabled={idx >= steps.length - 1}
        className="w-9 h-9 rounded-full border border-[#EDE9DF] bg-white flex items-center justify-center text-[#57534E] disabled:opacity-30 hover:bg-stone-50 transition">
        <Plus size={14} />
      </motion.button>
    </div>
  );
}

export function AddSupplyModal({ kids, onClose, onAdded }: {
  kids: Kid[]; onClose: () => void; onAdded: (s: Supply) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("diapers");
  const [currentStock, setCurrentStock] = useState(20);
  const [lowThreshold, setLowThreshold] = useState(5);
  const [dailyUsage, setDailyUsage] = useState(1);
  const [kidId, setKidId] = useState("");
  const [loading, setLoading] = useState(false);

  // Price state
  const [unitPrice, setUnitPrice] = useState<number | null>(null);
  const [priceLabel, setPriceLabel] = useState("");
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceEditing, setPriceEditing] = useState(false);
  const [priceInput, setPriceInput] = useState("");

  const daysLeft = dailyUsage > 0 ? Math.floor(currentStock / dailyUsage) : null;
  const monthlyCost = unitPrice != null && dailyUsage > 0 ? unitPrice * dailyUsage * 30 : null;

  async function fetchAIPrice() {
    if (!name.trim()) return;
    setPriceLoading(true);
    try {
      const res = await request("/api/supplies/price-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), category }),
      });
      const data = await res.json() as { price: number | null; label: string };
      if (data.price != null) {
        setUnitPrice(data.price);
        setPriceLabel(data.label);
        setPriceInput(data.price.toFixed(2));
      } else {
        // Show the real error/label from the API so we can debug
        setPriceLabel(data.label ?? "Could not estimate — enter manually");
        setPriceEditing(true);
      }
    } catch (err) {
      setPriceLabel(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setPriceLoading(false); }
  }

  function applyManualPrice() {
    const v = parseFloat(priceInput);
    if (!isNaN(v) && v >= 0) {
      setUnitPrice(v);
      setPriceLabel(`$${v.toFixed(2)} per unit (manual)`);
    }
    setPriceEditing(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await request("/api/supplies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, currentStock, lowThreshold, dailyUsage, unitPrice, kidId: kidId || null }),
      });
      if (res.ok) {
        const data = await res.json();
        memory.reportAction({
          content: `Added supply "${name}" (${dailyUsage}/day${unitPrice ? `, $${unitPrice}/unit` : ""})`,
          event_type: "create", page: "supplies",
          metadata: { type: "add_supply", daily_usage: dailyUsage, unit_price: unitPrice },
        }).catch(() => {});
        onAdded(data.supply);
      }
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative z-10 bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-lg max-h-[92svh] overflow-y-auto"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>Add Supply</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block mb-1.5">Item Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              placeholder="e.g. Newborn Diapers…"
              className="w-full text-base border border-[#EDE9DF] rounded-lg px-3 py-2.5 bg-[#FDFBF7] focus:outline-none focus:ring-2 focus:ring-[#C96A4B]/30" />
          </div>

          {/* Stock + threshold */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block mb-1.5">Current Stock</label>
              <input type="number" value={currentStock} min={0} onChange={e => setCurrentStock(Number(e.target.value))}
                className="w-full text-base border border-[#EDE9DF] rounded-lg px-3 py-2.5 bg-[#FDFBF7] focus:outline-none focus:ring-2 focus:ring-[#C96A4B]/30" />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block mb-1.5">Alert Below</label>
              <input type="number" value={lowThreshold} min={1} onChange={e => setLowThreshold(Number(e.target.value))}
                className="w-full text-base border border-[#EDE9DF] rounded-lg px-3 py-2.5 bg-[#FDFBF7] focus:outline-none focus:ring-2 focus:ring-[#C96A4B]/30" />
            </div>
          </div>

          {/* Daily usage */}
          <div className="rounded-xl border border-[#EDE9DF] bg-[#FDFBF7] p-4 space-y-3">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block mb-0.5">Daily Usage</label>
              <p className="text-[10px] text-[#A8A29E]">Roughly how many per day?</p>
            </div>
            <UsageStepper value={dailyUsage} onChange={setDailyUsage} />
            {daysLeft !== null && (
              <div className={["text-center py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider",
                daysLeft <= 3 ? "bg-red-50 text-[#DC2626]" : daysLeft <= 7 ? "bg-amber-50 text-[#D97706]" : "bg-emerald-50 text-[#508D76]"].join(" ")}>
                {daysLeft === 0 ? "Out of stock now" : `≈ ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`}
              </div>
            )}
          </div>

          {/* Unit Price + AI Estimate */}
          <div className="rounded-xl border border-[#EDE9DF] bg-[#FDFBF7] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block mb-0.5">Unit Price</label>
                <p className="text-[10px] text-[#A8A29E]">Used to estimate monthly spend</p>
              </div>
              <motion.button type="button" whileTap={{ scale: 0.93 }} onClick={fetchAIPrice}
                disabled={!name.trim() || priceLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase font-bold text-white bg-[#C96A4B] disabled:opacity-40 transition">
                {priceLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {priceLoading ? "Estimating…" : "AI Estimate"}
              </motion.button>
            </div>

            <AnimatePresence>
              {unitPrice != null && !priceEditing && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center justify-between bg-white border border-[#EDE9DF] rounded-lg px-3 py-2">
                  <div>
                    <p className="font-bold text-sm text-[#1C1A17]">${unitPrice.toFixed(2)} / unit</p>
                    <p className="text-[10px] font-mono text-[#A8A29E]">{priceLabel}</p>
                  </div>
                  <button type="button" onClick={() => { setPriceInput(unitPrice.toFixed(2)); setPriceEditing(true); }}
                    className="p-1.5 rounded-md hover:bg-stone-100 transition">
                    <Pencil size={13} className="text-[#A8A29E]" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {priceEditing && (
              <div className="flex gap-2">
                <input type="number" step="0.01" min="0" value={priceInput}
                  onChange={e => setPriceInput(e.target.value)} placeholder="0.00"
                  className="flex-1 text-base border border-[#EDE9DF] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#C96A4B]/30" />
                <motion.button type="button" whileTap={{ scale: 0.93 }} onClick={applyManualPrice}
                  className="px-4 py-2 bg-[#C96A4B] text-white text-sm font-semibold rounded-lg">Set</motion.button>
              </div>
            )}

            {monthlyCost != null && (
              <div className="flex items-center justify-between bg-[#1C1A17] text-white rounded-lg px-4 py-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider opacity-60">Est. Monthly Cost</p>
                  <p className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>${monthlyCost.toFixed(2)}</p>
                </div>
                <p className="font-mono text-[9px] opacity-40 text-right">${unitPrice?.toFixed(2)} × {dailyUsage}/day × 30</p>
              </div>
            )}

            {unitPrice == null && !priceEditing && (
              <button type="button" onClick={() => { setPriceInput(""); setPriceEditing(true); }}
                className="text-[11px] font-mono text-[#A8A29E] hover:text-[#C96A4B] transition underline">
                Enter price manually instead
              </button>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block mb-1.5">Category</label>
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES.map(c => (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  className={["font-mono text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border transition-all",
                    category === c ? "bg-[#C96A4B] text-white border-transparent" : "bg-white text-[#A8A29E] border-[#EDE9DF]"].join(" ")}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Kid assignment */}
          {kids.length > 0 && (
            <div>
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block mb-1.5">Assign to Child (Optional)</label>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => setKidId("")}
                  className={["font-mono text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border transition-all",
                    !kidId ? "bg-[#C96A4B] text-white border-transparent" : "bg-white text-[#A8A29E] border-[#EDE9DF]"].join(" ")}>
                  Household
                </button>
                {kids.map(k => (
                  <button key={k.id} type="button" onClick={() => setKidId(k.id)}
                    className={["font-mono text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border transition-all",
                      kidId === k.id ? "text-white border-transparent" : "bg-white text-[#A8A29E] border-[#EDE9DF]"].join(" ")}
                    style={{ backgroundColor: kidId === k.id ? k.colorCode : undefined }}>
                    {k.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
            className="w-full py-3 bg-[#C96A4B] text-white font-semibold rounded-lg text-sm disabled:opacity-60">
            {loading ? "Adding..." : "Add Supply"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
