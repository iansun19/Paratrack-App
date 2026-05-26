"use client";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { X, Pipette } from "lucide-react";
import { request } from "@/lib/api/request";
import { memory } from "@eazo/sdk";

// Curated palette — 20 named swatches the user can pick, plus a free hex input
const SWATCHES = [
  "#C96A4B","#E07B5A","#D4956A","#D97706","#C4A63B",
  "#508D76","#3B8A6E","#5B9BD5","#4A7EC4","#6A72C9",
  "#8A7BA7","#A066B0","#C46A9A","#D46085","#C46070",
  "#5A6A7A","#7A8A9A","#2D3B4A","#6B5F52","#3D3530",
];

type Kid = { id: string; name: string; birthDate?: string | null; colorCode: string; favorites?: Record<string, string[]> | null };

function isValidHex(v: string) { return /^#[0-9A-Fa-f]{6}$/.test(v); }

export function AddKidModal({ onClose, onAdded }: { onClose: () => void; onAdded: (k: Kid) => void }) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [colorCode, setColorCode] = useState(SWATCHES[4]);
  const [hexInput, setHexInput] = useState(SWATCHES[4]);
  const [loading, setLoading] = useState(false);
  const nativePickerRef = useRef<HTMLInputElement>(null);

  function applyColor(hex: string) {
    setColorCode(hex);
    setHexInput(hex);
  }

  function handleHexChange(raw: string) {
    const v = raw.startsWith("#") ? raw : `#${raw}`;
    setHexInput(v);
    if (isValidHex(v)) setColorCode(v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await request("/api/kids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, birthDate: birthDate || null, colorCode }),
      });
      if (res.ok) {
        const data = await res.json();
        memory.reportAction({
          content: `User added child profile: "${name}"`,
          event_type: "create",
          page: "kids",
          metadata: { type: "add_kid", kid_id: data.kid.id },
        }).catch(() => {});
        onAdded(data.kid);
      }
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative z-10 bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-lg max-h-[92svh] overflow-y-auto"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>Add Child Profile</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block mb-1.5">Child&apos;s Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="e.g. Spence"
              className="w-full text-base border border-[#EDE9DF] rounded-lg px-3 py-2.5 bg-[#FDFBF7] focus:outline-none focus:ring-2 focus:ring-[#C96A4B]/30"
            />
          </div>

          {/* Birth date */}
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block mb-1.5">Birth Date (Optional)</label>
            <input
              type="date"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              className="w-full text-base border border-[#EDE9DF] rounded-lg px-3 py-2.5 bg-[#FDFBF7] focus:outline-none focus:ring-2 focus:ring-[#C96A4B]/30"
            />
          </div>

          {/* Color picker */}
          <div className="space-y-3">
            <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block">Profile Color</label>

            {/* Preview strip */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-[#EDE9DF] bg-[#FDFBF7]">
              <div
                className="w-10 h-10 rounded-full shrink-0 shadow-sm transition-colors duration-150"
                style={{ backgroundColor: colorCode }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-[#1C1A17] truncate">{name || "Child"}</p>
                <p className="font-mono text-[10px] text-[#A8A29E] uppercase">{colorCode}</p>
              </div>
              {/* Native color input as a small eyedropper button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => nativePickerRef.current?.click()}
                  className="w-8 h-8 rounded-lg border border-[#EDE9DF] bg-white flex items-center justify-center hover:bg-stone-50 transition"
                  title="Open color picker"
                >
                  <Pipette size={14} className="text-[#57534E]" />
                </button>
                <input
                  ref={nativePickerRef}
                  type="color"
                  value={colorCode}
                  onChange={e => applyColor(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  tabIndex={-1}
                />
              </div>
            </div>

            {/* Swatch grid */}
            <div className="grid grid-cols-10 gap-1.5">
              {SWATCHES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => applyColor(c)}
                  className="w-full aspect-square rounded-full border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: colorCode === c ? "#1C1A17" : "transparent",
                    boxShadow: colorCode === c ? "0 0 0 2px white inset" : "none",
                  }}
                />
              ))}
            </div>

            {/* Hex input */}
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-md shrink-0 border border-[#EDE9DF]"
                style={{ backgroundColor: isValidHex(hexInput) ? hexInput : "#EDE9DF" }}
              />
              <input
                type="text"
                value={hexInput}
                onChange={e => handleHexChange(e.target.value)}
                placeholder="#C96A4B"
                maxLength={7}
                className="flex-1 text-sm font-mono border border-[#EDE9DF] rounded-lg px-3 py-2 bg-[#FDFBF7] focus:outline-none focus:ring-2 focus:ring-[#C96A4B]/30 uppercase"
              />
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading || !name.trim()}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3 text-white font-semibold rounded-lg text-sm disabled:opacity-60 transition-colors"
            style={{ backgroundColor: colorCode }}
          >
            {loading ? "Creating..." : `Create ${name || "Profile"}`}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
