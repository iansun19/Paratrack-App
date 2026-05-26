"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, RotateCcw, Zap } from "lucide-react";
import { cn } from "@/utils/utils";
import { request } from "@/lib/api/request";
import { loadConnected, INTEGRATIONS } from "@/components/connect/integrations";

type Role = "user" | "assistant";
type Message = {
  id: string;
  role: Role;
  text: string;
  toolsExecuted?: number;
};
type SendState = "idle" | "sending" | "error";

// Quick suggestion chips — context-aware based on what's connected
function getSuggestions(connectedIds: Set<string>): string[] {
  const base = [
    "What's on the family calendar today?",
    "Which supplies are running low?",
    "Show me this week's schedule",
  ];
  if (connectedIds.has("gmail") || connectedIds.has("outlook")) {
    base.unshift("Check my latest school email and add any events");
  }
  if (connectedIds.has("amazon") || connectedIds.has("instacart")) {
    base.push("Add diapers to the supply tracker");
  }
  if (connectedIds.has("google_calendar")) {
    base.push("Sync my Google Calendar events to Paratrack");
  }
  return base.slice(0, 4);
}

interface ChatPanelProps {
  className?: string;
}

export function ChatPanel({ className }: ChatPanelProps) {
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sendState, setSendState] = useState<SendState>("idle");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load connected services from localStorage
  useEffect(() => {
    setConnectedIds(loadConnected());
    // Build welcome message based on connected state
    const connected = loadConnected();
    const names = INTEGRATIONS
      .filter(i => connected.has(i.id))
      .map(i => i.name);
    const welcome = names.length > 0
      ? `Hi! I'm your Paratrack AI assistant. I can see you have **${names.join(", ")}** connected. Ask me to check your emails, create calendar events, track supplies, or save health notes — I'll take action directly.`
      : `Hi! I'm your Paratrack AI assistant. Connect Gmail, Google Calendar, Amazon, or other services from the Integrations tab and I'll be able to take real actions for you — like creating calendar events from emails or adding supplies automatically.`;
    setMessages([{ id: "welcome", role: "assistant", text: welcome }]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendState]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sendState === "sending") return;

      const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text: trimmed };
      setMessages(prev => [...prev, userMsg]);
      setDraft("");
      setSendState("sending");

      try {
        // Build message history for context (exclude welcome, last 20)
        const history = [...messages, userMsg]
          .filter(m => m.id !== "welcome")
          .slice(-20)
          .map(m => ({ role: m.role, content: m.text }));

        const res = await request("/api/neoclaw/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            connectedServices: [...connectedIds],
          }),
        });

        const data = await res.json().catch(() => ({})) as { error?: string; text?: string; toolsExecuted?: number };
        if (!res.ok) {
          throw new Error(data.error ?? `Server error ${res.status}`);
        }

        setMessages(prev => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant" as Role,
            text: data.text ?? "(No response)",
            toolsExecuted: data.toolsExecuted,
          },
        ]);
        setSendState("idle");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Something went wrong";
        setMessages(prev => [
          ...prev,
          { id: `err-${Date.now()}`, role: "assistant", text: `Sorry, I ran into an issue: ${msg}` },
        ]);
        setSendState("error");
        setTimeout(() => setSendState("idle"), 2000);
      }
    },
    [draft, messages, sendState, connectedIds],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(draft);
    }
  }

  function clearChat() {
    const names = INTEGRATIONS.filter(i => connectedIds.has(i.id)).map(i => i.name);
    const welcome = names.length > 0
      ? `Chat cleared. I still have access to ${names.join(", ")}. What would you like to do?`
      : "Chat cleared. Connect services from the Integrations tab to unlock full AI actions.";
    setMessages([{ id: "welcome-reset", role: "assistant", text: welcome }]);
  }

  const suggestions = getSuggestions(connectedIds);
  const showSuggestions = messages.length <= 1 && sendState === "idle";
  const connectedCount = connectedIds.size;

  // Render text with basic **bold** markdown
  function renderText(text: string) {
    return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : part
    );
  }

  return (
    <div className={cn("flex flex-col bg-[#FDFBF7]", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDE9DF] shrink-0 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#C96A4B]/10 border border-[#C96A4B]/20 flex items-center justify-center">
            <Sparkles size={15} className="text-[#C96A4B]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1C1A17]">Paratrack AI</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#508D76]" />
              <span className="font-mono text-[9px] text-[#508D76] uppercase font-bold">
                {connectedCount > 0 ? `${connectedCount} service${connectedCount !== 1 ? "s" : ""} connected` : "No services connected"}
              </span>
            </div>
          </div>
        </div>
        <button onClick={clearChat} className="p-1.5 rounded-lg hover:bg-stone-100 transition" title="Clear chat">
          <RotateCcw size={15} className="text-[#A8A29E]" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map(msg => {
            const isUser = msg.role === "user";
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  isUser ? "bg-[#1C1A17]" : "bg-[#C96A4B]/10 border border-[#C96A4B]/20"
                )}>
                  {isUser
                    ? <span className="text-white text-[10px] font-bold">You</span>
                    : <Sparkles size={13} className="text-[#C96A4B]" />}
                </div>

                <div className={cn("max-w-[78%] flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                    isUser
                      ? "bg-[#1C1A17] text-white rounded-tr-sm"
                      : "bg-white border border-[#EDE9DF] text-[#1C1A17] rounded-tl-sm shadow-sm"
                  )} style={{ whiteSpace: "pre-wrap" }}>
                    {renderText(msg.text)}
                  </div>
                  {/* Tool action badge */}
                  {msg.toolsExecuted != null && msg.toolsExecuted > 0 && (
                    <div className="flex items-center gap-1 font-mono text-[9px] text-[#508D76] uppercase font-bold px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-full">
                      <Zap size={9} />
                      {msg.toolsExecuted} action{msg.toolsExecuted !== 1 ? "s" : ""} taken
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Typing indicator */}
          {sendState === "sending" && (
            <motion.div key="typing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#C96A4B]/10 border border-[#C96A4B]/20 flex items-center justify-center shrink-0">
                <Sparkles size={13} className="text-[#C96A4B]" />
              </div>
              <div className="bg-white border border-[#EDE9DF] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1.5 items-center h-4">
                  {[0, 1, 2].map(i => (
                    <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-[#A8A29E]"
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips */}
      {showSuggestions && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap shrink-0">
          {suggestions.map(s => (
            <motion.button key={s} whileTap={{ scale: 0.95 }} onClick={() => sendMessage(s)}
              className="text-xs font-mono bg-white border border-[#EDE9DF] text-[#57534E] px-3 py-1.5 rounded-full hover:bg-stone-50 hover:border-[#C96A4B]/40 transition">
              {s}
            </motion.button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-[#EDE9DF] shrink-0 bg-white"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
        <div className="flex items-end gap-2 bg-[#FDFBF7] border border-[#EDE9DF] rounded-xl px-3 py-2.5">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={connectedCount > 0
              ? "Ask me to check emails, create events, add supplies…"
              : "Connect services above, then ask me anything…"}
            rows={1}
            className="flex-1 text-sm resize-none focus:outline-none bg-transparent text-[#1C1A17] placeholder:text-[#A8A29E] leading-relaxed max-h-32"
            style={{ minHeight: "24px" }}
          />
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => sendMessage(draft)}
            disabled={!draft.trim() || sendState === "sending"}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-colors shrink-0 disabled:opacity-40"
            style={{ backgroundColor: draft.trim() ? "#C96A4B" : "#A8A29E" }}
          >
            <Send size={15} />
          </motion.button>
        </div>
        <p className="font-mono text-[9px] text-[#A8A29E] text-center mt-1.5">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
