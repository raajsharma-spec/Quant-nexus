"use client";

import { useMemo, useRef } from "react";
import { ArrowRight, Check, Clock, Gauge, Globe2, Lightbulb, Target } from "lucide-react";
import { conceptContent } from "@/data/curriculum";
import { learnBlockIds, lessonFor, sectionsOf, TAKEAWAYS_BLOCK, type LessonSection } from "@/data/concepts";
import { topicTitle } from "@/data/topics";
import { INTERACTION_TARGET } from "@/lib/actions";
import { buildCircuit } from "@/lib/quantumSimulator";
import { progressOf } from "@/lib/stages";
import type { L, TopicId } from "@/lib/types";
import { AIChat } from "../AIChat";
import { useApp } from "../AppProvider";
import { LessonWidget } from "../LessonWidgets";
import { RunExample } from "../RunExample";
import { StateSandbox } from "../StateSandbox";
import { VisualLesson } from "../VisualLesson";

const prose = "flex max-w-[68ch] flex-col gap-3 text-[1.0625rem] leading-relaxed text-ink/90";

// ---------------------------------------------------------------------------
// 00 · Discover
// ---------------------------------------------------------------------------

export function DiscoverStage({ topic, onBegin }: { topic: TopicId; onBegin: () => void }) {
  const { state, t } = useApp();
  const content = conceptContent(topic);
  const lesson = lessonFor(topic);
  if (!content) return null;
  const done = (progressOf(state, topic).scores.discover ?? 0) >= 100;

  const facts: Array<{ icon: React.ReactNode; label: L; body: L }> = [
    { icon: <Lightbulb size={17} aria-hidden />, label: { en: "The idea in one line", hi: "Idea ek line mein" }, body: content.intuition },
    { icon: <Target size={17} aria-hidden />, label: { en: "Why it matters", hi: "Yeh kyun matter karta hai" }, body: content.whyItMatters },
    { icon: <Globe2 size={17} aria-hidden />, label: { en: "Where it shows up", hi: "Yeh kahan dikhta hai" }, body: content.realWorld },
  ];

  return (
    <div className="flex flex-col gap-5">
      {lesson && <p className={prose}>{t(lesson.intro)}</p>}

      <div className="grid gap-3 md:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label.en} className="well p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-ket">
              {fact.icon}
              {t(fact.label)}
            </p>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink/90">{t(fact.body)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div>
          <h3 className="text-base font-semibold">{t({ en: "By the end you will be able to explain", hi: "End tak aap explain kar paoge" })}</h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {content.objectives.map((objective) => (
              <li key={objective.en} className="flex gap-2.5 leading-relaxed">
                <Check size={17} className="mt-1 shrink-0 text-ok" aria-hidden />
                <span>{t(objective)}</span>
              </li>
            ))}
          </ul>
        </div>
        <dl className="well flex flex-row gap-6 self-start p-4 text-sm md:flex-col md:gap-3">
          <div>
            <dt className="flex items-center gap-1.5 text-dim">
              <Gauge size={14} aria-hidden />
              {t({ en: "Difficulty", hi: "Difficulty" })}
            </dt>
            <dd className="mt-0.5 font-semibold">{t(content.difficulty)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-dim">
              <Clock size={14} aria-hidden />
              {t({ en: "Time", hi: "Time" })}
            </dt>
            <dd className="mt-0.5 font-semibold">
              {t({ en: `about ${content.minutes} min`, hi: `lagbhag ${content.minutes} min` })}
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <button type="button" onClick={onBegin} className="btn btn-primary px-5 py-3 text-base">
          {done
            ? t({ en: "Continue to Learn", hi: "Learn par continue karo" })
            : t({ en: `Start ${topicTitle(topic)}`, hi: `${topicTitle(topic)} start karo` })}
          <ArrowRight size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 01 · Learn
// ---------------------------------------------------------------------------

function TheoryBlock({ section }: { section: LessonSection }) {
  const { t } = useApp();
  return (
    <>
      <h3 className="text-xl font-semibold tracking-tight">{t(section.title)}</h3>
      <div className={`mt-2 ${prose}`}>
        {section.body.map((paragraph, index) => (
          <p key={index}>{t(paragraph)}</p>
        ))}
      </div>
      {section.points && (
        <ul className="mt-4 flex max-w-[68ch] flex-col gap-2">
          {section.points.map((point, index) => (
            <li key={index} className="well flex gap-3 px-4 py-3 leading-relaxed">
              <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ket" />
              <span className="ket text-[0.9375rem]">{t(point)}</span>
            </li>
          ))}
        </ul>
      )}
      {section.widget && (
        <div className="mt-4">
          <LessonWidget id={section.widget} />
        </div>
      )}
      {section.note && <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-dim">{t(section.note)}</p>}
    </>
  );
}

export function LearnStage({ topic }: { topic: TopicId }) {
  const { state, t, actions } = useApp();
  const content = conceptContent(topic);
  const lesson = lessonFor(topic);
  const sections = useMemo(() => sectionsOf(topic, ["concept", "visual"]), [topic]);
  const read = progressOf(state, topic).learnRead;
  if (!content || !lesson) return null;

  const blockIds = learnBlockIds(topic);
  const total = blockIds.length;
  // Blocks open one at a time: everything already read, plus the next one.
  const firstUnread = blockIds.findIndex((id) => !read.includes(id));
  const visible = firstUnread === -1 ? total : firstUnread + 1;

  const confirm = (id: string, last: boolean) => (
    <div className="mt-4">
      {read.includes(id) ? (
        <p className="flex items-center gap-2 text-sm font-medium text-ok">
          <Check size={16} aria-hidden />
          {t({ en: "Read", hi: "Read" })}
        </p>
      ) : (
        <button type="button" onClick={() => actions.markLearnRead(topic, id, total)} className="btn btn-secondary text-sm">
          {last
            ? t({ en: "Got it — I have read the theory", hi: "Got it — maine theory padh li" })
            : t({ en: "Got it — next block", hi: "Got it — next block" })}
          <ArrowRight size={15} aria-hidden />
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-mute" aria-live="polite">
        {t({
          en: `Block ${Math.min(visible, total)} of ${total} · ${read.filter((id) => blockIds.includes(id)).length} read`,
          hi: `Block ${Math.min(visible, total)} / ${total} · ${read.filter((id) => blockIds.includes(id)).length} read`,
        })}
      </p>

      {sections.slice(0, visible).map((section, index) => (
        <article key={section.id} className="well animate-rise p-4 sm:p-5">
          <p className="ket text-xs text-dim">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </p>
          <TheoryBlock section={section} />
          {confirm(section.id, false)}
        </article>
      ))}

      {visible >= total && (
        <article className="well animate-rise p-4 sm:p-5">
          <p className="ket text-xs text-dim">
            {String(total).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </p>
          <h3 className="text-xl font-semibold tracking-tight">{t({ en: "The key ideas", hi: "Key ideas" })}</h3>
          <ul className="mt-3 flex max-w-[68ch] flex-col gap-2">
            {lesson.takeaways.map((item) => (
              <li key={item.en} className="flex gap-3 leading-relaxed">
                <Check size={18} className="mt-1 shrink-0 text-ok" aria-hidden />
                <span>{t(item)}</span>
              </li>
            ))}
          </ul>
          {confirm(TAKEAWAYS_BLOCK, true)}
        </article>
      )}

      {/* Optional depth: never needed to pass the stage, never hidden from anyone. */}
      <details className="well p-4 sm:p-5" open={state.settings.advancedMode}>
        <summary className="cursor-pointer rounded font-semibold text-phase">
          {t({ en: "Go deeper: the mathematics (optional)", hi: "Go deeper: mathematics (optional)" })}
        </summary>
        <ul className="mt-3 flex max-w-[72ch] flex-col gap-2.5">
          {content.advanced.map((item) => (
            <li key={item.en} className="ket rounded-lg border border-line bg-void/50 px-3.5 py-2.5 text-[0.9rem] leading-relaxed">
              {t(item)}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-dim">
          {t({
            en: "Turn on Advanced mode in Settings to keep state vectors and matrices open everywhere.",
            hi: "State vectors aur matrices har jagah open rakhne ke liye Settings mein Advanced mode on karo.",
          })}
        </p>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 02 · Watch
// ---------------------------------------------------------------------------

export function WatchStage({ topic }: { topic: TopicId }) {
  const { state, t, actions } = useApp();
  const content = conceptContent(topic);
  if (!content) return null;
  const { lesson } = content;
  const seen = progressOf(state, topic).watchSeen;

  return (
    <div className="flex flex-col gap-4">
      <p className={prose}>
        {t({
          en: "Press play. Each scene shows the circuit, the state on the sphere and the probabilities it leads to. You can pause, step and drag the timeline.",
          hi: "Play dabao. Har scene circuit, sphere par state aur usse milne wali probabilities dikhata hai. Aap pause, step aur timeline drag kar sakte ho.",
        })}
      </p>
      <VisualLesson
        lesson={lesson}
        seen={seen}
        onSceneSeen={(index) => actions.markWatched(topic, index, lesson.scenes.length)}
      />
      {!lesson.videoUrl && (
        <p className="text-sm text-dim">
          {t({
            en: "This concept has no recorded video yet, so you get an animated visual lesson instead. Its pictures are computed live by the simulator from each scene's circuit.",
            hi: "Is concept ka abhi recorded video nahi hai, isliye aapko animated visual lesson milta hai. Iski pictures har scene ke circuit se simulator live compute karta hai.",
          })}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 03 · Interact
// ---------------------------------------------------------------------------

export function InteractStage({ topic }: { topic: TopicId }) {
  const { state, t, actions } = useApp();
  const sections = useMemo(() => sectionsOf(topic, ["interaction"]), [topic]);
  const used = progressOf(state, topic).interactions;
  const last = useRef(0);

  // One use of the demonstration = one click, drag or key press on a control,
  // counted at most twice a second so a slider drag is not counted as fifty.
  const bump = () => {
    const now = Date.now();
    if (now - last.current < 500) return;
    last.current = now;
    actions.recordInteraction(topic);
  };

  return (
    <div className="flex flex-col gap-5">
      {sections.map((section) => (
        <div key={section.id}>
          <h3 className="text-xl font-semibold tracking-tight">{t(section.title)}</h3>
          <div className={`mt-2 ${prose}`}>
            {section.body.map((paragraph, index) => (
              <p key={index}>{t(paragraph)}</p>
            ))}
          </div>
          {section.widget && (
            <div
              className="mt-4"
              onClickCapture={(event) => {
                if ((event.target as HTMLElement).closest("button, input, select, [role='slider'], [role='button']")) bump();
              }}
              onInputCapture={bump}
            >
              <LessonWidget id={section.widget} />
            </div>
          )}
          {section.note && <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-dim">{t(section.note)}</p>}
        </div>
      ))}
      <p className="text-sm text-mute" aria-live="polite">
        {used >= INTERACTION_TARGET ? (
          <span className="flex items-center gap-2 font-medium text-ok">
            <Check size={16} aria-hidden />
            {t({ en: "You have explored the demonstration.", hi: "Aapne demonstration explore kar liya." })}
          </span>
        ) : (
          t({
            en: `Use the controls above. Changes tried: ${used} of ${INTERACTION_TARGET}.`,
            hi: `Upar ke controls use karo. Changes tried: ${used} / ${INTERACTION_TARGET}.`,
          })
        )}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 04 · Experiment
// ---------------------------------------------------------------------------

export function ExperimentStage({ topic }: { topic: TopicId }) {
  const { state, t, actions } = useApp();
  const content = conceptContent(topic);
  const examples = useMemo(
    () =>
      sectionsOf(topic, ["example"])
        .filter((section) => section.circuit)
        .map((section) => ({ section, circuit: buildCircuit(section.circuit!.qubits, section.circuit!.gates) })),
    [topic]
  );
  if (!content) return null;
  const { sandbox } = content;
  const goals = progressOf(state, topic).goals;

  return (
    <div className="flex flex-col gap-5">
      <p className={prose}>{t(sandbox.intro)}</p>
      <StateSandbox
        sandbox={sandbox}
        reached={goals}
        onGoal={(goalId) => actions.reachGoal(topic, goalId, sandbox.goals.length)}
        advanced={state.settings.advancedMode}
      />

      {examples.map(({ section, circuit }) => (
        <div key={section.id} className="border-t border-line pt-5">
          <p className="text-sm font-semibold text-ket">{t({ en: "Worked example", hi: "Worked example" })}</p>
          <h3 className="mt-0.5 text-xl font-semibold tracking-tight">{t(section.title)}</h3>
          <div className={`mt-2 ${prose}`}>
            {section.body.map((paragraph, index) => (
              <p key={index}>{t(paragraph)}</p>
            ))}
          </div>
          <div className="mt-4">
            <RunExample circuit={circuit} topic={topic} />
          </div>
          {section.note && <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-dim">{t(section.note)}</p>}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 05 · Ask AI
// ---------------------------------------------------------------------------

export function AskStage({ topic }: { topic: TopicId }) {
  const { state, t } = useApp();
  const asked = progressOf(state, topic).questions;
  return (
    <div className="flex flex-col gap-4">
      <p className={prose}>
        {t({
          en: `Before you predict anything, clear up whatever is still fuzzy. Ask the tutor one real question about ${topicTitle(topic)} — or use a quick action. Answers come from the verified lesson material and name their sources.`,
          hi: `Kuch predict karne se pehle jo bhi unclear hai use clear karo. Tutor se ${topicTitle(topic)} ke baare mein ek real question poochho — ya quick action use karo. Answers verified lesson material se aate hain aur apne sources batate hain.`,
        })}
      </p>
      <AIChat topic={topic} stage="ask" inJourney compact />
      <p className="text-sm text-mute" aria-live="polite">
        {asked > 0
          ? t({ en: `Questions asked in this concept: ${asked}.`, hi: `Is concept mein pooche gaye questions: ${asked}.` })
          : t({ en: "Ask at least one question to complete this stage.", hi: "Yeh stage complete karne ke liye kam se kam ek question poochho." })}
      </p>
    </div>
  );
}
