import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { EazoProvider } from "@eazo/sdk/react";
import { cn } from "@/utils/utils";
import { Toaster } from "@/components/ui/sonner";
import { UserSyncEffect } from "@/components/user-profile/user-sync-effect";
import { AppShell } from "@/components/layout/app-shell";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const metadataBase = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
  : process.env.VERCEL_URL
    ? new URL(`https://${process.env.VERCEL_URL}`)
    : undefined;

export const metadata: Metadata = {
  metadataBase,
  title: { default: "Paratrack", template: "%s | Paratrack" },
  description: "The AI-powered operating system for modern family life.",
  openGraph: {
    title: "Paratrack",
    description: "Paratrack is an AI-powered family operating system designed to reduce parental mental load through intelligent coordination and automation. Parents c...",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Paratrack",
    description: "Paratrack is an AI-powered family operating system designed to reduce parental mental load through intelligent coordination and automation. Parents c...",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("h-full antialiased", playfair.variable, plusJakarta.variable)}>
      <body className="min-h-svh bg-[#FDFBF7]" style={{ fontFamily: "var(--font-body)" }}>
        <EazoProvider>
          <UserSyncEffect />
          <AppShell>{children}</AppShell>
          <Toaster />
        </EazoProvider>
      </body>
    </html>
  );
}
