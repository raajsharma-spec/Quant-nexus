"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buildCircuit } from "@/lib/quantumSimulator";
import { ExperimentFlow } from "./ExperimentFlow";

/** A real, working experiment on the landing page: predict, then run H → M. */
export function HeroDemo() {
  const circuit = useMemo(
    () =>
      buildCircuit(1, [
        ["H", 0, 0],
        ["M", 0, 1],
      ]),
    []
  );
  return (
    <div className="panel-lead p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Try the core idea right here</h2>
        <p className="text-sm text-mute">A live circuit, simulated in your browser.</p>
      </div>
      <ExperimentFlow
        circuit={circuit}
        source="guest"
        topic="superposition"
        question="This qubit passes through an H gate and is then measured. What do you predict will happen?"
        after={() => (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-void/50 px-4 py-3">
            <p className="text-sm text-mute">
              That was the heart of the loop: predict, run, observe. Inside, you also explain why.
            </p>
            <Link href="/login" className="btn btn-primary">
              Start learning
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        )}
      />
    </div>
  );
}
