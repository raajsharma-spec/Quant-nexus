"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "./AppProvider";
import { LogoMark } from "./Logo";
import { ResetDemoDialog } from "./ResetDemoDialog";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/** The persistent shell shown after entry: sidebar, top bar and the page. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, state } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const profile = state.profile;
  const needsEntry = ready && !profile;
  const needsOnboarding = ready && !!profile && profile.role === "learner" && !profile.onboarded;

  // No profile → entry screen. Learner who has not onboarded → onboarding.
  useEffect(() => {
    if (needsEntry) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (needsOnboarding) router.replace("/onboarding");
  }, [needsEntry, needsOnboarding, router, pathname]);

  if (!ready || needsEntry || needsOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status">
        <span className="flex items-center gap-3 text-mute">
          <LogoMark />
          Loading Quantum Nexus…
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar
        open={menuOpen}
        onNavigate={() => setMenuOpen(false)}
        onReset={() => {
          setMenuOpen(false);
          setResetOpen(true);
        }}
      />
      {menuOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-void/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <div className="lg:pl-64">
        <TopBar onMenu={() => setMenuOpen(true)} onReset={() => setResetOpen(true)} />
        <main id="main" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>

      <ResetDemoDialog open={resetOpen} onClose={() => setResetOpen(false)} />
    </div>
  );
}
