"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AIChat } from "@/components/AIChat";
import { useApp } from "@/components/AppProvider";
import { PageHeader } from "@/components/ui";
import { topicTitle } from "@/data/topics";
import { currentTopic } from "@/lib/mastery";
import { getRecommendation } from "@/lib/recommendationEngine";

function Tutor() {
  const { state, insights, lang, t } = useApp();
  const ask = useSearchParams().get("ask");
  const initial =
    ask === "why" ? t({ en: "Why did I get this result?", hi: "Mujhe yeh result kyun mila?" }) : undefined;

  const last = state.lastExperiment;
  const rec = getRecommendation(state);

  return (
    <>
      <PageHeader
        title="AI Tutor"
        lead={t({
          en: "Ask a question in your own words. Answers use your language, your current topic and your latest experiment.",
          hi: "Apne words mein question poochho. Answers aapki language, current topic aur latest experiment use karte hain.",
        })}
      >
        <span className="tag border-phase/40 bg-phase/10 text-phase">Contextual AI Tutor — MVP</span>
      </PageHeader>

      <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
        <AIChat initialQuestion={initial} />

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
                <dt className="text-mute">Current topic</dt>
                <dd className="font-medium">{topicTitle(currentTopic(state))}</dd>
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
              This MVP tutor is rule-based and runs entirely in your browser. It matches your
              question to a topic, then builds the answer from the context above. It is not a
              trained AI model and it calls no AI service. A production version would connect this
              panel to a RAG + LLM service.
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
