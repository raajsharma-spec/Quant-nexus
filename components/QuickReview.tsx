"use client";

import { useId, useMemo, useState } from "react";
import { Check, History, X } from "lucide-react";
import type { QuizQuestion } from "@/data/quizzes";
import { topicTitle } from "@/data/topics";
import { buildCircuit } from "@/lib/quantumSimulator";
import { dueReviews, quickReviewQuestion, reviewIntervalDays } from "@/lib/review";
import type { TopicId } from "@/lib/types";
import { useApp } from "./AppProvider";
import { QuantumCircuit } from "./QuantumCircuit";

interface Asked {
  topic: TopicId;
  question: QuizQuestion;
}

/**
 * Spaced review: one short question on a concept mastered earlier.
 * It appears when a review is due, so mastered ideas are revisited before
 * they fade. A wrong answer marks the concept for another review soon.
 */
export function QuickReview({ topic: forced, onDone }: { topic?: TopicId; onDone?: () => void }) {
  const { state, t, actions } = useApp();
  const due = dueReviews(state);
  const name = useId();

  // The question is fixed when the card appears, so answering it does not swap it for another.
  const [asked, setAsked] = useState<Asked | null>(() => {
    const topic = forced && state.concepts[forced]?.masteredAt ? forced : due[0];
    if (!topic) return null;
    const question = quickReviewQuestion(state, topic);
    return question ? { topic, question } : null;
  });
  const [choice, setChoice] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const circuit = useMemo(
    () => (asked?.question.circuit ? buildCircuit(asked.question.circuit.qubits, asked.question.circuit.gates) : null),
    [asked]
  );

  if (!asked) return null;
  const { topic, question } = asked;
  const correct = answered && choice === question.answer;
  const remaining = due.filter((id) => id !== topic);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (choice === null || answered) return;
    setAnswered(true);
    actions.recordQuickReview(topic, question.id, choice, choice === question.answer);
  };

  const next = () => {
    const following = remaining[0];
    const nextQuestion = following ? quickReviewQuestion(state, following) : null;
    setChoice(null);
    setAnswered(false);
    if (following && nextQuestion) setAsked({ topic: following, question: nextQuestion });
    else {
      setAsked(null);
      onDone?.();
    }
  };

  const streak = state.reviews[topic]?.streak ?? 0;

  return (
    <section aria-labelledby={`${name}-title`} className="panel p-5 sm:p-6">
      <h2 id={`${name}-title`} className="flex flex-wrap items-center gap-2 text-sm font-semibold text-signal">
        <History size={17} aria-hidden />
        {t({ en: "Quick Review", hi: "Quick Review" })}
        <span className="tag text-mute">{topicTitle(topic)}</span>
      </h2>
      <p className="mt-1 text-sm text-mute">
        {t({
          en: "One question on a concept you mastered earlier, so it stays with you.",
          hi: "Pehle master kiye concept par ek question, taaki woh yaad rahe.",
        })}
      </p>

      <form onSubmit={submit} className="mt-4">
        <fieldset disabled={answered} className="min-w-0">
          <legend className="mb-3 text-lg font-semibold leading-snug">{t(question.prompt)}</legend>
          {circuit && (
            <div className="well mb-3 px-4 py-2">
              <QuantumCircuit circuit={circuit} trim />
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {question.options.map((option, index) => {
              const checked = choice === index;
              const isAnswer = answered && index === question.answer;
              const isWrongPick = answered && checked && index !== question.answer;
              return (
                <label
                  key={index}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ket ${
                    isAnswer
                      ? "border-ok/60 bg-ok/10"
                      : isWrongPick
                        ? "border-warn/60 bg-warn/10"
                        : checked
                          ? "border-ket bg-ket/10"
                          : "border-line hover:border-ink/30"
                  }`}
                >
                  <input
                    type="radio"
                    name={name}
                    checked={checked}
                    onChange={() => setChoice(index)}
                    className="h-4 w-4 shrink-0 accent-[#5ad7f0]"
                  />
                  <span className="flex-1 leading-snug">{t(option)}</span>
                  {isAnswer && <Check size={16} className="shrink-0 text-ok" aria-label="Correct answer" />}
                  {isWrongPick && <X size={16} className="shrink-0 text-warn" aria-label="Your answer" />}
                </label>
              );
            })}
          </div>
        </fieldset>

        {!answered ? (
          <button type="submit" disabled={choice === null} className="btn btn-primary mt-4">
            {t({ en: "Check", hi: "Check karo" })}
          </button>
        ) : (
          <div aria-live="polite" className="mt-4 animate-rise">
            <div className={`rounded-xl border p-4 ${correct ? "border-ok/40 bg-ok/[0.06]" : "border-warn/40 bg-warn/[0.06]"}`}>
              <p className={`font-semibold ${correct ? "text-ok" : "text-warn"}`}>
                {correct
                  ? t({ en: "Still solid.", hi: "Abhi bhi solid." })
                  : t({ en: "This one has faded a little.", hi: "Yeh thoda fade ho gaya hai." })}
              </p>
              <p className="mt-1 leading-relaxed text-ink/90">{t(question.explanation)}</p>
              <p className="mt-2 text-sm text-mute">
                {correct
                  ? t({
                      en: `Next review of ${topicTitle(topic)} in about ${reviewIntervalDays(streak)} day${reviewIntervalDays(streak) === 1 ? "" : "s"}.`,
                      hi: `${topicTitle(topic)} ka next review lagbhag ${reviewIntervalDays(streak)} din mein.`,
                    })
                  : t({
                      en: `${topicTitle(topic)} stays mastered, and another review question will come back soon.`,
                      hi: `${topicTitle(topic)} mastered hi rahega, aur ek aur review question jaldi wapas aayega.`,
                    })}
              </p>
            </div>
            <button type="button" onClick={next} className="btn btn-secondary mt-3 text-sm">
              {remaining.length > 0
                ? t({ en: `Next review (${topicTitle(remaining[0])})`, hi: `Next review (${topicTitle(remaining[0])})` })
                : t({ en: "Done", hi: "Done" })}
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
