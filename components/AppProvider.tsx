"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { Trophy, Unlock, X } from "lucide-react";
import * as A from "@/lib/actions";
import { computeInsights, type LearnerInsights } from "@/lib/analytics";
import { store, type Toast } from "@/lib/store";
import type { AppState, AssessmentAnswer, EventType, PythonLevel, TelemetryEvent } from "@/lib/storage";
import type { L, Lang, TopicId } from "@/lib/types";

type EventData = Partial<Pick<TelemetryEvent, "topic" | "detail" | "meta">>;

export interface AppActions {
  enterAsLearner: (name: string) => void;
  enterAsEducator: () => void;
  startDemo: () => void;
  completeOnboarding: (pythonLevel: PythonLevel, language: Lang) => void;
  setLanguage: (language: Lang) => void;
  setThreshold: (value: number) => void;
  track: (type: EventType, data?: EventData) => void;
  openLesson: (topic: TopicId) => void;
  setLessonStep: (topic: TopicId, step: number) => void;
  completeLesson: (topic: TopicId) => void;
  recordExperiment: (input: A.ExperimentInput) => void;
  recordAssessment: (topic: TopicId, answers: AssessmentAnswer[]) => void;
  resetDemo: () => void;
}

interface AppContextValue {
  /** False during server rendering and the first paint, before localStorage is read. */
  ready: boolean;
  state: AppState;
  lang: Lang;
  /** Pick the learner's language from a bilingual text. */
  t: (text: L) => string;
  insights: LearnerInsights;
  actions: AppActions;
}

const AppContext = createContext<AppContextValue | null>(null);

const actions: AppActions = {
  enterAsLearner: (name) => {
    store.switchMode("live");
    store.update((s) => A.enterAsLearner(s, name));
  },
  enterAsEducator: () => {
    store.switchMode("live");
    store.update((s) => A.enterAsEducator(s));
  },
  startDemo: () => store.startDemo(),
  completeOnboarding: (pythonLevel, language) =>
    store.update((s) => A.completeOnboarding(s, pythonLevel, language)),
  setLanguage: (language) => store.update((s) => A.setLanguage(s, language)),
  setThreshold: (value) => store.update((s) => A.setThreshold(s, value)),
  track: (type, data) => store.update((s) => A.track(s, type, data)),
  openLesson: (topic) => store.update((s) => A.openLesson(s, topic)),
  setLessonStep: (topic, step) => store.update((s) => A.setLessonStep(s, topic, step)),
  completeLesson: (topic) => store.update((s) => A.completeLesson(s, topic)),
  recordExperiment: (input) => store.update((s) => A.recordExperiment(s, input)),
  recordAssessment: (topic, answers) => store.update((s) => A.recordAssessment(s, topic, answers)),
  resetDemo: () => store.reset(),
};

const subscribeNoop = () => () => {};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const ready = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const toasts = useSyncExternalStore(store.subscribe, store.getToasts, store.getServerToasts);

  const value = useMemo<AppContextValue>(() => {
    const lang: Lang = state.profile?.language ?? "en";
    return {
      ready,
      state,
      lang,
      t: (text: L) => (lang === "hi" ? text.hi : text.en),
      insights: computeInsights(state),
      actions,
    };
  }, [state, ready]);

  return (
    <AppContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} />
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside <AppProvider>");
  return value;
}

function Toaster({ toasts }: { toasts: Toast[] }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="panel pointer-events-auto flex animate-rise items-start gap-3 border-ok/40 p-4 shadow-2xl"
        >
          <span className="mt-0.5 rounded-lg bg-ok/15 p-2 text-ok">
            {toast.kind === "unlock" ? <Unlock size={18} aria-hidden /> : <Trophy size={18} aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{toast.title}</p>
            <p className="text-sm text-mute">{toast.body}</p>
          </div>
          <button
            type="button"
            onClick={() => store.dismissToast(toast.id)}
            className="rounded-md p-1 text-dim hover:text-ink"
            aria-label="Dismiss notification"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
