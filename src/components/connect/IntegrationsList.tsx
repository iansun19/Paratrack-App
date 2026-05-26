"use client";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Plug } from "lucide-react";
import Link from "next/link";
import { cn } from "@/utils/utils";
import { INTEGRATIONS, type Integration } from "./integrations";

export interface IntegrationsListProps {
  connectedIds: Set<string>;
  onConnect: (integration: Integration) => void;
}

export function IntegrationsList({ connectedIds, onConnect }: IntegrationsListProps) {
  return (
    <div className="min-h-screen bg-[var(--color-accent)] px-5 py-8 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition"
          >
            <ArrowLeft size={16} /> Back to Home
          </Link>
          <span className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">
            INTEGRATION HUB
          </span>
        </div>

        <div className="space-y-1">
          <div className="h-px bg-[var(--color-border)]" />
          <div className="h-px bg-[var(--color-border)] mt-0.5" />
          <h1
            className="pt-3 text-3xl font-bold text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Connect Services
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Link your accounts to sync emails, calendar events, photos, and shopping automatically.
          </p>
        </div>

        {/* Integration cards */}
        <div className="space-y-3">
          {INTEGRATIONS.map((integration, i) => {
            const connected = connectedIds.has(integration.id);
            return (
              <motion.div
                key={integration.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl border border-[var(--color-border)] p-4 flex items-center gap-4 shadow-sm"
              >
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold shrink-0"
                  style={{ backgroundColor: integration.avatarBg, color: integration.avatarFg }}
                >
                  {integration.avatarLetter}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-[var(--color-text-primary)]">{integration.name}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] truncate">{integration.description}</p>
                </div>

                {/* Connect / Connected button */}
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  onClick={() => !connected && onConnect(integration)}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase font-bold transition-colors",
                    connected
                      ? "bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/30 cursor-default"
                      : "text-white",
                  )}
                  style={!connected ? { backgroundColor: integration.avatarBg } : undefined}
                >
                  {connected ? (
                    <>
                      <Check size={12} strokeWidth={3} /> Connected
                    </>
                  ) : (
                    <>
                      <Plug size={14} /> Connect
                    </>
                  )}
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
