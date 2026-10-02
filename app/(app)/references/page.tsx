import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { REFERENCES, RESEARCH_GAP } from "@/data/references";

export const metadata: Metadata = { title: "References" };

export default function ReferencesPage() {
  return (
    <>
      <PageHeader
        title="References and further learning"
        lead="Resources from other organisations: where to study further, and the landscape this project was compared against. They are not Quantum Nexus content, and the tutor never quotes them as a source."
      />

      <section aria-labelledby="gap-title" className="panel-lead p-5 sm:p-7">
        <h2 id="gap-title" className="text-xl font-semibold">
          The gap Quantum Nexus works on
        </h2>
        <p className="mt-2 max-w-[76ch] leading-relaxed text-mute">{RESEARCH_GAP.existing}</p>
        <p className="mt-2 max-w-[76ch] leading-relaxed">{RESEARCH_GAP.contribution}</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {RESEARCH_GAP.parts.map((part) => (
            <li key={part} className="tag border-ket/35 text-ink/90">
              {part}
            </li>
          ))}
        </ul>
      </section>

      <ul className="mt-5 grid gap-4 lg:grid-cols-2">
        {REFERENCES.map((reference) => (
          <li key={reference.id} className="panel flex flex-col p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="tag text-mute">{reference.kind}</span>
              <span className="text-sm text-dim">{reference.owner}</span>
            </div>
            <h2 className="mt-2 text-lg font-semibold">{reference.name}</h2>
            <dl className="mt-2 flex flex-col gap-2 text-[0.9375rem] leading-relaxed">
              <div>
                <dt className="text-sm font-medium text-ok">What it offers</dt>
                <dd className="text-ink/90">{reference.offers}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-phase">How Quantum Nexus differs</dt>
                <dd className="text-ink/90">{reference.gap}</dd>
              </div>
            </dl>
            <div className="mt-auto pt-4">
              <a
                href={reference.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-ket hover:underline"
              >
                {reference.url.replace(/^https:\/\//, "")}
                <ExternalLink size={14} aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-5 max-w-[80ch] text-sm leading-relaxed text-dim">
        The descriptions above are our own short summaries, written for comparison. Names and trademarks belong to
        their owners. The lessons, questions and tutor answers inside Quantum Nexus are written for this project and
        kept in its own verified knowledge base.
      </p>
    </>
  );
}
