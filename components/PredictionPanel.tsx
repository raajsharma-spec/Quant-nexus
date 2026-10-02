"use client";

import { useId } from "react";
import { Lock, Target } from "lucide-react";
import type { Confidence } from "@/lib/types";

export interface PanelOption {
  id: string;
  label: string;
}

interface Props {
  question: string;
  options: PanelOption[];
  selected: string | null;
  onSelect: (id: string) => void;
  submitted: boolean;
  onSubmit: () => void;
  submitLabel: string;
  lockedLabel: string;
  /** When given, the learner also says how sure they are before submitting. */
  confidence?: {
    value: Confidence | null;
    onChange: (value: Confidence) => void;
    label: string;
    names: Record<Confidence, string>;
  };
}

const LEVELS: Confidence[] = ["low", "medium", "high"];

/** The "predict before you run" question. The learner must commit before Run unlocks. */
export function PredictionPanel({
  question,
  options,
  selected,
  onSelect,
  submitted,
  onSubmit,
  submitLabel,
  lockedLabel,
  confidence,
}: Props) {
  const name = useId();
  const ready = !!selected && (!confidence || confidence.value !== null);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (ready && !submitted) onSubmit();
      }}
      className="rounded-2xl border border-phase/35 bg-phase/[0.06] p-4 sm:p-5"
    >
      <fieldset disabled={submitted} className="min-w-0">
        <legend className="mb-3 flex items-start gap-2.5 text-base font-semibold">
          <Target size={20} className="mt-0.5 shrink-0 text-phase" aria-hidden />
          <span>{question}</span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((option) => {
            const checked = selected === option.id;
            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ket ${
                  checked ? "border-phase bg-phase/15" : "border-line bg-void/50 hover:border-phase/50"
                } ${submitted && !checked ? "opacity-45" : ""} ${submitted ? "cursor-default" : ""}`}
              >
                <input
                  type="radio"
                  name={name}
                  value={option.id}
                  checked={checked}
                  onChange={() => onSelect(option.id)}
                  className="h-4 w-4 shrink-0 accent-[#a892ff]"
                />
                <span className="ket leading-snug">{option.label}</span>
              </label>
            );
          })}
        </div>

        {confidence && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span id={`${name}-confidence`} className="text-sm text-mute">
              {confidence.label}
            </span>
            <div role="radiogroup" aria-labelledby={`${name}-confidence`} className="flex gap-1.5">
              {LEVELS.map((level) => {
                const active = confidence.value === level;
                return (
                  <button
                    key={level}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => confidence.onChange(level)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      active ? "border-phase bg-phase/20 text-ink" : "border-line text-mute hover:border-phase/50 hover:text-ink"
                    }`}
                  >
                    {confidence.names[level]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </fieldset>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {submitted ? (
          <p className="flex items-center gap-2 text-sm font-medium text-phase">
            <Lock size={15} aria-hidden />
            {lockedLabel}
          </p>
        ) : (
          <button type="submit" disabled={!ready} className="btn btn-secondary border-phase/50">
            {submitLabel}
          </button>
        )}
      </div>
    </form>
  );
}
