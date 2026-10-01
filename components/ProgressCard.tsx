import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/** A compact, clickable number on the dashboard's learning snapshot. */
export function ProgressCard({
  label,
  value,
  detail,
  href,
  icon: Icon,
  iconClassName = "text-ket",
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
  icon: LucideIcon;
  iconClassName?: string;
}) {
  return (
    <Link
      href={href}
      className="panel group flex flex-col p-4 transition-colors hover:border-ink/30 sm:p-5"
    >
      <span className="flex items-center justify-between gap-2 text-sm text-mute">
        {label}
        <Icon size={17} className={iconClassName} aria-hidden />
      </span>
      <span className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</span>
      <span className="mt-1 text-sm text-dim group-hover:text-mute">{detail}</span>
    </Link>
  );
}
