"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

export interface GuideStep {
  title: string;
  description: string;
  /** Optional emoji or icon identifier */
  icon?: string;
}

interface GuideOverlayProps {
  guideId: string; // unique key stored in localStorage
  steps: GuideStep[];
  /** accent color matching the page */
  color?: string;
}

const LS_PREFIX = "paratrack-guide-done:";

export function GuideOverlay({ guideId, steps, color = "#C96A4B" }: GuideOverlayProps) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  // Show guide once per guideId
  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(`${LS_PREFIX}${guideId}`);
    if (!done) {
      // Small delay so the page has rendered
      const t = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(t);
    }
  }, [guideId]);

  const dismiss = useCallback(() => {
    localStorage.setItem(`${LS_PREFIX}${guideId}`, "1");
    setActive(false);
  }, [guideId]);

  const next = useCallback(() => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else dismiss();
  }, [step, steps.length, dismiss]);

  const prev = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  if (!active) return null;

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 pointer-events-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
        onClick={next}
      />

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="relative pointer-events-auto bg-white rounded-2xl shadow-2xl p-6 space-y-4 max-w-md w-full"
          style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {/* Close button */}
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition z-10"
          >
            <X size={13} className="text-[#57534E]" />
          </button>

          {/* Icon */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xl"
              style={{ backgroundColor: `${color}15`, border: `2px solid ${color}30` }}
            >
              {currentStep.icon ? (
                <span>{currentStep.icon}</span>
              ) : (
                <Sparkles size={18} style={{ color }} />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-[#1C1A17] leading-tight" style={{ fontFamily: "var(--font-heading)" }}>
                {currentStep.title}
              </h3>
              <div className="flex gap-1.5 mt-1.5">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className="h-1 rounded-full transition-all"
                    style={{
                      width: i === step ? "24px" : "8px",
                      backgroundColor: i === step ? color : "#EDE9DF",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Body */}
          <p className="text-sm text-[#57534E] leading-relaxed pl-[52px]">
            {currentStep.description}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2 pl-[52px]">
            <div className="flex gap-2">
              {step > 0 && (
                <button
                  onClick={prev}
                  className="flex items-center gap-1 font-mono text-[10px] uppercase font-bold text-[#A8A29E] hover:text-[#57534E] transition"
                >
                  <ChevronLeft size={13} /> Back
                </button>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={next}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white font-mono text-[11px] uppercase font-bold tracking-wide"
              style={{ backgroundColor: color }}
            >
              {step < steps.length - 1 ? (
                <>
                  <span>Next</span>
                  <ChevronRight size={13} />
                </>
              ) : (
                <span>Got it</span>
              )}
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Reset all guide completions — useful for testing */
export function resetAllGuides() {
  if (typeof window === "undefined") return;
  Object.keys(localStorage)
    .filter(k => k.startsWith(LS_PREFIX))
    .forEach(k => localStorage.removeItem(k));
}
