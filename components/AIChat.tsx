"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Send, UserRound } from "lucide-react";
import { answerQuestion, SUGGESTED_QUESTIONS, type TutorReply } from "@/lib/aiTutor";
import type { AppState } from "@/lib/storage";
import type { Lang } from "@/lib/types";
import { useApp } from "./AppProvider";

type Message =
  | { id: number; from: "learner"; text: string }
  | { id: number; from: "tutor"; reply: TutorReply };

function greeting(state: AppState, lang: Lang): TutorReply {
  const name = state.profile?.name ?? "";
  return {
    intent: "greeting",
    contextUsed: [],
    followUps: [],
    text: [
      lang === "hi"
        ? `Hi ${name}. Main Quantum Nexus ka Contextual AI Tutor hoon. Koi concept poochho, ya circuit run karne ke baad poochho ki woh result kyun aaya.`
        : `Hi ${name}. I'm the Contextual AI Tutor for Quantum Nexus. Ask about a concept, or run a circuit and ask why you got that result.`,
    ],
  };
}

/** The chat window for the rule-based tutor. `initialQuestion` is asked automatically. */
export function AIChat({ initialQuestion }: { initialQuestion?: string }) {
  const { state, lang, t, actions } = useApp();
  const [messages, setMessages] = useState<Message[]>(() => {
    const first: Message[] = [{ id: 0, from: "tutor", reply: greeting(state, lang) }];
    if (initialQuestion) {
      first.push({ id: 1, from: "learner", text: initialQuestion });
      first.push({ id: 2, from: "tutor", reply: answerQuestion(initialQuestion, state, lang) });
    }
    return first;
  });
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const count = messages.length;

  useEffect(() => {
    if (count > 1) end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [count]);

  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    const reply = answerQuestion(text, state, lang);
    setMessages((list) => [
      ...list,
      { id: list.length, from: "learner", text },
      { id: list.length + 1, from: "tutor", reply },
    ]);
    setDraft("");
    if (reply.intent === "why-wrong" || reply.intent === "why-result") {
      actions.track("aiExplanationRequested", { detail: reply.intent });
    }
  };

  const lastReply = [...messages].reverse().find((m) => m.from === "tutor");
  const followUps =
    lastReply && lastReply.from === "tutor" && lastReply.reply.followUps.length > 0
      ? lastReply.reply.followUps
      : SUGGESTED_QUESTIONS.map(t);

  return (
    <div className="panel flex h-[min(44rem,calc(100vh-13rem))] min-h-[28rem] flex-col">
      <div role="log" aria-label="Conversation with the tutor" aria-live="polite" className="flex-1 overflow-y-auto p-4 sm:p-5">
        <ul className="flex flex-col gap-4">
          {messages.map((message) =>
            message.from === "learner" ? (
              <li key={message.id} className="flex justify-end gap-2.5">
                <p className="max-w-[85%] rounded-2xl rounded-tr-md bg-signal/25 px-4 py-2.5 leading-relaxed">
                  <span className="sr-only">You asked: </span>
                  {message.text}
                </p>
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal/25 text-signal">
                  <UserRound size={16} aria-hidden />
                </span>
              </li>
            ) : (
              <li key={message.id} className="flex gap-2.5">
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-phase/20 text-phase">
                  <Bot size={17} aria-hidden />
                </span>
                <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-line bg-white/[0.04] px-4 py-3">
                  <span className="sr-only">Tutor answered: </span>
                  <div className="flex flex-col gap-2 leading-relaxed">
                    {message.reply.text.map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                  {message.reply.link && (
                    <Link
                      href={message.reply.link.href}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-ket/40 bg-ket/10 px-3 py-1.5 text-sm font-semibold text-ket hover:bg-ket/20"
                    >
                      {message.reply.link.label}
                      <ArrowRight size={14} aria-hidden />
                    </Link>
                  )}
                  {message.reply.contextUsed.length > 0 && (
                    <p className="mt-3 border-t border-line pt-2 text-xs leading-relaxed text-dim">
                      <span className="font-semibold text-mute">Context used: </span>
                      {message.reply.contextUsed.join(" · ")}
                    </p>
                  )}
                </div>
              </li>
            )
          )}
        </ul>
        <div ref={end} />
      </div>

      <div className="border-t border-line p-3 sm:p-4">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1" aria-label="Suggested questions">
          {followUps.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => ask(question)}
              className="shrink-0 rounded-full border border-line bg-white/[0.03] px-3 py-1.5 text-sm text-mute hover:border-phase/60 hover:text-ink"
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
          <label htmlFor="tutor-input" className="sr-only">
            Ask the tutor a question
          </label>
          <input
            id="tutor-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t({ en: "Ask about a concept or your last result", hi: "Koi concept ya apna last result poochho" })}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-xl border border-line bg-void/70 px-4 py-3 placeholder:text-dim"
          />
          <button type="submit" disabled={!draft.trim()} className="btn btn-primary px-4">
            <Send size={17} aria-hidden />
            <span className="max-sm:sr-only">Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
}
