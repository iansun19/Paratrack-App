"use client";
import { useCallback, useEffect, useState } from "react";
import { Plug, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatPanel } from "@/components/connect/ChatPanel";
import { IntegrationsList } from "@/components/connect/IntegrationsList";
import { RemoteBrowserView } from "@/components/connect/RemoteBrowserView";
import { TourOverlay } from "@/components/tour/TourOverlay";
import { GuideOverlay, GuideStep } from "@/components/tour/GuideOverlay";
import {
  loadConnected,
  saveConnected,
  type Integration,
} from "@/components/connect/integrations";

const CONNECT_GUIDE: GuideStep[] = [
  { icon: "🔌", title: "Connect & Chat", description: "Link your external accounts here — Gmail, Google Calendar, Amazon, Instacart, and more. Once connected, the AI can read and act on them for you." },
  { icon: "📑", title: "Integrations Tab", description: "Each card shows a service you can connect. Tap Connect to open a secure browser session. Sign in, then tap 'Confirm' — you're linked." },
  { icon: "💬", title: "AI Assistant Tab", description: "Switch to the AI Assistant tab to chat with Paratrack AI. It can see your connected services and take real actions — like creating calendar events from emails." },
  { icon: "✨", title: "Try It", description: "Once Gmail is connected, try: 'Check my last email from school and add any events to the calendar.' The AI will do it automatically." },
];

type Tab = "integrations" | "chat";

export function ConnectScreen() {
  const [connectedIds, setConnectedIds] = useState<Set<string>>(() => new Set());
  const [activeIntegration, setActiveIntegration] = useState<Integration | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("integrations");

  useEffect(() => {
    setConnectedIds(loadConnected());
  }, []);

  const handleConnect = useCallback((integration: Integration) => {
    setActiveIntegration(integration);
  }, []);

  const handleFinish = useCallback((integration: Integration) => {
    setConnectedIds((prev) => {
      const next = new Set(prev);
      next.add(integration.id);
      saveConnected(next);
      return next;
    });
    setActiveIntegration(null);
  }, []);

  // Full-screen remote browser — shown above tabs
  if (activeIntegration) {
    return (
      <RemoteBrowserView
        loginUrl={activeIntegration.loginUrl}
        integrationName={activeIntegration.name}
        onBack={() => setActiveIntegration(null)}
        onFinish={() => handleFinish(activeIntegration)}
      />
    );
  }

  const connectedCount = connectedIds.size;

  return (
    <div className="flex flex-col min-h-svh bg-[#FDFBF7]">
      <GuideOverlay guideId="connect" steps={CONNECT_GUIDE} color="#C96A4B" />
      {/* Page header */}
      <div className="px-5 pt-8 pb-4 space-y-1">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#57534E]">CONNECTED ECOSYSTEM</span>
        <div className="h-px bg-[#EDE9DF]" /><div className="h-px bg-[#EDE9DF] mt-0.5" />
        <h1 className="text-3xl font-bold text-[#1C1A17] pt-3" style={{ fontFamily: "var(--font-heading)" }}>
          Connect &amp; Chat
        </h1>
        <p className="text-xs text-[#57534E]">
          Link your services, then ask the AI to take action across all of them.
        </p>
      </div>

      {/* Tab bar */}
      <div className="px-5 pb-3">
        <div data-tour="connect-tabs" className="flex bg-stone-100 rounded-xl p-1 border border-[#EDE9DF]">
          <button
            onClick={() => setActiveTab("integrations")}
            className={[
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all",
              activeTab === "integrations"
                ? "bg-white shadow-sm text-[#C96A4B]"
                : "text-[#A8A29E] hover:text-[#57534E]",
            ].join(" ")}
          >
            <Plug size={13} />
            Integrations
            {connectedCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#508D76] text-white text-[9px] font-bold flex items-center justify-center">
                {connectedCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={[
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all",
              activeTab === "chat"
                ? "bg-white shadow-sm text-[#C96A4B]"
                : "text-[#A8A29E] hover:text-[#57534E]",
            ].join(" ")}
            data-tour="connect-chat-tab"
          >
            <MessageCircle size={13} />
            AI Assistant
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "integrations" ? (
            <motion.div
              key="integrations"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
              className="h-full overflow-y-auto pb-24"
              data-tour="connect-list"
            >
              <IntegrationsList
                connectedIds={connectedIds}
                onConnect={handleConnect}
              />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.18 }}
              className="h-full"
              style={{ height: "calc(100svh - 220px)" }}
            >
              <ChatPanel className="h-full border-t border-[#EDE9DF]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
