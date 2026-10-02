"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BookCheck, ShieldCheck } from "lucide-react";
import { AIChat } from "@/components/AIChat";
import { useApp } from "@/components/AppProvider";
import { PageHeader } from "@/components/ui";
import { topicTitle } from "@/data/topics";
import type { QuickActionId } from "@/lib/aiTutor";
import { knowledgeStats } from "@/lib/knowledgeBase";
import { LEVEL_LABEL } from "@/lib/learnerLevel";
import { currentStageOf, currentTopic } from "@/lib/mastery";
import { activeMisconceptions } from "@/lib/misconceptions";
import { getRecommendation } from "@/lib/recommendationEngine";
import { stageMeta } from "@/lib/types";

function Tutor() {
  const { state, insights, lang, t } = useApp();
  const params = useSearchParams();
  const ask = params.get("ask");
  const typed = params.get("q")?.slice(0, 300) || undefined;
  // /ai-tutor?ask=why  → explain my last result     /ai-tutor?ask=mistake → review my mistake
  // /ai-tutor?q=…      → ask this question
  const action: QuickActionId | undefined = ask === "mistake" ? "mistake" : ask === "why" ? "result" : undefined;

  const last = state.lastExperiment;
  const rec = getRecommendation(state);
  const topic = currentTopic(state);
  const stage = currentStageOf(state, topic);
  const misconceptions = activeMisconceptions(state);
  const kb = knowledgeStats();

  return (
    <>
      <PageHeader
        title="AI Tutor"
        lead={t({
          en: "Ask in your own words, or use a quick action. Answers are retrieved from verified lesson content, name their sources, and use your stage, your level and your latest experiment.",
          hi: "Apne words mein poochho, ya quick action use karo. Answers verified lesson content se retrieve hote hain, apne sources batate hain, aur aapka stage, level aur latest experiment use karte hain.",
        })}
      >
        <span className="tag border-phase/40 bg-phase/10 text-phase">Retrieval-grounded · no LLM</span>
      </PageHeader>

      <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
        <AIChat initialQuestion={action ? undefined : typed} initialAction={action} />

        <aside className="flex flex-col gap-5">
          <section aria-labelledby="context-title" className="panel p-5">
            <h2 id="context-title" className="text-lg font-semibold">
              What the tutor can see
            </h2>
            <dl className="mt-3 flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-mute">Language</dt>
                <dd className="font-medium">{lang === "hi" ? "English + Hinglish" : "English"}</dd>
              </div>
              <div>
                <dt className="text-mute">Current concept and stage</dt>
                <dd className="font-medium">
                  {topicTitle(topic)}
                  {stage ? ` · ${stageMeta(stage).number} ${stageMeta(stage).label}` : " · complete"}
                </dd>
              </div>
              <div>
                <dt className="text-mute">Level (inferred)</dt>
                <dd className="font-medium">{LEVEL_LABEL[insights.learner.level]}</dd>
              </div>
              <div>
                <dt className="text-mute">Last experiment</dt>
                {last ? (
                  <dd>
                    <span className="ket block font-medium">{last.circuit}</span>
                    <span className="block text-mute">
                      Predicted <span className="ket text-phase">{last.prediction}</span>
                    </span>
                    <span className="block text-mute">
                      Got <span className="ket text-ket">{last.actual}</span>
                    </span>
                    <span className={last.correct ? "text-ok" : "text-warn"}>
                      {last.correct ? "Prediction matched" : "Prediction missed"}
                    </span>
                  </dd>
                ) : (
                  <dd className="text-dim">None yet. Run a circuit in the Quantum Lab.</dd>
                )}
              </div>
              <div>
                <dt className="text-mute">Weak concepts</dt>
                <dd className="font-medium">
                  {insights.weakConcepts.length === 0
                    ? "None recorded"
                    : insights.weakConcepts.map((w) => w.concept).join(", ")}
                </dd>
              </div>
              <div>
                <dt className="text-mute">Possible misconceptions</dt>
                <dd className="font-medium">
                  {misconceptions.length === 0 ? "None open" : misconceptions.map((m) => t(m.info.title)).join(", ")}
                </dd>
              </div>
              <div>
                <dt className="text-mute">Your next move</dt>
                <dd className="font-medium">{t(rec.title)}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="honest-title" className="panel p-5">
            <h2 id="honest-title" className="flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck size={18} className="text-ok" aria-hidden />
              How this tutor works
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-mute">
              The tutor runs entirely in your browser. It searches a verified knowledge base, builds the answer
              from what it retrieves plus the context above, and lists its sources. If nothing relevant is
              retrieved, it says so instead of guessing. It is not a trained AI model and it calls no AI service;
              a production version would put an LLM behind the same retrieval step.
            </p>
            <p className="mt-3 flex items-start gap-2 text-sm text-mute">
              <BookCheck size={16} className="mt-0.5 shrink-0 text-ok" aria-hidden />
              <span>
                Knowledge base: {kb.verified} verified entries · content v{kb.version} · updated {kb.updatedAt}
              </span>
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

export default function TutorPage() {
  return (
    <Suspense fallback={null}>
      <Tutor />
    </Suspense>
  );
}
