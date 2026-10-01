"use client";

import { AchievementBadge } from "@/components/AchievementBadge";
import { useApp } from "@/components/AppProvider";
import { DemoBadge, Meter, PageHeader } from "@/components/ui";
import { ACHIEVEMENTS } from "@/data/achievements";

export default function AchievementsPage() {
  const { state, t } = useApp();
  const earned = Object.keys(state.achievements).length;

  return (
    <>
      <PageHeader
        title="Achievements"
        lead={t({
          en: "Each one is awarded by something you actually did. None can be earned by clicking through.",
          hi: "Har achievement kisi aisi cheez se milta hai jo aapne actually ki. Sirf click karke koi nahi milta.",
        })}
      >
        {state.mode === "demo" && <DemoBadge />}
      </PageHeader>

      <div className="panel mb-5 flex flex-wrap items-center gap-4 p-5">
        <p className="text-3xl font-semibold tabular-nums">
          {earned} <span className="text-lg text-mute">of {ACHIEVEMENTS.length} earned</span>
        </p>
        <div className="min-w-[12rem] flex-1">
          <Meter value={(earned / ACHIEVEMENTS.length) * 100} label="Achievements earned" tone="ok" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ACHIEVEMENTS.map((achievement) => (
          <AchievementBadge key={achievement.id} achievement={achievement} />
        ))}
      </div>
    </>
  );
}
