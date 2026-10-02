/**
 * A tiny store that keeps the app state in memory and mirrors it to
 * localStorage. React reads it through `useSyncExternalStore` (see AppProvider).
 */

import { ACHIEVEMENTS } from "@/data/achievements";
import { finalize } from "./actions";
import { buildDemoState } from "./demoSeed";
import {
  clearAll,
  createInitialState,
  loadMode,
  loadState,
  saveMode,
  saveState,
  type AppState,
  type Mode,
} from "./storage";

export interface Toast {
  id: string;
  kind: "achievement" | "unlock" | "stage" | "info" | "warning";
  title: string;
  body: string;
}

type Listener = () => void;

const SERVER_STATE: AppState = createInitialState("live");
const NO_TOASTS: Toast[] = [];

let state: AppState | null = null;
let toasts: Toast[] = NO_TOASTS;
const listeners = new Set<Listener>();
let toastCounter = 0;
let warnedAboutStorage = false;

function current(): AppState {
  if (state === null) state = loadState(loadMode());
  return state;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function pushToast(toast: Omit<Toast, "id">) {
  toastCounter += 1;
  const id = `toast-${toastCounter}`;
  toasts = [...toasts, { id, ...toast }].slice(-3);
  emit();
  if (typeof window !== "undefined") {
    window.setTimeout(() => store.dismissToast(id), 6000);
  }
}

export const store = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot: (): AppState => current(),
  getServerSnapshot: (): AppState => SERVER_STATE,

  getToasts: (): Toast[] => toasts,
  getServerToasts: (): Toast[] => NO_TOASTS,

  /** Apply a change, award anything newly earned, save, and notify React. */
  update(change: (s: AppState) => AppState) {
    const before = current();
    const changed = change(before);
    if (changed === before) return; // nothing happened (for example, a locked stage)
    const after = finalize(changed);
    state = after;
    const saved = saveState(after);
    if (!saved && !warnedAboutStorage) {
      warnedAboutStorage = true;
      pushToast({
        kind: "warning",
        title: "Your progress could not be synchronized.",
        body: "This browser is blocking storage. You can keep learning, but progress will be lost when the tab closes.",
      });
    }

    // Tell the learner about what this change earned.
    const known = new Set(before.events.map((e) => e.id));
    const fresh = after.events.filter((e) => !known.has(e.id));

    fresh
      .filter((e) => e.type === "stageCompleted")
      .slice(-1)
      .forEach((e) =>
        pushToast({
          kind: "stage",
          title: `Stage complete: ${e.detail} (${e.meta?.score ?? 100}%)`,
          body: e.meta?.stage === "challenge" ? "Every stage of this concept is complete." : "Next stage unlocked.",
        })
      );
    for (const achievement of ACHIEVEMENTS) {
      if (!before.achievements[achievement.id] && after.achievements[achievement.id]) {
        pushToast({ kind: "achievement", title: "Achievement earned", body: achievement.title });
      }
    }
    fresh
      .filter((e) => e.type === "topicUnlocked")
      .forEach((e) =>
        pushToast({ kind: "unlock", title: "Concept mastered", body: `Next concept unlocked: ${e.detail}` })
      );

    emit();
  },

  /** Switch between the learner's real data and the illustrative demo learner. */
  switchMode(mode: Mode) {
    saveMode(mode);
    state = loadState(mode);
    emit();
  },

  /** Start Demo: load a fresh illustrative learner into the demo slot. */
  startDemo() {
    const demo = buildDemoState();
    saveMode("demo");
    saveState(demo);
    state = demo;
    emit();
  },

  /** Reset Demo: forget everything on this device. */
  reset() {
    clearAll();
    state = createInitialState("live");
    toasts = NO_TOASTS;
    warnedAboutStorage = false;
    emit();
  },

  dismissToast(id: string) {
    if (!toasts.some((t) => t.id === id)) return;
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },
};
