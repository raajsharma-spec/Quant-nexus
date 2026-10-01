import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AppProvider } from "@/components/AppProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Quantum Nexus — From Confusion to Quantum Clarity",
    template: "%s · Quantum Nexus",
  },
  description:
    "AI-Assisted Interactive Quantum Learning Platform. Learn quantum computing by predicting outcomes, building circuits, running simulations, and understanding why they work.",
};

export const viewport: Viewport = {
  themeColor: "#050814",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-raised focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
