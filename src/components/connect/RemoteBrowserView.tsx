"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Clipboard, ShieldCheck } from "lucide-react";
import { cn } from "@/utils/utils";
import { getRFB, type RfbClient } from "@/components/connect/rfb-import";

type RfbState = "connecting" | "connected" | "disconnected";

function buildPublicBrowserWsUrl(): string {
  const apiUrl = (process.env.NEXT_PUBLIC_NEOCLAW_API_URL ?? "").trim();
  const token = (process.env.NEXT_PUBLIC_NEOCLAW_API_KEY ?? "").trim();
  if (!apiUrl || !token) {
    console.warn(
      "[RemoteBrowserView] NEXT_PUBLIC_NEOCLAW_API_URL or NEXT_PUBLIC_NEOCLAW_API_KEY is empty — noVNC will not connect.",
    );
    return "";
  }
  const wsBase = apiUrl
    .replace(/^https:\/\//i, "wss://")
    .replace(/^http:\/\//i, "ws://")
    .replace(/\/+$/, "");
  return `${wsBase}/ws/public-browser?token=${encodeURIComponent(token)}`;
}

async function readHostClipboard(): Promise<string | null> {
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.readText === "function"
    ) {
      return await navigator.clipboard.readText();
    }
  } catch {
    // clipboard permission denied — silently swallow
  }
  return null;
}

interface RemoteBrowserViewProps {
  loginUrl: string;
  integrationName: string;
  onBack: () => void;
  onFinish: () => void;
}

export function RemoteBrowserView({
  loginUrl,
  integrationName,
  onBack,
  onFinish,
}: RemoteBrowserViewProps) {
  const screenRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<RfbClient | null>(null);
  const [rfbState, setRfbState] = useState<RfbState>("connecting");
  const wsUrl = buildPublicBrowserWsUrl();

  // Boot noVNC
  useEffect(() => {
    if (!wsUrl || !screenRef.current) return;
    let rfb: RfbClient | null = null;
    let cancelled = false;

    (async () => {
      try {
        const RFB = await getRFB();
        if (cancelled) return;
        rfb = new RFB(screenRef.current!, wsUrl, { shared: true });
        rfb.scaleViewport = true;
        rfb.resizeSession = true;
        rfb.background = "#111";

        rfb.addEventListener("connect", () => {
          if (cancelled) return;
          setRfbState("connected");
          // 600ms delay → set remote clipboard to the URL → Ctrl+L to focus
          // address bar → Ctrl+V to paste → Enter to navigate
          setTimeout(() => {
            if (!rfb) return;
            rfb.clipboardPasteFrom(loginUrl);
            // Ctrl+L — focus address bar
            rfb.sendKey(0xffe3, "ControlLeft", true);
            rfb.sendKey(0x006c, "KeyL", true);
            rfb.sendKey(0x006c, "KeyL", false);
            rfb.sendKey(0xffe3, "ControlLeft", false);
            // Small pause then Ctrl+V + Enter
            setTimeout(() => {
              if (!rfb) return;
              rfb.sendKey(0xffe3, "ControlLeft", true);
              rfb.sendKey(0x0076, "KeyV", true);
              rfb.sendKey(0x0076, "KeyV", false);
              rfb.sendKey(0xffe3, "ControlLeft", false);
              rfb.sendKey(0xff0d, "Enter", true);
              rfb.sendKey(0xff0d, "Enter", false);
            }, 150);
          }, 600);
        });

        rfb.addEventListener("disconnect", () => {
          if (!cancelled) setRfbState("disconnected");
        });

        rfbRef.current = rfb;
      } catch (err) {
        console.error("[RemoteBrowserView] RFB init error", err);
        if (!cancelled) setRfbState("disconnected");
      }
    })();

    return () => {
      cancelled = true;
      rfb?.disconnect();
      rfbRef.current = null;
    };
  }, [wsUrl, loginUrl]);

  // Ctrl+V capture → paste into remote clipboard
  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLDivElement>) => {
      const isPaste = (e.ctrlKey || e.metaKey) && e.key === "v";
      if (!isPaste || !rfbRef.current) return;
      e.preventDefault();
      const text = await readHostClipboard();
      if (text) rfbRef.current.clipboardPasteFrom(text);
    },
    [],
  );

  const handlePasteClick = useCallback(async () => {
    const text = await readHostClipboard();
    if (text && rfbRef.current) rfbRef.current.clipboardPasteFrom(text);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#111]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#1a1a1a] border-b border-white/10 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-mono uppercase tracking-wider transition"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="flex-1 flex items-center justify-center">
          <span className="text-white/60 text-xs font-mono truncate max-w-xs">
            {integrationName} — remote browser
          </span>
        </div>

        {/* State badge */}
        <span
          className={cn(
            "text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full",
            rfbState === "connected"
              ? "bg-emerald-500/20 text-emerald-400"
              : rfbState === "connecting"
                ? "bg-amber-500/20 text-amber-400"
                : "bg-red-500/20 text-red-400",
          )}
        >
          {rfbState}
        </span>

        {/* Paste button */}
        <button
          onClick={handlePasteClick}
          title="Paste from clipboard into remote browser"
          className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition"
        >
          <Clipboard size={14} />
        </button>

        {/* Finished logging in */}
        {rfbState === "connected" && (
          <button
            onClick={onFinish}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg transition"
          >
            <Check size={12} strokeWidth={3} /> Finished logging in
          </button>
        )}
      </div>

      {/* noVNC canvas area */}
      <div
        ref={screenRef}
        className="flex-1 overflow-hidden focus:outline-none [&>canvas]:w-full [&>canvas]:h-full [&>canvas]:object-contain"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      />

      {/* Overlays */}
      {rfbState === "connecting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#111]/90 pointer-events-none">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <p className="text-white/60 text-sm font-mono">Connecting to secure browser…</p>
        </div>
      )}

      {rfbState === "disconnected" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#111]/90 pointer-events-none">
          <p className="text-white/60 text-sm font-mono">Browser session ended.</p>
          <button
            onClick={onBack}
            className="pointer-events-auto text-xs font-mono text-white/40 hover:text-white underline transition"
          >
            ← Back to integrations
          </button>
        </div>
      )}

      {/* Bottom security badge */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-white/30 text-[10px] font-mono pointer-events-none">
        <ShieldCheck size={12} /> Private &amp; encrypted session
      </div>
    </div>
  );
}
