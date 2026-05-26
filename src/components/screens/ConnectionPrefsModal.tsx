"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Eye, EyeOff } from "lucide-react";
import { request } from "@/lib/api/request";

interface ConnectionPrefsModalProps {
  mode: "first-time" | "edit";
  platform: string; // e.g. "Gmail"
  accountLabel: string; // e.g. "mail.google.com"
  slug: string;
  initialPrefs?: string;
  serviceColor: string;
  onSave: (prefs: string) => void;
  onDisconnect?: () => void;
  onClose: () => void;
}

const PLACEHOLDER =
  `Examples:\n• Pay attention to school newsletters from Meadowview Academy\n• Ignore marketing emails and promotions\n• Flag anything mentioning Ava or Liam\n• Alert me to any events requiring supplies or RSVPs`;

export function ConnectionPrefsModal({
  mode,
  platform,
  accountLabel,
  slug,
  initialPrefs = "",
  serviceColor,
  onSave,
  onDisconnect,
  onClose,
}: ConnectionPrefsModalProps) {
  const [prefs, setPrefs] = useState(initialPrefs);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await request("/api/browser-connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_prefs", slug, prefs }),
      });
      onSave(prefs);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative z-10 bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl overflow-hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[#EDE9DF]">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ backgroundColor: serviceColor }}
            >
              {platform.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-[#1C1A17]">
                {mode === "first-time" ? `${platform} connected!` : `Manage ${platform}`}
              </p>
              <p className="text-[10px] font-mono text-[#A8A29E] truncate">{accountLabel}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100">
              <X size={18} className="text-[#57534E]" />
            </button>
          </div>

          <div className="px-5 py-5 space-y-5">
            {/* AI context section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#C96A4B]" />
                <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] font-bold">
                  What should Paratrack AI pay attention to?
                </label>
              </div>
              <p className="text-[11px] text-[#A8A29E]">
                Tell the AI what to focus on or ignore in this account. This guides how it summarizes emails, surfaces events, and flags supplies.
              </p>
              <textarea
                value={prefs}
                onChange={e => setPrefs(e.target.value)}
                placeholder={PLACEHOLDER}
                rows={6}
                className="w-full text-sm border border-[#EDE9DF] rounded-xl px-3 py-3 bg-[#FDFBF7] resize-none focus:outline-none focus:ring-2 focus:ring-[#C96A4B]/30 text-[#1C1A17] placeholder:text-[#C8C2BA] leading-relaxed"
              />
            </div>

            {/* Examples row */}
            <div className="flex flex-wrap gap-1.5">
              {["School newsletters only", "Ignore promotions", "Flag supply requests", "Alert on event RSVPs"].map(ex => (
                <button
                  key={ex}
                  onClick={() => setPrefs(p => p ? `${p}\n• ${ex}` : `• ${ex}`)}
                  className="font-mono text-[10px] bg-stone-100 border border-[#EDE9DF] text-[#57534E] px-2.5 py-1 rounded-full hover:bg-stone-200 transition"
                >
                  + {ex}
                </button>
              ))}
            </div>

            {/* Privacy note */}
            <div className="flex items-start gap-2 bg-stone-50 rounded-xl p-3">
              <Eye size={14} className="text-[#A8A29E] mt-0.5 shrink-0" />
              <p className="text-[10px] text-[#A8A29E] leading-relaxed">
                Paratrack only reads the context you specify. Your credentials stay in the secure browser — they are never stored in Paratrack.
              </p>
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-5 pb-5 flex flex-col gap-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 text-white font-semibold text-sm rounded-xl disabled:opacity-60"
              style={{ backgroundColor: serviceColor }}
            >
              {saving ? "Saving…" : mode === "first-time" ? "Save & Start Using" : "Save Changes"}
            </motion.button>
            {mode === "edit" && onDisconnect && (
              <button
                onClick={onDisconnect}
                className="w-full py-2.5 text-sm font-mono uppercase tracking-wider text-red-500 hover:text-red-600 transition font-bold"
              >
                Disconnect {platform}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
