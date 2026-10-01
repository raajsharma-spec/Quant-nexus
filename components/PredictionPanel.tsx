"use client";

import { useId } from "react";
import { Lock, Target } from "lucide-react";

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
}

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
}: Props) {
  const name = useId();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (selected && !submitted) onSubmit();
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
                  checked
                    ? "border-phase bg-phase/15"
                    : "border-line bg-void/50 hover:border-phase/50"
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
      </fieldset>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {submitted ? (
          <p className="flex items-center gap-2 text-sm font-medium text-phase">
            <Lock size={15} aria-hidden />
            {lockedLabel}
          </p>
        ) : (
          <button type="submit" disabled={!selected} className="btn btn-secondary border-phase/50">
            {submitLabel}
          </button>
        )}
      </div>
    </form>
  );
}
