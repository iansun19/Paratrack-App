"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw, CheckCircle, AlertCircle, Loader2, ExternalLink, Maximize2 } from "lucide-react";

interface NeoclawBrowserModalProps {
  serviceSlug: string;
  serviceName: string;
  serviceColor: string;
  startUrl: string;
  onConfirmConnected: (finalUrl: string) => void;
  onClose: () => void;
}

type ViewerState = "connecting" | "connected" | "disconnected" | "error" | "confirming" | "done";

const NEOCLAW_BASE = process.env.NEXT_PUBLIC_NEOCLAW_BASE ?? "https://neoclaw-admin-us-west-1.securebrowser.com";
const NEOCLAW_TOKEN = process.env.NEXT_PUBLIC_NEOCLAW_BROWSER_TOKEN ?? "";

/**
 * Uses @novnc/novnc RFB over WebSocket to embed the NeoClaw remote browser
 * without any iframe — bypasses X-Frame-Options entirely.
 *
 * WebSocket URL: wss://<host>/websockify?token=<token>
 * After connecting, navigates the remote browser to `startUrl` via the
 * NeoClaw navigate API.
 */
export function NeoclawBrowserModal({
  serviceName,
  serviceColor,
  startUrl,
  onConfirmConnected,
  onClose,
}: NeoclawBrowserModalProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<unknown>(null);
  const [viewerState, setViewerState] = useState<ViewerState>("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const wsUrl = NEOCLAW_TOKEN
    ? `wss://${new URL(NEOCLAW_BASE).hostname}/websockify?token=${encodeURIComponent(NEOCLAW_TOKEN)}`
    : "";

  const connect = useCallback(async () => {
    if (!wsUrl || !canvasRef.current) return;
    setViewerState("connecting");
    setErrorMsg("");

    try {
      // Lazy-load to avoid SSR issues — @novnc uses browser globals
      const { default: RFB } = await import("@novnc/novnc/core/rfb.js");

      // Clean up any previous instance
      if (rfbRef.current) {
        try { (rfbRef.current as { disconnect: () => void }).disconnect(); } catch {}
        rfbRef.current = null;
      }

      const rfb = new RFB(canvasRef.current, wsUrl, { credentials: {} });
      rfb.scaleViewport = true;
      rfb.resizeSession = true;
      rfb.background = "#1a1a1a";

      rfb.addEventListener("connect", async () => {
        setViewerState("connected");
        // Ask the remote browser to navigate to the service login URL
        try {
          await fetch(`${NEOCLAW_BASE}/api/neoclaw-browser/navigate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: NEOCLAW_TOKEN, url: startUrl }),
          });
        } catch { /* navigate endpoint may not exist; user types URL manually */ }
      });

      rfb.addEventListener("disconnect", (e: Event & { detail?: { clean: boolean } }) => {
        rfbRef.current = null;
        if (e.detail?.clean) {
          setViewerState("disconnected");
        } else {
          setViewerState("error");
          setErrorMsg("Connection lost. The remote browser session may have timed out.");
        }
      });

      rfb.addEventListener("credentialsrequired", () => {
        setViewerState("error");
        setErrorMsg("VNC authentication failed — verify the browser token.");
      });

      rfbRef.current = rfb;
    } catch (err: unknown) {
      console.error("[NeoClaw RFB]", err);
      setViewerState("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to initialise VNC client");
    }
  }, [wsUrl, startUrl]);

  useEffect(() => {
    if (!NEOCLAW_TOKEN) {
      setViewerState("error");
      setErrorMsg("NEXT_PUBLIC_NEOCLAW_BROWSER_TOKEN is not set.");
      return;
    }
    connect();
    return () => {
      if (rfbRef.current) {
        try { (rfbRef.current as { disconnect: () => void }).disconnect(); } catch {}
        rfbRef.current = null;
      }
    };
  }, [connect]);

  async function handleConfirm() {
    setViewerState("confirming");
    let domain = startUrl;
    try { domain = new URL(startUrl).hostname.replace("www.", ""); } catch {}
    if (rfbRef.current) {
      try { (rfbRef.current as { disconnect: () => void }).disconnect(); } catch {}
      rfbRef.current = null;
    }
    await new Promise(r => setTimeout(r, 300));
    setViewerState("done");
    setTimeout(() => onConfirmConnected(domain), 600);
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="relative flex flex-col bg-white rounded-t-2xl mt-auto w-full shadow-2xl"
          style={{ height: isFullscreen ? "100svh" : "92svh" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#EDE9DF] shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ backgroundColor: serviceColor }}>
              {serviceName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#1C1A17]">Connect {serviceName}</p>
              <p className="text-[10px] font-mono text-[#A8A29E] truncate">{startUrl}</p>
            </div>
            <div className="flex items-center gap-1">
              {(viewerState === "error" || viewerState === "disconnected") && (
                <button onClick={connect} className="p-1.5 rounded-lg hover:bg-stone-100" title="Retry">
                  <RefreshCw size={15} className="text-[#A8A29E]" />
                </button>
              )}
              <button onClick={() => setIsFullscreen(f => !f)} className="p-1.5 rounded-lg hover:bg-stone-100" title="Toggle fullscreen">
                <Maximize2 size={15} className="text-[#A8A29E]" />
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100">
                <X size={18} className="text-[#57534E]" />
              </button>
            </div>
          </div>

          {/* Status bar */}
          <div className="px-4 py-2 border-b border-[#EDE9DF] shrink-0" style={{
            backgroundColor: viewerState === "connected" ? "#FFFBEB"
              : viewerState === "error" ? "#FEF2F2" : "#F9FAFB"
          }}>
            {viewerState === "connecting" && (
              <div className="flex items-center gap-2 text-[11px] text-[#57534E] font-mono">
                <Loader2 size={11} className="animate-spin text-[#C96A4B]" />
                Connecting via secure VNC…
              </div>
            )}
            {viewerState === "connected" && (
              <p className="text-[11px] text-amber-700 font-mono">
                Sign in to <strong>{serviceName}</strong> in the browser below, then tap <strong>Confirm Connected</strong>.
              </p>
            )}
            {viewerState === "error" && (
              <div className="flex items-center gap-2 text-[11px] text-red-600 font-mono">
                <AlertCircle size={11} /> {errorMsg}
              </div>
            )}
            {viewerState === "disconnected" && (
              <div className="flex items-center gap-2 text-[11px] text-[#57534E] font-mono">
                <AlertCircle size={11} /> Session disconnected — tap retry to reconnect.
              </div>
            )}
          </div>

          {/* VNC canvas */}
          <div className="flex-1 relative overflow-hidden bg-[#1a1a1a]">
            <div ref={canvasRef} className="w-full h-full" />

            {viewerState === "connecting" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#111]/80 z-10">
                <Loader2 size={28} className="animate-spin" style={{ color: serviceColor }} />
                <p className="text-sm text-stone-300 font-mono">Establishing VNC connection…</p>
              </div>
            )}

            {viewerState === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#111]/90 z-10 px-8 text-center">
                <AlertCircle size={36} className="text-red-400" />
                <p className="text-sm font-bold text-white">Connection failed</p>
                <p className="text-xs text-stone-400 max-w-xs leading-relaxed">{errorMsg}</p>
                <div className="flex flex-col gap-2 w-full max-w-xs">
                  <button onClick={connect}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold"
                    style={{ backgroundColor: serviceColor }}>
                    <RefreshCw size={14} /> Retry connection
                  </button>
                  <a href={startUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-stone-600 text-stone-300 text-xs font-mono">
                    <ExternalLink size={12} /> Open {serviceName} in new tab
                  </a>
                </div>
              </div>
            )}

            {viewerState === "done" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white z-20">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.05 }}>
                  <CheckCircle size={52} className="text-[#508D76]" />
                </motion.div>
                <p className="text-xl font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>
                  {serviceName} connected!
                </p>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-[#EDE9DF] shrink-0 bg-white"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleConfirm}
              disabled={viewerState !== "connected"}
              className="w-full py-3 text-white font-semibold text-sm rounded-xl disabled:opacity-40 transition-colors"
              style={{ backgroundColor: serviceColor }}
            >
              {viewerState === "connecting" ? "Connecting…"
                : viewerState === "confirming" ? "Saving connection…"
                : viewerState === "done" ? "Connected ✓"
                : viewerState === "error" ? "Connection failed — retry above"
                : `Confirm ${serviceName} Connected`}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
