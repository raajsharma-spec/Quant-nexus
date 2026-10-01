import { LOOP_STEPS, type LoopStep } from "@/lib/types";

const STEP_HINT: Record<LoopStep, string> = {
  Learn: "Meet the concept",
  Predict: "Commit to a guess",
  Practice: "Try a challenge",
  Run: "Simulate locally",
  Observe: "See the result",
  Explain: "Understand why",
  Assess: "Mastery check",
  Unlock: "Open what's next",
};

/**
 * The learning loop drawn as a quantum circuit: one wire, eight gates.
 * Pass `current` to highlight where the learner is.
 */
export function JourneyLoop({ current, dense = false }: { current?: LoopStep; dense?: boolean }) {
  const currentIndex = current ? LOOP_STEPS.indexOf(current) : -1;
  return (
    <ol
      aria-label="The Quantum Nexus learning loop"
      className={`grid grid-cols-2 gap-y-3 sm:grid-cols-4 ${dense ? "xl:grid-cols-4" : "xl:grid-cols-8"}`}
    >
      {LOOP_STEPS.map((step, index) => {
        const isCurrent = index === currentIndex;
        const isDone = currentIndex > -1 && index < currentIndex;
        return (
          <li key={step} className="relative flex flex-col items-center px-1 text-center" aria-current={isCurrent ? "step" : undefined}>
            {/* the wire running through every gate */}
            <span
              aria-hidden
              className={`absolute left-0 right-0 top-[1.375rem] h-px ${isDone || isCurrent ? "bg-ket/70" : "bg-ket/25"}`}
            />
            <span
              className={`ket relative flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-semibold ${
                isCurrent
                  ? "border-ket bg-ket text-void shadow-[0_0_28px_-4px_rgb(90_215_240/0.9)]"
                  : isDone
                    ? "border-ket/50 bg-deck text-ket"
                    : "border-line bg-deck text-mute"
              }`}
            >
              {index + 1}
            </span>
            <span className={`mt-2 text-sm font-semibold ${isCurrent ? "text-ket" : isDone ? "text-ink" : "text-mute"}`}>
              {step}
            </span>
            <span className="text-xs leading-tight text-dim">
              {isCurrent ? "You are here" : STEP_HINT[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
