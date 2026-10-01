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
  kind: "achievement" | "unlock" | "info";
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
    const after = finalize(change(before));
    state = after;
    saveState(after);

    // Celebrate things earned by this change.
    for (const achievement of ACHIEVEMENTS) {
      if (!before.achievements[achievement.id] && after.achievements[achievement.id]) {
        pushToast({ kind: "achievement", title: "Achievement earned", body: achievement.title });
      }
    }
    const unlocksBefore = before.events.filter((e) => e.type === "topicUnlocked").length;
    const newUnlocks = after.events.filter((e) => e.type === "topicUnlocked").slice(unlocksBefore);
    newUnlocks.forEach((e) =>
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
    emit();
  },

  dismissToast(id: string) {
    if (!toasts.some((t) => t.id === id)) return;
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },
};
