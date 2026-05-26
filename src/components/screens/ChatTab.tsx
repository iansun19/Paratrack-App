"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, RotateCcw } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: Date;
}

const SUGGESTIONS = [
  "What supplies are running low?",
  "Summarize today's schedule",
  "When does Ava run out of diapers?",
  "What events are coming up this week?",
];

// Context-aware mock replies keyed to keywords in the user's message
function getMockReply(input: string): string {
  const q = input.toLowerCase();
  if (q.includes("supply") || q.includes("supplies") || q.includes("diaper") || q.includes("wipe") || q.includes("formula") || q.includes("run out")) {
    return "Based on your tracked supplies, here's the current status:\n\n• **Diapers** — 4 days remaining at current usage rate\n• **Wipes** — 11 days remaining\n• **Formula** — well stocked (18 days)\n\nWould you like me to add a restock reminder to the calendar?";
  }
  if (q.includes("schedule") || q.includes("today") || q.includes("event") || q.includes("calendar")) {
    return "Here's what I see on today's calendar:\n\n• **8:30 AM** — School dropoff\n• **3:15 PM** — Ballet class (Ava)\n• **5:00 PM** — Pediatrician follow-up\n\nTomorrow you have a parent-teacher conference at 4 PM. Want me to set a reminder?";
  }
  if (q.includes("memory") || q.includes("milestone") || q.includes("vault")) {
    return "The Memory Vault has 14 entries so far this year. The most recent was added 3 days ago — a funny quote from Ava about dandelions. \n\nWant me to generate a monthly recap?";
  }
  if (q.includes("birthday") || q.includes("upcoming")) {
    return "Upcoming events in the next 14 days:\n\n• **June 3** — Ava's ballet recital\n• **June 7** — Liam's soccer game\n• **June 12** — Family dinner at grandparents'\n\nAnything you'd like to add or prep for?";
  }
  if (q.includes("insight") || q.includes("pattern") || q.includes("sleep") || q.includes("development")) {
    return "I've noticed a few patterns recently:\n\n• **Ava** has had 3 late pickups in the last 2 weeks — worth reviewing the Thursday schedule\n• **Liam** has been attending soccer consistently — this might be a growing interest worth encouraging\n• Supply restocking tends to cluster around weekends — consider scheduling a standing Sunday order\n\nShall I adjust the calendar for any of these?";
  }
  if (q.includes("hello") || q.includes("hi") || q.includes("hey")) {
    return "Hey! I'm your Paratrack AI assistant. I can help you manage your family's schedule, check supply levels, surface memories, and keep everything running smoothly. What's on your mind?";
  }
  return "Got it. Here's what I know from your family's data:\n\nYou have **2 supply alerts** this week, **3 events** on the calendar, and the Memory Vault is ready for new entries. I can dive into any of these — just ask!";
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[#C96A4B]/10 border border-[#C96A4B]/20 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={13} className="text-[#C96A4B]" />
        </div>
      )}
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-[#1C1A17] flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-white text-[10px] font-bold">You</span>
        </div>
      )}

      <div className={`max-w-[78%] space-y-1 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "bg-[#1C1A17] text-white rounded-tr-sm"
              : "bg-white border border-[#EDE9DF] text-[#1C1A17] rounded-tl-sm shadow-sm"
          }`}
          style={{ whiteSpace: "pre-wrap" }}
        >
          {/* Render basic **bold** markdown */}
          {msg.content.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
            part.startsWith("**") && part.endsWith("**")
              ? <strong key={i}>{part.slice(2, -2)}</strong>
              : part
          )}
        </div>
        <span className="font-mono text-[9px] text-[#A8A29E] px-1">{formatTime(msg.ts)}</span>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5 flex-row">
      <div className="w-7 h-7 rounded-full bg-[#C96A4B]/10 border border-[#C96A4B]/20 flex items-center justify-center shrink-0">
        <Sparkles size={13} className="text-[#C96A4B]" />
      </div>
      <div className="bg-white border border-[#EDE9DF] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1.5 items-center h-4">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#A8A29E]"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChatTab() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your Paratrack AI assistant. Ask me about your family's schedule, supplies, memories, or anything else. I'm here to help.",
      ts: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content) return;
    setInput("");

    const userMsg: Message = { id: `u${Date.now()}`, role: "user", content, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setTyping(true);

    // Simulate AI thinking delay
    await new Promise(r => setTimeout(r, 900 + Math.random() * 600));
    setTyping(false);

    const reply: Message = {
      id: `a${Date.now()}`,
      role: "assistant",
      content: getMockReply(content),
      ts: new Date(),
    };
    setMessages(prev => [...prev, reply]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function clearChat() {
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Chat cleared. What would you like to know?",
      ts: new Date(),
    }]);
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100svh - 180px)" }}>
      {/* Chat header */}
      <div className="flex items-center justify-between pb-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#C96A4B]/10 border border-[#C96A4B]/20 flex items-center justify-center">
            <Sparkles size={15} className="text-[#C96A4B]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1C1A17]">Paratrack AI</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#508D76]" />
              <span className="font-mono text-[9px] text-[#508D76] uppercase font-bold">Active</span>
            </div>
          </div>
        </div>
        <button onClick={clearChat} className="p-1.5 rounded-lg hover:bg-stone-100 transition" title="Clear chat">
          <RotateCcw size={15} className="text-[#A8A29E]" />
        </button>
      </div>

      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
        <AnimatePresence initial={false}>
          {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
          {typing && (
            <motion.div key="typing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <TypingIndicator />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick suggestion chips — only show when 1 message visible */}
      {messages.length <= 1 && !typing && (
        <div className="flex gap-2 flex-wrap py-3 shrink-0">
          {SUGGESTIONS.map(s => (
            <motion.button
              key={s}
              whileTap={{ scale: 0.95 }}
              onClick={() => send(s)}
              className="text-xs font-mono bg-white border border-[#EDE9DF] text-[#57534E] px-3 py-1.5 rounded-full hover:bg-stone-50 hover:border-[#C96A4B]/40 transition"
            >
              {s}
            </motion.button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="shrink-0 pt-3 border-t border-[#EDE9DF]">
        <div className="flex items-end gap-2 bg-white border border-[#EDE9DF] rounded-xl shadow-sm px-3 py-2.5">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about schedules, supplies, memories…"
            rows={1}
            className="flex-1 text-sm resize-none focus:outline-none bg-transparent text-[#1C1A17] placeholder:text-[#A8A29E] leading-relaxed max-h-32"
            style={{ minHeight: "24px" }}
          />
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => send()}
            disabled={!input.trim() || typing}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-colors shrink-0 disabled:opacity-40"
            style={{ backgroundColor: input.trim() ? "#C96A4B" : "#A8A29E" }}
          >
            <Send size={15} />
          </motion.button>
        </div>
        <p className="font-mono text-[9px] text-[#A8A29E] text-center mt-1.5">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
