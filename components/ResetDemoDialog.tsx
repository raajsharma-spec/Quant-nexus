"use client";

import { useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { useApp } from "./AppProvider";

/** Asks for confirmation, then wipes every local record and returns to the entry screen. */
export function ResetDemoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { actions } = useApp();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const reset = () => {
    actions.resetDemo();
    onClose();
    // A full page load (rather than a client-side route change) guarantees a
    // completely clean slate for the next demo.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby="reset-title"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line bg-deck p-0 text-ink backdrop:bg-void/80 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <div className="mb-3 flex items-center gap-3">
          <span className="rounded-xl bg-warn/15 p-2.5 text-warn">
            <RotateCcw size={20} aria-hidden />
          </span>
          <h2 id="reset-title" className="text-lg font-semibold">
            Reset the demo?
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-mute">
          This clears everything Quantum Nexus has saved on this device: the learner profile,
          progress, predictions, analytics, achievements, mastery and recommendations. You will
          return to the entry screen. This cannot be undone.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-secondary" autoFocus>
            Keep my data
          </button>
          <button type="button" onClick={reset} className="btn border border-warn/50 bg-warn/15 text-warn hover:bg-warn/25">
            Reset demo
          </button>
        </div>
      </div>
    </dialog>
  );
}
