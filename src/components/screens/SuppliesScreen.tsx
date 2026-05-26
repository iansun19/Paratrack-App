"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, ShoppingCart, Minus, Trash2, Check, X, Pencil, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { request } from "@/lib/api/request";
import { AddSupplyModal } from "./AddSupplyModal";
import { memory } from "@eazo/sdk";
import { TourOverlay } from "@/components/tour/TourOverlay";
import { GuideOverlay, GuideStep } from "@/components/tour/GuideOverlay";

const SUPPLIES_GUIDE: GuideStep[] = [
  { icon: "🧴", title: "Predictive Supply Tracker", description: "Track everything you regularly use — diapers, formula, wipes, medicine, snacks. Paratrack predicts when you'll run out and adds alerts to your calendar." },
  { icon: "➕", title: "Add a Supply", description: "Tap '+ Add Supply' to add a new item. Set the current stock, how many you go through per day, and an alert threshold — the day counter calculates automatically." },
  { icon: "🎨", title: "Color-Coded by Child", description: "Each supply card uses the assigned child's color. Household supplies appear in neutral gray. Red = critical, amber = restock soon." },
  { icon: "🔢", title: "Day Counter", description: "The box in the top-right of each card shows exactly how many days of stock remain. It updates live as you log usage." },
  { icon: "✅", title: "Use & Restock", description: "Tap '− Use One' to log a single use. Tap 'Mark Restocked' to enter how many you added. Or delete the supply if it was a one-time item." },
];

type Kid = { id: string; name: string; colorCode: string };
type Supply = {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  lowThreshold: number;
  dailyUsage?: number | null;
  unitPrice?: number | null;
  predictedRunOut?: string | null;
  kidId?: string | null;
};

function getDaysLeft(supply: Supply): number {
  const usage = supply.dailyUsage && supply.dailyUsage > 0 ? supply.dailyUsage : null;
  if (usage) return Math.max(0, Math.floor(supply.currentStock / usage));
  if (supply.predictedRunOut) {
    return Math.max(0, Math.ceil((new Date(supply.predictedRunOut).getTime() - Date.now()) / 86400000));
  }
  return Math.max(0, Math.ceil(supply.currentStock / 2));
}

function getLevel(s: Supply) {
  const days = getDaysLeft(s);
  if (days <= 2 || s.currentStock <= s.lowThreshold) return "critical";
  if (days <= 5 || s.currentStock <= s.lowThreshold * 2) return "warning";
  return "healthy";
}

/** Returns the display color for a supply card:
 *  - critical/warning states → semantic red/amber (override)
 *  - healthy + kid assigned  → kid's own color
 *  - healthy + household     → neutral stone
 */
function getSupplyColor(s: Supply, kids: Kid[]): string {
  const level = getLevel(s);
  if (level === "critical") return "#DC2626";
  if (level === "warning") return "#D97706";
  const kid = kids.find(k => k.id === s.kidId);
  return kid?.colorCode ?? "#78716C"; // stone-500 for household
}

/** Compact days-remaining dial */
function BudgetHeader({ supplies, kids }: { supplies: Supply[]; kids: Kid[] }) {
  const priced = supplies.filter(s => s.unitPrice != null && (s.dailyUsage ?? 0) > 0);
  if (priced.length === 0) return null;
  const totalMonthly = priced.reduce((sum, s) => sum + (s.unitPrice! * (s.dailyUsage ?? 1) * 30), 0);
  const kidTotals: Record<string, number> = {};
  let householdTotal = 0;
  for (const s of priced) {
    const mc = s.unitPrice! * (s.dailyUsage ?? 1) * 30;
    if (s.kidId) kidTotals[s.kidId] = (kidTotals[s.kidId] ?? 0) + mc;
    else householdTotal += mc;
  }
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-[#1C1A17] text-white p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest opacity-50">Expected Monthly Spend</p>
          <p className="text-4xl font-bold mt-1" style={{ fontFamily: "var(--font-heading)" }}>${totalMonthly.toFixed(2)}</p>
          <p className="font-mono text-[10px] opacity-40 mt-1">{priced.length} item{priced.length !== 1 ? "s" : ""} with pricing</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <ShoppingCart size={18} className="text-white/70" />
        </div>
      </div>
      {(Object.keys(kidTotals).length > 0 || householdTotal > 0) && (
        <div className="border-t border-white/10 pt-3 space-y-2">
          <p className="font-mono text-[9px] uppercase tracking-widest opacity-40">Breakdown</p>
          {Object.entries(kidTotals).map(([kidId, total]) => {
            const kid = kids.find(k => k.id === kidId);
            return (
              <div key={kidId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: kid?.colorCode ?? "#C96A4B" }} />
                  <span className="text-xs font-medium opacity-80">{kid?.name ?? "Unknown"}</span>
                </div>
                <span className="font-mono text-xs font-bold">${total.toFixed(2)}/mo</span>
              </div>
            );
          })}
          {householdTotal > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-stone-400" />
                <span className="text-xs font-medium opacity-80">Household</span>
              </div>
              <span className="font-mono text-xs font-bold">${householdTotal.toFixed(2)}/mo</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function DayCounter({ days, color }: { days: number; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl border-2 shrink-0"
      style={{ borderColor: color, backgroundColor: `${color}10` }}>
      <span className="text-2xl font-bold leading-none" style={{ color, fontFamily: "var(--font-heading)" }}>
        {days > 99 ? "99+" : days}
      </span>
      <span className="font-mono text-[8px] uppercase tracking-widest mt-0.5" style={{ color }}>
        {days === 1 ? "day" : "days"}
      </span>
    </div>
  );
}

export function SuppliesScreen() {
  const [kids, setKids] = useState<Kid[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [restockingId, setRestockingId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [editPriceId, setEditPriceId] = useState<string | null>(null);
  const [editPriceInput, setEditPriceInput] = useState("");
  const [editPriceLoading, setEditPriceLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      request("/api/kids").then(r => r.ok ? r.json() : null).then(d => d && setKids(d.kids)),
      request("/api/supplies").then(r => r.ok ? r.json() : null).then(d => d && setSupplies(d.supplies)),
    ]).finally(() => setLoading(false));
  }, []);

  async function handleUseOne(supply: Supply) {
    const newStock = Math.max(0, supply.currentStock - 1);
    const res = await request("/api/supplies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: supply.id, currentStock: newStock }),
    });
    if (res.ok) {
      const data = await res.json();
      setSupplies(prev => prev.map(s => s.id === supply.id ? data.supply : s));
      memory.reportAction({ content: `User decremented "${supply.name}" stock to ${newStock}`, event_type: "update", page: "supplies", metadata: { type: "use_supply", supply_id: supply.id, new_stock: newStock } }).catch(() => {});
    }
  }

  async function handleRestock(supply: Supply, qty: number) {
    const newStock = supply.currentStock + qty;
    const res = await request("/api/supplies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: supply.id, currentStock: newStock }),
    });
    if (res.ok) {
      const data = await res.json();
      setSupplies(prev => prev.map(s => s.id === supply.id ? data.supply : s));
      setRestockingId(null);
      setRestockQty("");
      memory.reportAction({ content: `User restocked "${supply.name}" +${qty} (now ${newStock})`, event_type: "update", page: "supplies", metadata: { type: "restock_supply", supply_id: supply.id, new_stock: newStock } }).catch(() => {});
    }
  }

  async function handleDelete(supply: Supply) {
    const res = await request(`/api/supplies?id=${supply.id}`, { method: "DELETE" });
    if (res.ok) {
      setSupplies(prev => prev.filter(s => s.id !== supply.id));
      setRestockingId(null);
      memory.reportAction({ content: `User deleted supply "${supply.name}"`, event_type: "delete", page: "supplies", metadata: { type: "delete_supply", supply_id: supply.id } }).catch(() => {});
    }
  }

  async function fetchAIPriceForSupply(supply: Supply) {
    setEditPriceLoading(true);
    try {
      const res = await request("/api/supplies/price-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: supply.name, category: supply.category }),
      });
      const data = await res.json() as { price: number | null; label: string };
      if (data.price != null) {
        setEditPriceInput(data.price.toFixed(2));
      } else {
        // Pre-fill the label as placeholder hint in the input
        setEditPriceInput("");
        alert(`AI: ${data.label}`);
      }
    } catch (err) {
      alert(`Price lookup failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setEditPriceLoading(false); }
  }

  async function saveEditedPrice(supply: Supply) {
    const v = parseFloat(editPriceInput);
    if (isNaN(v) || v < 0) return;
    const res = await request("/api/supplies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: supply.id, unitPrice: v }),
    });
    if (res.ok) {
      const data = await res.json();
      setSupplies(prev => prev.map(s => s.id === supply.id ? data.supply : s));
    }
    setEditPriceId(null);
    setEditPriceInput("");
  }

  if (loading) return (
    <div className="px-5 py-8 max-w-3xl mx-auto space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-32" />)}
    </div>
  );

  // Sort: critical first, then warning, then healthy
  const sorted = [...supplies].sort((a, b) => {
    const order = { critical: 0, warning: 1, healthy: 2 };
    return order[getLevel(a)] - order[getLevel(b)];
  });

  return (
    <div className="min-h-svh bg-[#FDFBF7] px-5 py-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Back + header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-[#57534E] hover:text-[#C96A4B] transition">
            <ArrowLeft size={16} />Back to Home
          </Link>
          <span className="font-mono text-[10px] text-[#A8A29E] uppercase">AUTO-RESTOCK HUB</span>
        </div>

        <div className="space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#57534E]">PREDICTIVE SHOPPING</span>
          <div className="h-px bg-[#EDE9DF]" /><div className="h-px bg-[#EDE9DF] mt-0.5" />
          <div className="flex items-center justify-between pt-3">
            <h1 className="text-3xl font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>Supply Tracker</h1>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAdd(true)}
              data-tour="supply-add"
              className="flex items-center gap-1.5 bg-[#C96A4B] text-white text-xs font-mono uppercase font-bold px-3 py-2 rounded-lg">
              <Plus size={14} />Add Supply
            </motion.button>
          </div>
        </div>

        <p className="text-xs text-[#57534E] leading-relaxed">
          Calculated from your daily usage rate. Tap <span className="font-mono font-bold">− USE</span> to log consumption. Alerts automatically appear in the Calendar.
        </p>

        {/* Budget header — shown when any supply has unit pricing */}
        <BudgetHeader supplies={supplies} kids={kids} />
        {sorted.length === 0 ? (
          <div className="rounded-xl bg-white border border-[#EDE9DF] p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#C96A4B]/10 flex items-center justify-center mx-auto">
              <ShoppingCart size={28} className="text-[#C96A4B]" />
            </div>
            <h3 className="text-xl font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>Track Your First Supply</h3>
            <p className="text-sm text-[#57534E] max-w-xs mx-auto">Add diapers, wipes, formula, snacks — set your daily usage and Paratrack predicts the exact day you'll run out.</p>
            <button onClick={() => setShowAdd(true)} className="bg-[#C96A4B] text-white text-sm font-semibold px-5 py-2.5 rounded-lg">
              Add First Supply
            </button>
          </div>
        ) : (
          <div data-tour="supply-list" className="space-y-4">
            {sorted.map((supply, idx) => {
              const kid = kids.find(k => k.id === supply.kidId);
              const level = getLevel(supply);
              const cardColor = getSupplyColor(supply, kids);
              const days = getDaysLeft(supply);
              const barWidth = Math.min(100, supply.dailyUsage && supply.dailyUsage > 0
                ? Math.min(100, (days / 14) * 100)
                : Math.min(100, (supply.currentStock / (supply.lowThreshold * 3)) * 100));

              // Run-out date label
              const runOutDate = supply.predictedRunOut
                ? new Date(supply.predictedRunOut + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : null;

              return (
                <motion.div
                  key={supply.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.07 }}
                  className="rounded-xl p-4 bg-white shadow-sm space-y-4"
                  style={{ borderLeft: `4px solid ${cardColor}` }}
                >
                  {/* Top row: label + day counter */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <span
                        className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border"
                        style={{ backgroundColor: `${cardColor}15`, color: cardColor, borderColor: `${cardColor}30` }}
                      >
                        {kid ? `${kid.name} • ${supply.category}` : `Household • ${supply.category}`}
                      </span>
                      <h4 className="font-bold text-sm text-[#1C1A17] mt-0.5">{supply.name}</h4>
                      <p className="text-[10px] text-[#A8A29E] font-mono">
                        {supply.dailyUsage && supply.dailyUsage > 0 ? `${supply.dailyUsage}/day` : "Usage not set"}
                        {" · "}
                        {supply.currentStock} in stock
                        {runOutDate ? ` · runs out ${runOutDate}` : ""}
                        {supply.unitPrice != null ? ` · ~$${(supply.unitPrice * (supply.dailyUsage ?? 1) * 30).toFixed(2)}/mo` : ""}
                      </p>
                      {/* Edit price inline button */}
                      {editPriceId !== supply.id && (
                        <button onClick={() => { setEditPriceId(supply.id); setEditPriceInput(supply.unitPrice?.toFixed(2) ?? ""); }}
                          className="flex items-center gap-1 font-mono text-[9px] uppercase text-[#A8A29E] hover:text-[#C96A4B] transition mt-1">
                          <Pencil size={10} />
                          {supply.unitPrice != null ? "Edit price" : "Add price"}
                        </button>
                      )}
                    </div>
                    <DayCounter days={days} color={cardColor} />
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: cardColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: idx * 0.07 }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-stone-400">Stock: {supply.currentStock}</span>
                      <span className="font-bold uppercase" style={{ color: cardColor }}>
                        {level === "critical" ? "Critical" : level === "warning" ? "Restock Soon" : "Level Safe"}
                      </span>
                    </div>
                  </div>

                  {/* Inline edit-price panel */}
                  <AnimatePresence>
                    {editPriceId === supply.id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="rounded-xl border border-[#EDE9DF] bg-[#FDFBF7] p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-[#57534E]">Unit Price (USD)</p>
                          <motion.button type="button" whileTap={{ scale: 0.93 }}
                            onClick={() => fetchAIPriceForSupply(supply)}
                            disabled={editPriceLoading}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-[9px] uppercase font-bold text-white bg-[#C96A4B] disabled:opacity-40">
                            {editPriceLoading ? <Loader2 size={9} className="animate-spin" /> : <Sparkles size={9} />}
                            AI Estimate
                          </motion.button>
                        </div>
                        <div className="flex gap-2">
                          <input type="number" step="0.01" min="0" value={editPriceInput}
                            onChange={e => setEditPriceInput(e.target.value)} placeholder="0.00"
                            className="flex-1 text-base border border-[#EDE9DF] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#C96A4B]/30" />
                          <motion.button type="button" whileTap={{ scale: 0.93 }} onClick={() => saveEditedPrice(supply)}
                            className="px-4 py-2 bg-[#C96A4B] text-white text-sm font-semibold rounded-lg">Save</motion.button>
                          <button type="button" onClick={() => setEditPriceId(null)}
                            className="px-3 py-2 border border-[#EDE9DF] rounded-lg hover:bg-stone-50">
                            <X size={14} className="text-[#A8A29E]" />
                          </button>
                        </div>
                        {editPriceInput && !isNaN(parseFloat(editPriceInput)) && (supply.dailyUsage ?? 0) > 0 && (
                          <p className="font-mono text-[10px] text-[#508D76] font-bold">
                            Est. monthly: ${(parseFloat(editPriceInput) * (supply.dailyUsage ?? 1) * 30).toFixed(2)}/mo
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Actions row */}
                  <div className="flex gap-2 pt-1">
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      onClick={() => handleUseOne(supply)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-stone-100 hover:bg-stone-200 border border-[#EDE9DF] text-[#57534E] font-mono text-[10px] font-bold uppercase tracking-wider rounded-lg transition"
                    >
                      <Minus size={12} /> Use One
                    </motion.button>

                    {(level === "critical" || level === "warning") && restockingId !== supply.id && (
                      <motion.button
                        whileTap={{ scale: 0.93 }}
                        onClick={() => { setRestockingId(supply.id); setRestockQty(""); }}
                        className="flex-1 py-2 text-white font-mono text-[10px] font-bold uppercase tracking-wider rounded-lg transition"
                        style={{ backgroundColor: level === "critical" ? "#DC2626" : "#D97706" }}
                      >
                        Mark Restocked
                      </motion.button>
                    )}
                  </div>

                  {/* Inline restock panel */}
                  <AnimatePresence>
                    {restockingId === supply.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 space-y-3 border-t border-[#EDE9DF] mt-1">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-[#57534E]">
                            How many did you restock?
                          </p>
                          <div className="flex gap-2 items-center">
                            <input
                              type="number"
                              min={1}
                              value={restockQty}
                              onChange={e => setRestockQty(e.target.value)}
                              placeholder="e.g. 48"
                              className="flex-1 text-base border border-[#EDE9DF] rounded-lg px-3 py-2 bg-[#FDFBF7] focus:outline-none focus:ring-2 focus:ring-[#C96A4B]/30"
                            />
                            <motion.button
                              whileTap={{ scale: 0.93 }}
                              onClick={() => handleRestock(supply, Number(restockQty) || supply.lowThreshold * 6)}
                              disabled={restockQty !== "" && Number(restockQty) <= 0}
                              className="px-4 py-2 rounded-lg text-white font-mono text-[10px] font-bold uppercase disabled:opacity-40"
                              style={{ backgroundColor: cardColor }}
                            >
                              <Check size={14} />
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.93 }}
                              onClick={() => { setRestockingId(null); setRestockQty(""); }}
                              className="px-3 py-2 rounded-lg bg-stone-100 text-[#57534E] font-mono text-[10px]"
                            >
                              <X size={14} />
                            </motion.button>
                          </div>
                          {/* Delete option */}
                          <button
                            onClick={() => handleDelete(supply)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 text-[#DC2626] font-mono text-[10px] uppercase tracking-wider hover:bg-red-50 rounded-lg transition border border-red-100"
                          >
                            <Trash2 size={11} /> Delete supply (one-time item)
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {showAdd && (
        <AddSupplyModal
          kids={kids}
          onClose={() => setShowAdd(false)}
          onAdded={s => { setSupplies(p => [s, ...p]); setShowAdd(false); }}
        />
      )}
      <GuideOverlay guideId="supplies" steps={SUPPLIES_GUIDE} color="#D97706" />
    </div>
  );
}
