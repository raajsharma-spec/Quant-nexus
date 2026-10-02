/**
 * The telemetry log: creating events and appending them to the learning state.
 * Kept in its own small file so every engine can record events without
 * importing the analytics that READ them.
 */

import { dayKey, newId, type AppState, type EventType, type TelemetryEvent } from "./storage";

/** Keep the log bounded so localStorage never fills up. */
const MAX_EVENTS = 800;

export type EventData = Partial<Pick<TelemetryEvent, "topic" | "detail" | "meta" | "seeded" | "at">>;

export function createEvent(type: EventType, data: EventData = {}): TelemetryEvent {
  return { id: newId("ev"), type, at: data.at ?? Date.now(), ...data };
}

/** Add an event to the log and mark its day as an active day (for the streak). */
export function appendEvent(state: AppState, event: TelemetryEvent): AppState {
  const events = [...state.events, event].slice(-MAX_EVENTS);
  const today = dayKey(event.at);
  const activeDays = state.activeDays.includes(today)
    ? state.activeDays
    : [...state.activeDays, today].slice(-60);
  return { ...state, events, activeDays };
}

/** Record one event. */
export function track(state: AppState, type: EventType, data: EventData = {}): AppState {
  return appendEvent(state, createEvent(type, data));
}
