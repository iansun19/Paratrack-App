"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

export interface TourStep {
  /** CSS selector of the element to highlight — null for a centered modal step */
  target: string | null;
  title: string;
  description: string;
  /** Where to render the tooltip relative to the target: auto-detected if omitted */
  placement?: "top" | "bottom" | "left" | "right" | "center";
}

interface TourOverlayProps {
  tourId: string; // unique key stored in localStorage
  steps: TourStep[];
  /** accent color matching the page */
  color?: string;
}

const LS_PREFIX = "paratrack-tour-done:";

function getRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  return el ? el.getBoundingClientRect() : null;
}

const PAD = 8; // px spotlight padding

export function TourOverlay({ tourId, steps, color = "#C96A4B" }: TourOverlayProps) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Show tour once per tourId
  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(`${LS_PREFIX}${tourId}`);
    if (!done) {
      // Small delay so the page has rendered
      const t = setTimeout(() => setActive(true), 600);
      return () => clearTimeout(t);
    }
  }, [tourId]);

  const currentStep = steps[step];

  // Update spotlight rect whenever step changes
  useEffect(() => {
    if (!active || !currentStep?.target) { setRect(null); return; }
    const update = () => setRect(getRect(currentStep.target!));
    update();
    const obs = new ResizeObserver(update);
    const el = document.querySelector(currentStep.target);
    if (el) obs.observe(el);
    window.addEventListener("scroll", update, true);
    return () => { obs.disconnect(); window.removeEventListener("scroll", update, true); };
  }, [active, step, currentStep]);

  const dismiss = useCallback(() => {
    localStorage.setItem(`${LS_PREFIX}${tourId}`, "1");
    setActive(false);
  }, [tourId]);

  const next = useCallback(() => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else dismiss();
  }, [step, steps.length, dismiss]);

  const prev = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  if (!active) return null;

  // Spotlight geometry
  const spotX = rect ? rect.left - PAD : 0;
  const spotY = rect ? rect.top - PAD : 0;
  const spotW = rect ? rect.width + PAD * 2 : 0;
  const spotH = rect ? rect.height + PAD * 2 : 0;

  // Tooltip placement
  const placement = currentStep.placement ?? (rect ? "bottom" : "center");
  const vw = typeof window !== "undefined" ? window.innerWidth : 375;
  const vh = typeof window !== "undefined" ? window.innerHeight : 812;

  let tooltipStyle: React.CSSProperties = {};
  const tooltipW = Math.min(vw - 32, 320);

  if (!rect || placement === "center") {
    tooltipStyle = { top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: tooltipW };
  } else if (placement === "bottom") {
    tooltipStyle = { top: Math.min(spotY + spotH + 12, vh - 180), left: Math.max(16, Math.min(spotX + spotW / 2 - tooltipW / 2, vw - tooltipW - 16)), width: tooltipW };
  } else if (placement === "top") {
    tooltipStyle = { top: Math.max(16, spotY - 160), left: Math.max(16, Math.min(spotX + spotW / 2 - tooltipW / 2, vw - tooltipW - 16)), width: tooltipW };
  } else if (placement === "left") {
    tooltipStyle = { top: Math.max(16, spotY + spotH / 2 - 80), left: Math.max(16, spotX - tooltipW - 12), width: tooltipW };
  } else {
    tooltipStyle = { top: Math.max(16, spotY + spotH / 2 - 80), left: Math.min(spotX + spotW + 12, vw - tooltipW - 16), width: tooltipW };
  }

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Dark overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={next}>
        <defs>
          <mask id={`tour-mask-${tourId}`}>
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={spotX} y={spotY}
                width={spotW} height={spotH}
                rx={10} ry={10}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%" height="100%"
          fill="rgba(0,0,0,0.55)"
          mask={`url(#tour-mask-${tourId})`}
        />
      </svg>

      {/* Spotlight ring */}
      {rect && (
        <motion.div
          className="absolute rounded-xl pointer-events-none"
          style={{
            left: spotX, top: spotY,
            width: spotW, height: spotH,
            boxShadow: `0 0 0 3px ${color}`,
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="absolute pointer-events-auto bg-white rounded-2xl shadow-2xl p-5 space-y-3"
          style={tooltipStyle}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${color}20` }}>
                <Sparkles size={12} style={{ color }} />
              </div>
              <h3 className="text-sm font-bold text-[#1C1A17] leading-snug"
                style={{ fontFamily: "var(--font-heading)" }}>
                {currentStep.title}
              </h3>
            </div>
            <button onClick={dismiss}
              className="shrink-0 w-6 h-6 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition">
              <X size={12} className="text-[#57534E]" />
            </button>
          </div>

          {/* Body */}
          <p className="text-xs text-[#57534E] leading-relaxed">{currentStep.description}</p>

          {/* Step indicator + nav */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full transition-colors"
                  style={{ backgroundColor: i === step ? color : "#EDE9DF" }} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button onClick={prev}
                  className="flex items-center gap-1 font-mono text-[10px] uppercase font-bold text-[#A8A29E] hover:text-[#57534E] transition">
                  <ChevronLeft size={12} /> Back
                </button>
              )}
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={next}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-mono text-[10px] uppercase font-bold"
                style={{ backgroundColor: color }}
              >
                {step < steps.length - 1 ? <><span>Next</span><ChevronRight size={12} /></> : <span>Got it</span>}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Reset all tour completions — useful for testing */
export function resetAllTours() {
  if (typeof window === "undefined") return;
  Object.keys(localStorage)
    .filter(k => k.startsWith(LS_PREFIX))
    .forEach(k => localStorage.removeItem(k));
}
