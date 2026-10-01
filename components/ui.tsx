import { useId } from "react";
import { Check, CircleDot, Lock, Play } from "lucide-react";
import type { TopicStatus } from "@/lib/mastery";

/** Topic status with an icon and a word, so colour is never the only signal. */
export function StatusBadge({ status }: { status: TopicStatus }) {
  const styles: Record<TopicStatus, { className: string; icon: React.ReactNode; label: string }> = {
    MASTERED: {
      className: "border-ok/40 bg-ok/10 text-ok",
      icon: <Check size={12} aria-hidden />,
      label: "Mastered",
    },
    "IN PROGRESS": {
      className: "border-ket/40 bg-ket/10 text-ket",
      icon: <Play size={12} aria-hidden />,
      label: "In progress",
    },
    AVAILABLE: {
      className: "border-signal/40 bg-signal/10 text-signal",
      icon: <CircleDot size={12} aria-hidden />,
      label: "Available",
    },
    LOCKED: {
      className: "border-line bg-white/[0.03] text-dim",
      icon: <Lock size={12} aria-hidden />,
      label: "Locked",
    },
  };
  const s = styles[status];
  return (
    <span className={`tag ${s.className}`}>
      {s.icon}
      {s.label}
    </span>
  );
}

type Tone = "ket" | "phase" | "signal" | "ok" | "warn";
const TONE_BG: Record<Tone, string> = {
  ket: "bg-ket",
  phase: "bg-phase",
  signal: "bg-signal",
  ok: "bg-ok",
  warn: "bg-warn",
};

/** A horizontal progress bar. */
export function Meter({
  value,
  label,
  tone = "signal",
  marker,
}: {
  value: number;
  label: string;
  tone?: Tone;
  /** Optional threshold line, in %. */
  marker?: number;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="relative h-2 w-full rounded-full bg-white/[0.07]"
    >
      <div
        className={`h-full origin-left animate-grow rounded-full ${TONE_BG[tone]}`}
        style={{ width: `${clamped}%` }}
      />
      {marker !== undefined && (
        <span
          aria-hidden
          className="absolute -top-1 h-4 w-px bg-ink/70"
          style={{ left: `${marker}%` }}
        />
      )}
    </div>
  );
}

/** A circular progress ring with the number in the middle. */
export function Ring({
  value,
  label,
  size = 112,
  caption,
}: {
  value: number;
  label: string;
  size?: number;
  caption?: string;
}) {
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const gradientId = useId();
  return (
    <div
      role="img"
      aria-label={`${label}: ${Math.round(clamped)}%`}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5ad7f0" />
            <stop offset="100%" stopColor="#a892ff" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(150 170 255 / 0.12)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums">{Math.round(clamped)}%</span>
        {caption && <span className="text-xs text-mute">{caption}</span>}
      </div>
    </div>
  );
}

/** Marks illustrative data so it is never mistaken for real learner data. */
export function DemoBadge({ children = "DEMO DATA" }: { children?: React.ReactNode }) {
  return (
    <span className="tag border-warn/50 bg-warn/10 tracking-wide text-warn">{children}</span>
  );
}

export function PageHeader({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {lead && <p className="mt-1.5 max-w-[68ch] text-mute">{lead}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

/** A calm "nothing here yet" block that points at the next action. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="well flex flex-col items-start gap-2 p-4">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-mute">{body}</p>
      {action}
    </div>
  );
}
