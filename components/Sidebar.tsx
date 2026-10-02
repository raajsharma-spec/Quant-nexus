"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookMarked,
  BookOpen,
  ClipboardCheck,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  MessageCircleQuestion,
  Network,
  RotateCcw,
  Settings,
  Target,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Wordmark } from "./Logo";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const MAIN: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/lab", label: "Quantum Lab", icon: FlaskConical },
  { href: "/practice", label: "Practice", icon: Target },
  { href: "/assessment", label: "Assessment", icon: ClipboardCheck },
  { href: "/ai-tutor", label: "AI Tutor", icon: MessageCircleQuestion },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/achievements", label: "Achievements", icon: Trophy },
];

const LOWER: NavItem[] = [
  { href: "/educator", label: "Educator Insights", icon: GraduationCap },
  { href: "/architecture", label: "Architecture", icon: Network },
  { href: "/references", label: "References", icon: BookMarked },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  open,
  onNavigate,
  onReset,
}: {
  /** Whether the drawer is open on small screens. */
  open: boolean;
  onNavigate: () => void;
  onReset: () => void;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const link = (item: NavItem) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9375rem] transition-colors ${
            active
              ? "bg-signal/15 font-semibold text-ink"
              : "text-mute hover:bg-white/[0.05] hover:text-ink"
          }`}
        >
          {active && (
            <span aria-hidden className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-ket" />
          )}
          <Icon size={18} className={active ? "text-ket" : ""} aria-hidden />
          {item.label}
        </Link>
      </li>
    );
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-deck/95 px-3 py-5 backdrop-blur transition-transform lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full max-lg:invisible"
      }`}
    >
      <Link href="/dashboard" onClick={onNavigate} className="mb-6 block rounded-lg px-2">
        <Wordmark />
      </Link>

      <nav aria-label="Main" className="flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-1">{MAIN.map(link)}</ul>
      </nav>

      <nav aria-label="More" className="mt-4 border-t border-line pt-4">
        <ul className="flex flex-col gap-1">
          {LOWER.map(link)}
          <li>
            <button
              type="button"
              onClick={onReset}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[0.9375rem] text-mute transition-colors hover:bg-warn/10 hover:text-warn"
            >
              <RotateCcw size={18} aria-hidden />
              Demo Reset
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
