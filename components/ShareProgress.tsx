"use client";

import { useState } from "react";
import { Check, Copy, Download, Send } from "lucide-react";
import { buildReport, encodeReport } from "@/lib/classroom";
import { useApp } from "./AppProvider";

/**
 * Lets a learner hand their progress to an instructor: a code to paste into a
 * message, or a file. The report holds scores and counts — not what they wrote.
 */
export function ShareProgress() {
  const { state, t } = useApp();
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const make = () => {
    setCode(encodeReport(buildReport(state)));
    setCopied(false);
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(buildReport(state), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quantum-nexus-report-${(state.profile?.name ?? "learner").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-labelledby="share-title" className="panel p-5 sm:p-6">
      <h2 id="share-title" className="flex items-center gap-2 text-lg font-semibold">
        <Send size={17} className="text-ket" aria-hidden />
        {t({ en: "Share with your instructor", hi: "Apne instructor ke saath share karo" })}
      </h2>
      <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-mute">
        {t({
          en: "Make a progress report and send it to your instructor. They add it on their Instructor dashboard to see your stages, accuracy and weak areas. The report holds scores and counts only: nothing you wrote is included.",
          hi: "Progress report banao aur apne instructor ko bhejo. Woh ise apne Instructor dashboard par add karke aapke stages, accuracy aur weak areas dekh sakte hain. Report mein sirf scores aur counts hote hain: aapka likha kuch bhi include nahi hota.",
        })}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={make} className="btn btn-secondary text-sm">
          {code ? t({ en: "Refresh the report code", hi: "Report code refresh karo" }) : t({ en: "Make a report code", hi: "Report code banao" })}
        </button>
        <button type="button" onClick={download} className="btn btn-ghost text-sm">
          <Download size={15} aria-hidden />
          {t({ en: "Download as a file", hi: "File download karo" })}
        </button>
      </div>
      {code && (
        <div className="mt-3 animate-rise">
          <label htmlFor="report-code-out" className="sr-only">
            Your progress report code
          </label>
          <textarea
            id="report-code-out"
            readOnly
            value={code}
            rows={3}
            onFocus={(event) => event.currentTarget.select()}
            className="ket w-full rounded-xl border border-line bg-void/70 px-3 py-2.5 text-xs text-mute"
          />
          <button type="button" onClick={copy} className="btn btn-primary mt-2 text-sm">
            {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
            <span aria-live="polite">{copied ? t({ en: "Copied", hi: "Copied" }) : t({ en: "Copy the code", hi: "Code copy karo" })}</span>
          </button>
        </div>
      )}
    </section>
  );
}
