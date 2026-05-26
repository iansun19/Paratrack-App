"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Plug } from "lucide-react";
import { request } from "@/lib/api/request";
import { NeoclawBrowserModal } from "./NeoclawBrowserModal";
import { ConnectionPrefsModal } from "./ConnectionPrefsModal";

type ServiceCategory = "email" | "calendar" | "memories" | "supplies";

interface ServiceDef {
  id: string;
  name: string;
  description: string;
  url: string;
  category: ServiceCategory;
  icon: string;
  color: string;
}

const SERVICES: ServiceDef[] = [
  { id: "gmail", name: "Gmail", description: "Import school newsletters and family updates.", url: "https://accounts.google.com/v3/signin/identifier?continue=https%3A%2F%2Fmail.google.com%2Fmail%2F", category: "email", icon: "G", color: "#EA4335" },
  { id: "outlook", name: "Outlook", description: "Connect your Microsoft inbox for school communications.", url: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize", category: "email", icon: "O", color: "#0078D4" },
  { id: "canvas", name: "Canvas LMS", description: "Sync school assignments, grades, and class schedules.", url: "https://www.google.com/search?q=canvas+lms+student+login", category: "email", icon: "C", color: "#E66000" },
  { id: "google_calendar", name: "Google Calendar", description: "Pull family events and school schedules automatically.", url: "https://accounts.google.com/v3/signin/identifier?continue=https%3A%2F%2Fcalendar.google.com%2Fcalendar%2Fr", category: "calendar", icon: "📅", color: "#4285F4" },
  { id: "icloud_photos", name: "iCloud Photos", description: "Sync your child's photos into the Memory Vault.", url: "https://www.icloud.com/photos", category: "memories", icon: "☁️", color: "#007AFF" },
  { id: "amazon", name: "Amazon", description: "One-click reorder for diapers, wipes, and household supplies.", url: "https://www.amazon.com/ap/signin", category: "supplies", icon: "A", color: "#FF9900" },
  { id: "instacart", name: "Instacart", description: "Order grocery restocks for low supplies, delivered same-day.", url: "https://www.instacart.com/store/?categoryFilter=homeTabForYou", category: "supplies", icon: "🛒", color: "#43B02A" },
];

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  email: "Email & School",
  calendar: "Calendar",
  memories: "Memories",
  supplies: "Shopping & Supplies",
};
const CATEGORY_ORDER: ServiceCategory[] = ["email", "calendar", "memories", "supplies"];

interface DBConnection {
  id: string;
  slug: string;
  url: string;
  platform: string;
  connected: number;
  prefs?: string | null;
  connectedAt: string;
}

type ModalState =
  | { type: "none" }
  | { type: "browser"; service: ServiceDef }
  | { type: "prefs_first_time"; service: ServiceDef; domain: string }
  | { type: "prefs_edit"; service: ServiceDef; existing: DBConnection };

function ServiceCard({ service, connection, onConnect, onManage }: {
  service: ServiceDef;
  connection: DBConnection | undefined;
  onConnect: () => void;
  onManage: () => void;
}) {
  const connected = (connection?.connected ?? 0) === 1;
  return (
    <motion.div layout className="bg-white rounded-xl border border-[#EDE9DF] p-4 flex items-center gap-4 shadow-sm">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0 relative" style={{ backgroundColor: service.color }}>
        {service.icon.length <= 2 ? service.icon : service.name.charAt(0)}
        {connected && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#508D76] border-2 border-white flex items-center justify-center">
            <CheckCircle size={9} className="text-white" strokeWidth={3} />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="font-bold text-sm text-[#1C1A17]">{service.name}</p>
        {connected && connection?.url ? (
          <p className="text-[10px] font-mono text-[#508D76] font-bold uppercase tracking-wider truncate">
            {(() => { try { return new URL(connection.url).hostname.replace("www.", ""); } catch { return connection.url; } })()}
          </p>
        ) : (
          <p className="text-xs text-[#57534E] leading-snug">{service.description}</p>
        )}
      </div>
      {connected ? (
        <button onClick={onManage} className="shrink-0 px-3 py-1.5 rounded-lg border border-[#EDE9DF] bg-[#F5F1EB] text-[#57534E] font-mono text-[10px] uppercase font-bold hover:bg-stone-200 transition">
          Manage
        </button>
      ) : (
        <motion.button whileTap={{ scale: 0.93 }} onClick={onConnect} className="shrink-0 px-3 py-1.5 rounded-lg text-white font-mono text-[10px] uppercase font-bold transition" style={{ backgroundColor: service.color }}>
          Connect
        </motion.button>
      )}
    </motion.div>
  );
}

export function ConnectionsTab() {
  const [connections, setConnections] = useState<DBConnection[]>([]);
  const [loadingConns, setLoadingConns] = useState(true);
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  const loadConnections = useCallback(async () => {
    try {
      const res = await request("/api/browser-connections");
      if (res.ok) { const d = await res.json(); setConnections(d.connections ?? []); }
    } finally { setLoadingConns(false); }
  }, []);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  function getConnection(slug: string) {
    return connections.find(c => c.slug === slug && c.connected === 1);
  }

  async function handleBrowserLoggedIn(service: ServiceDef, domain: string) {
    const res = await request("/api/browser-connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "upsert", slug: service.id, url: domain, platform: service.name }),
    });
    if (res.ok) {
      await loadConnections();
      setModal({ type: "prefs_first_time", service, domain });
    } else {
      setModal({ type: "none" });
    }
  }

  async function handleDisconnect(slug: string) {
    await request("/api/browser-connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disconnect", slug }),
    });
    await loadConnections();
    setModal({ type: "none" });
  }

  const connectedCount = connections.filter(c => c.connected === 1).length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-[#FAF8F5] border border-[#EDE9DF] p-5 space-y-2">
        <div className="flex items-center gap-2">
          <Plug size={15} className="text-[#C96A4B]" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#C96A4B] font-bold">Integration Hub</span>
        </div>
        <p className="text-lg font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>
          {loadingConns ? "Loading…" : connectedCount === 0 ? "Connect your first service" : `${connectedCount} service${connectedCount !== 1 ? "s" : ""} connected`}
        </p>
        <p className="text-xs text-[#57534E]">
          Connect external accounts to automatically sync emails, events, photos, and shopping into Paratrack. Sign in once — Paratrack handles the rest.
        </p>
      </div>

      {CATEGORY_ORDER.map(cat => {
        const catServices = SERVICES.filter(s => s.category === cat);
        return (
          <div key={cat} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#57534E] font-bold">{CATEGORY_LABELS[cat]}</span>
              <div className="flex-1 h-px bg-[#EDE9DF]" />
              <span className="font-mono text-[9px] text-[#A8A29E]">
                {catServices.filter(s => getConnection(s.id)).length}/{catServices.length} connected
              </span>
            </div>
            {catServices.map(service => (
              <ServiceCard
                key={service.id}
                service={service}
                connection={getConnection(service.id)}
                onConnect={() => setModal({ type: "browser", service })}
                onManage={() => {
                  const existing = getConnection(service.id);
                  if (existing) setModal({ type: "prefs_edit", service, existing });
                }}
              />
            ))}
          </div>
        );
      })}

      <p className="text-[10px] text-[#A8A29E] font-mono text-center pb-4">
        Secured via NeoClaw remote browser — credentials never leave the secure session.
      </p>

      <AnimatePresence>
        {modal.type === "browser" && (
          <NeoclawBrowserModal
            key="browser-modal"
            serviceSlug={modal.service.id}
            serviceName={modal.service.name}
            serviceColor={modal.service.color}
            startUrl={modal.service.url}
            onConfirmConnected={(domain) => handleBrowserLoggedIn(modal.service, domain)}
            onClose={() => setModal({ type: "none" })}
          />
        )}
        {modal.type === "prefs_first_time" && (
          <ConnectionPrefsModal
            key="prefs-first"
            mode="first-time"
            platform={modal.service.name}
            accountLabel={modal.domain}
            slug={modal.service.id}
            serviceColor={modal.service.color}
            onSave={() => { loadConnections(); setModal({ type: "none" }); }}
            onClose={() => setModal({ type: "none" })}
          />
        )}
        {modal.type === "prefs_edit" && (
          <ConnectionPrefsModal
            key="prefs-edit"
            mode="edit"
            platform={modal.service.name}
            accountLabel={(() => { try { return new URL(modal.existing.url).hostname.replace("www.", ""); } catch { return modal.existing.url; } })()}
            slug={modal.service.id}
            initialPrefs={modal.existing.prefs ?? ""}
            serviceColor={modal.service.color}
            onSave={() => { loadConnections(); setModal({ type: "none" }); }}
            onDisconnect={() => handleDisconnect(modal.service.id)}
            onClose={() => setModal({ type: "none" })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
