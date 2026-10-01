"use client";

import Link from "next/link";
import { Check, CircleHelp } from "lucide-react";
import { recentActivity, timeAgo } from "@/lib/analytics";
import { useApp } from "./AppProvider";
import { EmptyState } from "./ui";

/** Recent activity, built from local telemetry — never hard-coded. */
export function ActivityFeed({ limit = 6 }: { limit?: number }) {
  const { state, lang } = useApp();
  const items = recentActivity(state, lang, limit);

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing here yet"
        body="Finish a lesson, make a prediction or run a circuit, and it will show up here."
        action={
          <Link href="/learn" className="btn btn-secondary mt-1 text-sm">
            Start your first lesson
          </Link>
        }
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-2.5 text-[0.9375rem]">
          {item.positive ? (
            <Check size={17} className="mt-0.5 shrink-0 text-ok" aria-hidden />
          ) : (
            <CircleHelp size={17} className="mt-0.5 shrink-0 text-warn" aria-hidden />
          )}
          <span className="min-w-0 flex-1 leading-snug">
            {item.text}
            <span className="ml-2 whitespace-nowrap text-xs text-dim">
              {timeAgo(item.at)}
              {item.seeded && " · demo"}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
