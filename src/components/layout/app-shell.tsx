"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Users, BookOpen, Mail, ShoppingCart, Calendar, Monitor } from "lucide-react";
import { cn } from "@/utils/utils";
import { ParatrackLogo } from "@/components/brand/paratrack-logo";
import { auth } from "@eazo/sdk";
import { useEazo } from "@eazo/sdk/react";

const tabs = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/kids", icon: Users, label: "Kids" },
  { href: "/calendar", icon: Calendar, label: "Calendar" },
  { href: "/memories", icon: BookOpen, label: "Memories" },
  { href: "/supplies", icon: ShoppingCart, label: "Supplies" },
  { href: "/email-parser", icon: Mail, label: "Auto-Fill" },
  { href: "/connect", icon: Monitor, label: "Connect" },
];

function NavItem({ href, icon: Icon, label }: (typeof tabs)[0]) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link href={href} className="flex flex-col items-center gap-0.5 min-w-0 flex-1 py-2 group">
      <motion.div
        whileTap={{ scale: 0.85 }}
        className={cn(
          "relative flex items-center justify-center w-10 h-7 rounded-xl transition-colors duration-150",
          isActive ? "bg-[#3a5858]" : "group-hover:bg-[#3a5858]"
        )}
      >
        <Icon
          size={18}
          className={cn(
            "transition-colors duration-150",
            isActive ? "text-[#d8eaea]" : "text-[#b0d0d0]"
          )}
        />
        {isActive && (
          <motion.div
            layoutId="nav-indicator"
            className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#d8eaea]"
          />
        )}
      </motion.div>
      <span
        className={cn(
          "text-[10px] font-medium leading-none transition-colors duration-150",
          isActive ? "text-[#d8eaea]" : "text-[#b0d0d0]"
        )}
      >
        {label}
      </span>
    </Link>
  );
}

function SidebarItem({ href, icon: Icon, label }: (typeof tabs)[0]) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-[#3a5858] text-[#d8eaea]"
          : "text-[#b0d0d0] hover:bg-[#3a5858] hover:text-[#d8eaea]"
      )}
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const authenticated = useEazo((s) => s.auth.authenticated);
  const authLoading = useEazo((s) => s.auth.loading);

  // Pulse spinner while SDK resolves the session
  if (authLoading) {
    return (
      <div className="min-h-svh flex items-center justify-center" style={{ backgroundColor: "#1a3030" }}>
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ParatrackLogo size={40} />
        </motion.div>
      </div>
    );
  }

  // Full-screen login gate for unauthenticated web visitors
  if (!authenticated) {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center px-6" style={{ backgroundColor: "#1a3030" }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          className="w-full max-w-sm flex flex-col items-center gap-8"
        >
          <div className="flex flex-col items-center gap-4">
            <ParatrackLogo size={56} />
            <div className="text-center space-y-1.5">
              <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)", color: "#d8eaea" }}>
                Paratrack
              </h1>
              <p className="text-sm leading-relaxed max-w-[240px]" style={{ color: "#b0d0d0" }}>
                The AI-powered operating system for modern family life.
              </p>
            </div>
          </div>

          <div className="w-full space-y-0.5">
            <div className="h-px bg-[#2a4848]" />
            <div className="h-px bg-[#2a4848]" />
          </div>

          <div className="w-full space-y-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => auth.login().catch(() => undefined)}
              className="w-full py-3.5 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
              style={{ backgroundColor: "#2a4848" }}
            >
              Sign in to Paratrack
            </motion.button>
            <p className="text-center text-xs font-mono tracking-wider uppercase" style={{ color: "#6a8888" }}>
              Email · Social · Secure
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main app shell — authenticated view
  return (
    <div className="flex min-h-svh bg-[#d8e8e8]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-[#3a5858] sticky top-0 h-svh" style={{ backgroundColor: "#4a6e6e" }}>
        {/* Sidebar Logomark */}
        <div className="px-5 py-5 border-b border-[#3a5858]">
          <ParatrackLogo size={32} showWordmark variant="white" />
        </div>

        <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
          {tabs.map((tab) => (
            <SidebarItem key={tab.href} {...tab} />
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-[#3a5858]">
          <p className="text-[10px] text-[#b0d0d0]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
            AI OS for family life
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile top header */}
        <header className="md:hidden flex items-center justify-between px-5 py-4 backdrop-blur-md border-b border-[#3a5858] sticky top-0 z-10" style={{ backgroundColor: "#4a6e6e" }}>
          <ParatrackLogo size={28} showWordmark variant="white" />
        </header>

        <div className="flex-1 pb-20 md:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 backdrop-blur-md border-t border-[#3a5858] flex items-center px-2"
        style={{ backgroundColor: "#4a6e6e", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {tabs.map((tab) => (
          <NavItem key={tab.href} {...tab} />
        ))}
      </nav>
    </div>
  );
}
