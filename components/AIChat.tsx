"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookCheck, Bot, Send, UserRound } from "lucide-react";
import {
  answerQuestion,
  QUICK_ACTIONS,
  SUGGESTED_QUESTIONS,
  TUTOR_UNAVAILABLE,
  type QuickActionId,
  type TutorReply,
  type TutorVisual,
} from "@/lib/aiTutor";
import { currentStageOf, currentTopic } from "@/lib/mastery";
import { buildCircuit, stateAfter } from "@/lib/quantumSimulator";
import type { AppState } from "@/lib/storage";
import type { Lang, StageId, TopicId } from "@/lib/types";
import { useApp } from "./AppProvider";
import { BlochSphere } from "./BlochSphere";
import { ProbabilityBars } from "./ProbabilityBars";

type Message =
  | { id: number; from: "learner"; text: string }
  | { id: number; from: "tutor"; reply: TutorReply }
  | { id: number; from: "error"; text: string };

interface Props {
  /** A question (or quick action) to ask automatically when the chat opens. */
  initialQuestion?: string;
  initialAction?: QuickActionId;
  /** Set when the chat is embedded in a concept's journey. */
  topic?: TopicId;
  stage?: StageId;
  /** True inside the Ask AI stage: questions asked here count toward that stage. */
  inJourney?: boolean;
  /** A shorter chat window, for embedding in a stage. */
  compact?: boolean;
}

function greeting(state: AppState, lang: Lang, topicName: string | null): TutorReply {
  const name = state.profile?.name ?? "";
  return {
    mode: "GUIDE",
    intent: "greeting",
    contextUsed: [],
    sources: [],
    followUps: [],
    detections: [],
    text: [
      lang === "hi"
        ? `Hi ${name}. Main Quantum Nexus ka Contextual AI Tutor hoon.${topicName ? ` Aap ${topicName} par ho.` : ""} Koi concept poochho, ya neeche ka koi quick action use karo.`
        : `Hi ${name}. I'm the Contextual AI Tutor for Quantum Nexus.${topicName ? ` You are on ${topicName}.` : ""} Ask about a concept, or use one of the quick actions below.`,
    ],
  };
}

/** A state the tutor draws inside an answer: real Bloch vectors and probabilities from the simulator. */
function VisualAnswer({ visual }: { visual: TutorVisual }) {
  const snapshot = useMemo(
    () => stateAfter(visual.qubits, buildCircuit(visual.qubits, visual.gates).gates),
    [visual]
  );
  return (
    <figure className="mt-3 grid items-center gap-3 rounded-xl border border-line bg-void/50 p-3 sm:grid-cols-[auto_1fr]">
      <div className="flex flex-wrap justify-center gap-2">
        {snapshot.bloch.map((vector, q) => (
          <BlochSphere key={q} vector={vector} title={visual.qubits > 1 ? `q${q}` : "state"} size={116} />
        ))}
      </div>
      <div>
        <ProbabilityBars values={snapshot.probabilities} tone="phase" label="Probabilities of the state shown" />
        <figcaption className="mt-2 text-xs text-dim">{visual.caption}</figcaption>
      </div>
    </figure>
  );
}

/** The chat window for the tutor: free questions, quick actions, cited sources. */
export function AIChat({ initialQuestion, initialAction, topic, stage, inJourney = false, compact = false }: Props) {
  const { state, lang, t, actions } = useApp();
  const activeTopic = topic ?? currentTopic(state);
  const activeStage = stage ?? currentStageOf(state, activeTopic) ?? undefined;

  const [messages, setMessages] = useState<Message[]>(() => [
    { id: 0, from: "tutor", reply: greeting(state, lang, null) },
  ]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [focus, setFocus] = useState<string | undefined>(undefined);
  const end = useRef<HTMLDivElement>(null);
  const asked = useRef(false);
  const counter = useRef(1);
  const count = messages.length;

  useEffect(() => {
    if (count > 1) end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [count, pending]);

  const ask = (question: string, action?: QuickActionId) => {
    const text = question.trim();
    if ((!text && !action) || pending) return;
    const label = action ? t(QUICK_ACTIONS.find((a) => a.id === action)!.label) : text;
    const learnerId = counter.current++;
    setMessages((list) => [...list, { id: learnerId, from: "learner", text: label }]);
    setDraft("");
    setPending(true);

    // A brief pause while the knowledge base is searched, so the answer does not just "pop".
    window.setTimeout(() => {
      const replyId = counter.current++;
      try {
        const reply = answerQuestion(text, state, lang, { topic: activeTopic, stage: activeStage, focus }, action);
        setMessages((list) => [...list, { id: replyId, from: "tutor", reply }]);
        if (reply.focus) setFocus(reply.focus);
        actions.recordTutorQuestion(
          {
            topic: activeTopic,
            stage: activeStage,
            mode: reply.mode,
            question: label,
            sources: reply.sources.map((s) => s.id),
            inJourney,
          },
          reply.detections
        );
        if (reply.mode === "RESULT_ANALYSIS" || reply.mode === "REVIEW") {
          actions.track("aiExplanationRequested", { topic: activeTopic, detail: reply.mode });
        }
      } catch {
        // Never show a stack trace: the lessons and the lab keep working without the tutor.
        setMessages((list) => [...list, { id: replyId, from: "error", text: t(TUTOR_UNAVAILABLE) }]);
      } finally {
        setPending(false);
      }
    }, 320);
  };

  // Ask the opening question once.
  useEffect(() => {
    if (asked.current) return;
    if (!initialQuestion && !initialAction) return;
    asked.current = true;
    ask(initialQuestion ?? "", initialAction);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastReply = [...messages].reverse().find((m) => m.from === "tutor");
  const followUps =
    lastReply && lastReply.from === "tutor" && lastReply.reply.followUps.length > 0
      ? lastReply.reply.followUps
      : SUGGESTED_QUESTIONS.slice(0, compact ? 4 : 8).map(t);

  return (
    <div
      className={`panel flex flex-col ${
        compact ? "h-[32rem]" : "h-[min(46rem,calc(100vh-13rem))] min-h-[30rem]"
      }`}
    >
      <div role="log" aria-label="Conversation with the tutor" aria-live="polite" className="flex-1 overflow-y-auto p-4 sm:p-5">
        <ul className="flex flex-col gap-4">
          {messages.map((message) => {
            if (message.from === "learner") {
              return (
                <li key={message.id} className="flex justify-end gap-2.5">
                  <p className="max-w-[85%] rounded-2xl rounded-tr-md bg-signal/25 px-4 py-2.5 leading-relaxed">
                    <span className="sr-only">You asked: </span>
                    {message.text}
                  </p>
                  <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal/25 text-signal">
                    <UserRound size={16} aria-hidden />
                  </span>
                </li>
              );
            }
            if (message.from === "error") {
              return (
                <li key={message.id} role="alert" className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-warn">
                  {message.text}
                </li>
              );
            }
            const reply = message.reply;
            return (
              <li key={message.id} className="flex gap-2.5">
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-phase/20 text-phase">
                  <Bot size={17} aria-hidden />
                </span>
                <div className="min-w-0 max-w-[90%] rounded-2xl rounded-tl-md border border-line bg-white/[0.04] px-4 py-3">
                  <span className="sr-only">Tutor answered: </span>
                  {reply.mode !== "GUIDE" && reply.mode !== "TEACH" && (
                    <p className="mb-1.5">
                      <span className="tag border-phase/40 text-phase">{reply.mode.replace(/_/g, " ")}</span>
                    </p>
                  )}
                  <div className="flex flex-col gap-2 leading-relaxed">
                    {reply.text.filter(Boolean).map((paragraph, index) => (
                      <p key={index} className={/[=⟩]/.test(paragraph) && reply.mode === "MATH" && index === 0 ? "ket text-[0.95rem]" : ""}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                  {reply.visual && <VisualAnswer visual={reply.visual} />}
                  {reply.link && (
                    <Link
                      href={reply.link.href}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-ket/40 bg-ket/10 px-3 py-1.5 text-sm font-semibold text-ket hover:bg-ket/20"
                    >
                      {reply.link.label}
                      <ArrowRight size={14} aria-hidden />
                    </Link>
                  )}
                  {reply.sources.length > 0 && (
                    <p className="mt-3 flex flex-wrap items-start gap-x-1.5 gap-y-1 border-t border-line pt-2 text-xs leading-relaxed text-mute">
                      <BookCheck size={14} className="mt-0.5 shrink-0 text-ok" aria-hidden />
                      <span className="font-semibold">{t({ en: "Sources (verified):", hi: "Sources (verified):" })}</span>
                      {reply.sources.map((source, index) => (
                        <span key={source.id}>
                          {source.title} — <span className="text-dim">{source.ref} · v{source.version}</span>
                          {index < reply.sources.length - 1 ? ";" : ""}
                        </span>
                      ))}
                    </p>
                  )}
                  {reply.contextUsed.length > 0 && (
                    <p className={`text-xs leading-relaxed text-dim ${reply.sources.length > 0 ? "mt-1.5" : "mt-3 border-t border-line pt-2"}`}>
                      <span className="font-semibold text-mute">{t({ en: "Context used: ", hi: "Context used: " })}</span>
                      {reply.contextUsed.join(" · ")}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
          {pending && (
            <li className="flex items-center gap-2.5 text-sm text-mute" role="status">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-phase/20 text-phase">
                <Bot size={17} aria-hidden />
              </span>
              <span className="animate-pulse-wire">
                {t({ en: "Retrieving learning material…", hi: "Learning material retrieve ho raha hai…" })}
              </span>
            </li>
          )}
        </ul>
        <div ref={end} />
      </div>

      <div className="border-t border-line p-3 sm:p-4">
        <div role="group" aria-label="Quick actions" className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => ask("", action.id)}
              disabled={pending}
              className="shrink-0 rounded-lg border border-phase/40 bg-phase/[0.08] px-2.5 py-1.5 text-xs font-semibold tracking-wide text-ink hover:bg-phase/20 disabled:opacity-50"
            >
              {t(action.label).toUpperCase()}
            </button>
          ))}
        </div>
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1" aria-label="Suggested questions">
          {followUps.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => ask(question)}
              disabled={pending}
              className="shrink-0 rounded-full border border-line bg-white/[0.03] px-3 py-1.5 text-sm text-mute hover:border-phase/60 hover:text-ink disabled:opacity-50"
            >
              {question}
            </button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            ask(draft);
          }}
          className="flex gap-2"
        >
          <label htmlFor={compact ? "tutor-input-stage" : "tutor-input"} className="sr-only">
            Ask the tutor a question
          </label>
          <input
            id={compact ? "tutor-input-stage" : "tutor-input"}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={400}
            placeholder={t({ en: "Ask about a concept or your last result", hi: "Koi concept ya apna last result poochho" })}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-xl border border-line bg-void/70 px-4 py-3 placeholder:text-dim"
          />
          <button type="submit" disabled={!draft.trim() || pending} className="btn btn-primary px-4">
            <Send size={17} aria-hidden />
            <span className="max-sm:sr-only">Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
}
