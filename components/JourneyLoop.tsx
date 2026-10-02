import { Trophy } from "lucide-react";
import { STAGES, type StageId } from "@/lib/types";

/**
 * The learning loop drawn as a quantum circuit: one wire, thirteen stages,
 * and mastery at the end. Pass `current` to highlight where the learner is.
 */
export function JourneyLoop({ current, dense = false }: { current?: StageId | null; dense?: boolean }) {
  const currentIndex = current ? STAGES.findIndex((stage) => stage.id === current) : -1;
  const allDone = current === null;
  return (
    <ol
      aria-label="The Quantum Nexus learning loop"
      className={`grid grid-cols-3 gap-y-4 sm:grid-cols-5 ${dense ? "lg:grid-cols-7" : "lg:grid-cols-7 xl:grid-cols-[repeat(14,minmax(0,1fr))]"}`}
    >
      {STAGES.map((stage, index) => {
        const isCurrent = index === currentIndex;
        const isDone = allDone || (currentIndex > -1 && index < currentIndex);
        return (
          <li
            key={stage.id}
            className="relative flex flex-col items-center px-0.5 text-center"
            aria-current={isCurrent ? "step" : undefined}
          >
            {/* the wire running through every stage */}
            <span
              aria-hidden
              className={`absolute left-0 right-0 top-[1.25rem] h-px ${isDone || isCurrent ? "bg-ket/70" : "bg-ket/25"}`}
            />
            <span
              className={`ket relative flex h-10 w-10 items-center justify-center rounded-xl border text-xs font-semibold ${
                isCurrent
                  ? "border-ket bg-ket text-void shadow-[0_0_28px_-4px_rgb(90_215_240/0.9)]"
                  : isDone
                    ? "border-ket/50 bg-deck text-ket"
                    : "border-line bg-deck text-mute"
              }`}
            >
              {stage.number}
            </span>
            <span className={`mt-2 text-[0.8125rem] font-semibold leading-tight ${isCurrent ? "text-ket" : isDone ? "text-ink" : "text-mute"}`}>
              {stage.label}
            </span>
            <span className="text-[0.6875rem] leading-tight text-dim">{isCurrent ? "You are here" : stage.hint.en}</span>
          </li>
        );
      })}
      <li className="relative flex flex-col items-center px-0.5 text-center">
        <span aria-hidden className={`absolute left-0 right-1/2 top-[1.25rem] h-px ${allDone ? "bg-ok/70" : "bg-ket/25"}`} />
        <span
          className={`relative flex h-10 w-10 items-center justify-center rounded-xl border ${
            allDone ? "border-ok bg-ok text-void" : "border-ok/40 bg-deck text-ok"
          }`}
        >
          <Trophy size={16} aria-hidden />
        </span>
        <span className="mt-2 text-[0.8125rem] font-semibold leading-tight text-ok">Mastery</span>
        <span className="text-[0.6875rem] leading-tight text-dim">Next concept unlocks</span>
      </li>
    </ol>
  );
}
