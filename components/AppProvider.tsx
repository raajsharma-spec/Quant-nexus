"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { AlertTriangle, Check, Trophy, Unlock, X } from "lucide-react";
import * as A from "@/lib/actions";
import { computeInsights, type LearnerInsights } from "@/lib/analytics";
import type { Detection } from "@/lib/misconceptions";
import { store, type Toast } from "@/lib/store";
import type {
  AppState,
  AssessmentAnswer,
  EventType,
  Settings,
  StagePrediction,
  StageRun,
  TelemetryEvent,
} from "@/lib/storage";
import type { L, Lang, StageId, TopicId } from "@/lib/types";

type EventData = Partial<Pick<TelemetryEvent, "topic" | "detail" | "meta">>;

export interface AppActions {
  enterAsLearner: (name: string) => void;
  enterAsEducator: () => void;
  startDemo: () => void;
  completeOnboarding: (language: Lang) => void;
  setLanguage: (language: Lang) => void;
  setThreshold: (value: number) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  track: (type: EventType, data?: EventData) => void;
  // Python Foundations (optional warm-up)
  openLesson: (topic: TopicId) => void;
  setLessonStep: (topic: TopicId, step: number) => void;
  completeLesson: (topic: TopicId) => void;
  recordAssessment: (topic: TopicId, answers: AssessmentAnswer[]) => void;
  // The concept journey
  openStage: (topic: TopicId, stage: StageId) => void;
  addStageTime: (topic: TopicId, stage: StageId, ms: number) => void;
  completeDiscover: (topic: TopicId) => void;
  markLearnRead: (topic: TopicId, blockId: string, totalBlocks: number) => void;
  markWatched: (topic: TopicId, sceneIndex: number, totalScenes: number) => void;
  recordInteraction: (topic: TopicId) => void;
  reachGoal: (topic: TopicId, goalId: string, totalGoals: number) => void;
  recordTutorQuestion: (input: A.TutorQuestionInput, detections?: Detection[]) => void;
  submitStagePrediction: (topic: TopicId, prediction: StagePrediction, circuit: string) => void;
  recordStageRun: (topic: TopicId, run: StageRun, experiment: A.ExperimentInput) => void;
  recordObservation: (topic: TopicId, checkId: string, correct: boolean, totalChecks: number) => void;
  recordExplanation: (input: A.ExplanationInput) => void;
  recordStageAssessment: (topic: TopicId, results: A.AssessItemResult[], kind: "full" | "targeted") => void;
  startReview: (topic: TopicId) => void;
  completeReview: (topic: TopicId) => void;
  setStageChallenge: (topic: TopicId, challengeId: string) => void;
  recordStageChallenge: (topic: TopicId, experiment: A.ExperimentInput) => void;
  recordQuickReview: (topic: TopicId, questionId: string, chosen: number, correct: boolean) => void;
  // Lab and practice
  recordExperiment: (input: A.ExperimentInput) => void;
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
  completeOnboarding: (language) => store.update((s) => A.completeOnboarding(s, language)),
  setLanguage: (language) => store.update((s) => A.setLanguage(s, language)),
  setThreshold: (value) => store.update((s) => A.setThreshold(s, value)),
  updateSettings: (patch) => store.update((s) => A.updateSettings(s, patch)),
  track: (type, data) => store.update((s) => A.track(s, type, data)),
  openLesson: (topic) => store.update((s) => A.openLesson(s, topic)),
  setLessonStep: (topic, step) => store.update((s) => A.setLessonStep(s, topic, step)),
  completeLesson: (topic) => store.update((s) => A.completeLesson(s, topic)),
  recordAssessment: (topic, answers) => store.update((s) => A.recordAssessment(s, topic, answers)),
  openStage: (topic, stage) => store.update((s) => A.openStage(s, topic, stage)),
  addStageTime: (topic, stage, ms) => store.update((s) => A.addStageTime(s, topic, stage, ms)),
  completeDiscover: (topic) => store.update((s) => A.completeDiscover(s, topic)),
  markLearnRead: (topic, blockId, total) => store.update((s) => A.markLearnRead(s, topic, blockId, total)),
  markWatched: (topic, scene, total) => store.update((s) => A.markWatched(s, topic, scene, total)),
  recordInteraction: (topic) => store.update((s) => A.recordInteraction(s, topic)),
  reachGoal: (topic, goalId, total) => store.update((s) => A.reachGoal(s, topic, goalId, total)),
  recordTutorQuestion: (input, detections) => store.update((s) => A.recordTutorQuestion(s, input, detections)),
  submitStagePrediction: (topic, prediction, circuit) =>
    store.update((s) => A.submitStagePrediction(s, topic, prediction, circuit)),
  recordStageRun: (topic, run, experiment) => store.update((s) => A.recordStageRun(s, topic, run, experiment)),
  recordObservation: (topic, checkId, correct, total) =>
    store.update((s) => A.recordObservation(s, topic, checkId, correct, total)),
  recordExplanation: (input) => store.update((s) => A.recordExplanation(s, input)),
  recordStageAssessment: (topic, results, kind) => store.update((s) => A.recordStageAssessment(s, topic, results, kind)),
  startReview: (topic) => store.update((s) => A.startReview(s, topic)),
  completeReview: (topic) => store.update((s) => A.completeReview(s, topic)),
  setStageChallenge: (topic, challengeId) => store.update((s) => A.setStageChallenge(s, topic, challengeId)),
  recordStageChallenge: (topic, experiment) => store.update((s) => A.recordStageChallenge(s, topic, experiment)),
  recordQuickReview: (topic, questionId, chosen, correct) =>
    store.update((s) => A.recordQuickReview(s, topic, questionId, chosen, correct)),
  recordExperiment: (input) => store.update((s) => A.recordExperiment(s, input)),
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
      {toasts.map((toast) => {
        const warning = toast.kind === "warning";
        return (
        <div
          key={toast.id}
          role={warning ? "alert" : "status"}
          className={`panel pointer-events-auto flex animate-rise items-start gap-3 p-4 shadow-2xl ${
            warning ? "border-warn/50" : "border-ok/40"
          }`}
        >
          <span className={`mt-0.5 rounded-lg p-2 ${warning ? "bg-warn/15 text-warn" : "bg-ok/15 text-ok"}`}>
            {toast.kind === "unlock" ? (
              <Unlock size={18} aria-hidden />
            ) : toast.kind === "stage" ? (
              <Check size={18} aria-hidden />
            ) : warning ? (
              <AlertTriangle size={18} aria-hidden />
            ) : (
              <Trophy size={18} aria-hidden />
            )}
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
        );
      })}
    </div>
  );
}
