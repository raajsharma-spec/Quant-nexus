"use client";

import { useEffect, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ResetDemoDialog } from "@/components/ResetDemoDialog";
import { SystemStatus } from "@/components/SystemStatus";
import { DemoBadge, PageHeader } from "@/components/ui";
import { BACKEND_LABEL, checkQiskitService, qiskitApiUrl, type BackendId, type ServiceStatus } from "@/lib/execution";
import { LEVEL_LABEL } from "@/lib/learnerLevel";
import {
  DEFAULT_MASTERY_THRESHOLD,
  MAX_MASTERY_THRESHOLD,
  MIN_MASTERY_THRESHOLD,
  SHOT_OPTIONS,
} from "@/lib/storage";

export default function SettingsPage() {
  const { state, insights, t, actions } = useApp();
  const { settings, profile } = state;
  const [resetOpen, setResetOpen] = useState(false);
  const [service, setService] = useState<ServiceStatus | null>(null);
  const qiskitConfigured = qiskitApiUrl() !== null;

  useEffect(() => {
    let alive = true;
    checkQiskitService().then((status) => {
      if (alive) setService(status);
    });
    return () => {
      alive = false;
    };
  }, []);

  /** Everything this browser has saved, as a file the learner can keep. */
  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "quantum-nexus-learning-state.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const level = insights.learner;

  return (
    <>
      <PageHeader
        title="Settings"
        lead={t({
          en: "How Quantum Nexus behaves on this device. Changes are saved straight away.",
          hi: "Is device par Quantum Nexus kaise behave karta hai. Changes turant save hote hain.",
        })}
      >
        {state.mode === "demo" && <DemoBadge />}
      </PageHeader>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Learning */}
        <section aria-labelledby="learning-settings" className="panel p-5 sm:p-6">
          <h2 id="learning-settings" className="text-lg font-semibold">
            {t({ en: "Learning", hi: "Learning" })}
          </h2>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{t({ en: "Language", hi: "Language" })}</p>
              <p className="text-sm text-mute">
                {t({ en: "Quantum terms stay the same in both.", hi: "Quantum terms dono mein same rehte hain." })}
              </p>
            </div>
            <LanguageToggle />
          </div>

          <label className="mt-5 flex cursor-pointer items-start justify-between gap-4 border-t border-line pt-5">
            <span>
              <span className="block font-medium">{t({ en: "Advanced mode", hi: "Advanced mode" })}</span>
              <span className="block text-sm text-mute">
                {t({
                  en: "Keep state vectors, amplitudes, matrices and Bloch angles open, and show advanced gates in the lab.",
                  hi: "State vectors, amplitudes, matrices aur Bloch angles open rakho, aur lab mein advanced gates dikhao.",
                })}
              </span>
            </span>
            <input
              type="checkbox"
              checked={settings.advancedMode}
              onChange={(event) => actions.updateSettings({ advancedMode: event.target.checked })}
              className="mt-1 h-5 w-5 shrink-0 accent-[#5ad7f0]"
            />
          </label>

          <div className="mt-5 border-t border-line pt-5">
            <p className="font-medium">{t({ en: "Your level", hi: "Aapka level" })}</p>
            <p className="mt-1 text-sm text-mute">
              {t({
                en: "Never asked — worked out from what you do, and used to choose question difficulty.",
                hi: "Kabhi poochha nahi jaata — aapke kaam se samjha jaata hai, aur question difficulty choose karne mein use hota hai.",
              })}
            </p>
            <p className="mt-2 text-lg font-semibold">
              {LEVEL_LABEL[level.level]}
              {level.provisional && <span className="ml-2 text-sm font-normal text-mute">provisional</span>}
            </p>
            {level.evidence.length > 0 && <p className="text-sm text-dim">{level.evidence.join(" · ")}</p>}
          </div>

          <div className="mt-5 border-t border-line pt-5">
            <label htmlFor="settings-threshold" className="font-medium">
              {t({ en: "Mastery threshold", hi: "Mastery threshold" })}
            </label>
            <p className="mt-1 text-sm text-mute">
              {t({
                en: `The score a stage needs before the next stage opens. It can be raised, never set below ${MIN_MASTERY_THRESHOLD}%.`,
                hi: `Next stage open hone se pehle stage ko itna score chahiye. Ise badha sakte ho, ${MIN_MASTERY_THRESHOLD}% se neeche nahi kar sakte.`,
              })}
            </p>
            <div className="mt-3 flex items-center gap-4">
              <input
                id="settings-threshold"
                type="range"
                min={MIN_MASTERY_THRESHOLD}
                max={MAX_MASTERY_THRESHOLD}
                step={1}
                value={settings.masteryThreshold}
                onChange={(event) => actions.setThreshold(Number(event.target.value))}
                className="flex-1 accent-[#5ad7f0]"
              />
              <output htmlFor="settings-threshold" className="w-14 text-right text-xl font-semibold tabular-nums">
                {settings.masteryThreshold}%
              </output>
            </div>
            <button
              type="button"
              onClick={() => actions.setThreshold(DEFAULT_MASTERY_THRESHOLD)}
              disabled={settings.masteryThreshold === DEFAULT_MASTERY_THRESHOLD}
              className="mt-1 rounded text-sm text-mute hover:text-ink disabled:opacity-50"
            >
              {t({ en: `Reset to ${DEFAULT_MASTERY_THRESHOLD}%`, hi: `${DEFAULT_MASTERY_THRESHOLD}% par reset karo` })}
            </button>
          </div>
        </section>

        {/* Simulation */}
        <section aria-labelledby="simulation-settings" className="panel p-5 sm:p-6">
          <h2 id="simulation-settings" className="text-lg font-semibold">
            {t({ en: "Simulation", hi: "Simulation" })}
          </h2>

          <div role="group" aria-labelledby="shots-label" className="mt-4">
            <p id="shots-label" className="font-medium">
              {t({ en: "Shots per run", hi: "Shots per run" })}
            </p>
            <p className="text-sm text-mute">
              {t({
                en: "How many times a circuit is run to build its counts. More shots give steadier percentages.",
                hi: "Counts banane ke liye circuit kitni baar run hota hai. Zyada shots se percentages steady hote hain.",
              })}
            </p>
            <div className="mt-2 flex gap-2">
              {SHOT_OPTIONS.map((shots) => (
                <button
                  key={shots}
                  type="button"
                  onClick={() => actions.updateSettings({ shots })}
                  aria-pressed={settings.shots === shots}
                  className={`ket rounded-lg border px-3.5 py-2 font-semibold tabular-nums ${
                    settings.shots === shots ? "border-ket bg-ket/15 text-ket" : "border-line text-mute hover:text-ink"
                  }`}
                >
                  {shots.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 border-t border-line pt-5">
            <p className="font-medium">{t({ en: "Where circuits run", hi: "Circuits kahan run hote hain" })}</p>
            {qiskitConfigured ? (
              <div role="radiogroup" aria-label="Where circuits run" className="mt-2 flex flex-col gap-2">
                {(["browser", "qiskit"] as BackendId[]).map((backend) => (
                  <label
                    key={backend}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${
                      settings.backend === backend ? "border-ket bg-ket/10" : "border-line"
                    }`}
                  >
                    <input
                      type="radio"
                      name="backend"
                      checked={settings.backend === backend}
                      onChange={() => actions.updateSettings({ backend })}
                      className="mt-1 h-4 w-4 shrink-0 accent-[#5ad7f0]"
                    />
                    <span>
                      <span className="block font-medium">{BACKEND_LABEL[backend]}</span>
                      <span className="block text-sm text-mute">
                        {backend === "browser"
                          ? t({ en: "Always available. Runs on this device.", hi: "Hamesha available. Is device par run hota hai." })
                          : service === null
                            ? t({ en: "Checking…", hi: "Check ho raha hai…" })
                            : service.detail}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm leading-relaxed text-mute">
                {t({
                  en: "In the built-in quantum simulator, on this device. Every circuit is also written out as Qiskit, Cirq, PennyLane and OpenQASM code that you can run elsewhere.",
                  hi: "Built-in quantum simulator mein, isi device par. Har circuit Qiskit, Cirq, PennyLane aur OpenQASM code mein bhi likha jaata hai jise aap kahin aur run kar sakte ho.",
                })}
              </p>
            )}
          </div>
        </section>

        {/* System status */}
        <section aria-labelledby="status-settings" className="panel p-5 sm:p-6">
          <h2 id="status-settings" className="text-lg font-semibold">
            {t({ en: "System status", hi: "System status" })}
          </h2>
          <p className="mb-4 mt-1 text-sm text-mute">
            {t({
              en: "Every service this platform runs on, checked live when this page opens.",
              hi: "Yeh platform jin services par chalta hai, page khulte hi live check hoti hain.",
            })}
          </p>
          <SystemStatus />
        </section>

        {/* Data */}
        <section aria-labelledby="data-settings" className="panel p-5 sm:p-6">
          <h2 id="data-settings" className="text-lg font-semibold">
            {t({ en: "Your data", hi: "Aapka data" })}
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-mute">{t({ en: "Name", hi: "Name" })}</dt>
              <dd className="font-medium">{profile?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-mute">{t({ en: "Student id (this device)", hi: "Student id (yeh device)" })}</dt>
              <dd className="ket break-all text-xs">{profile?.id ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-mute">{t({ en: "Events recorded", hi: "Events recorded" })}</dt>
              <dd className="font-medium tabular-nums">{state.events.length}</dd>
            </div>
            <div>
              <dt className="text-mute">{t({ en: "Stored in", hi: "Stored in" })}</dt>
              <dd className="font-medium">{t({ en: "This browser only", hi: "Sirf yeh browser" })}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-relaxed text-mute">
            {t({
              en: "Progress, predictions, explanations and tutor questions are kept in this browser's local storage. There is no account and no server copy, so clearing the browser's site data removes them.",
              hi: "Progress, predictions, explanations aur tutor questions is browser ke local storage mein rehte hain. Koi account ya server copy nahi hai, isliye browser ka site data clear karne par yeh hat jaate hain.",
            })}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={exportData} className="btn btn-secondary text-sm">
              <Download size={15} aria-hidden />
              {t({ en: "Download my learning data", hi: "Mera learning data download karo" })}
            </button>
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="btn border border-warn/40 text-sm text-warn hover:bg-warn/10"
            >
              <RotateCcw size={15} aria-hidden />
              {t({ en: "Reset everything", hi: "Sab reset karo" })}
            </button>
          </div>
        </section>
      </div>

      <ResetDemoDialog open={resetOpen} onClose={() => setResetOpen(false)} />
    </>
  );
}
