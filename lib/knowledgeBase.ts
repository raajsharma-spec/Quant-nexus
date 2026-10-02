/**
 * Retrieval over the verified knowledge base (data/knowledge.ts).
 *
 * This is the "R" of retrieval-augmented tutoring, done locally: the learner's
 * question is matched against every entry and the best ones are returned with
 * a score. The tutor then builds its answer ONLY from what was retrieved and
 * shows which entries it used. If nothing matches well enough, the tutor says
 * so instead of making something up.
 *
 * The matching is lexical (weighted keywords with inverse document frequency).
 * A production build would swap this function for embeddings in pgvector and
 * pass the retrieved text to an LLM — the tutor's interface would not change.
 */

import { KNOWLEDGE, type KnowledgeEntry } from "@/data/knowledge";
import { normalizeText } from "./misconceptions";
import type { TopicId } from "./types";

const STOPWORDS = new Set(
  (
    "a an the is are was were be been being am do does did done have has had of in on at to for from by with " +
    "and or but if then so as it its this that these those i you we they he she me my your our their what which " +
    "who whom how why when where can could would should will shall may might must not no yes about into over " +
    "tell explain please simply simple give show me us more again just very really " +
    "kya kyun kaise kab kahan hai hain ho hota hoti hote tha thi the ka ki ke ko se par mein aur ya to bhi nahi " +
    "mujhe mera meri humein batao samjhao karo karta karti karte kar raha rahi yeh woh is us ek"
  ).split(" ")
);

/** Light stemming so "gates", "measuring" and "measured" meet "gate" and "measure". */
function stem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3);
  if (word.endsWith("ed") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
}

/** Turn text into search tokens. Single-letter gate names become "gate_h", "gate_x" … */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];

  // "H gate", "the X gate", "H|0⟩", "h on 0" and a bare capital letter all mean a gate.
  const gateLetters = new Set<string>();
  for (const match of text.matchAll(/\b([hxyzstHXYZST])[\s-]*(gate|gates)\b/g)) gateLetters.add(match[1].toLowerCase());
  for (const match of text.matchAll(/(?:^|[^A-Za-z])([HXYZST])(?=$|[^A-Za-z'’])/g)) gateLetters.add(match[1].toLowerCase());
  gateLetters.forEach((letter) => tokens.push(`gate_${letter}`));

  const aliases: Record<string, string> = {
    hadamard: "gate_h",
    cnot: "cx",
    toffoli: "ccx",
    entangled: "entanglement",
    entangle: "entanglement",
    superposed: "superposition",
    measurement: "measure",
    probabilities: "probability",
    amplitudes: "amplitude",
    visualise: "visualize",
  };

  for (const raw of normalizeText(text).split(/[^a-z0-9/√]+/)) {
    if (!raw || raw.length < 2 || STOPWORDS.has(raw)) continue;
    tokens.push(aliases[raw] ?? stem(raw));
  }
  return tokens;
}

interface Indexed {
  entry: KnowledgeEntry;
  /** Tokens of the entry's title: what the entry is ABOUT. */
  title: Set<string>;
  strong: Set<string>;
  body: Set<string>;
  phrases: string[];
}

let index: Indexed[] | null = null;
let documentFrequency: Map<string, number> | null = null;

function build(): { index: Indexed[]; df: Map<string, number> } {
  if (index && documentFrequency) return { index, df: documentFrequency };
  const built: Indexed[] = KNOWLEDGE.map((entry) => {
    const strong = new Set<string>([
      ...tokenize(entry.title),
      ...entry.keywords.flatMap((keyword) => tokenize(keyword)),
      ...(entry.concept ? tokenize(entry.concept) : []),
    ]);
    const bodyText = [entry.simple, entry.why, entry.deeper, entry.math]
      .filter(Boolean)
      .map((text) => `${text!.en} ${text!.hi}`)
      .join(" ");
    const body = new Set<string>(tokenize(bodyText));
    const phrases = entry.keywords.filter((keyword) => keyword.includes(" ")).map((keyword) => normalizeText(keyword));
    return { entry, title: new Set(tokenize(entry.title)), strong, body, phrases };
  });
  const df = new Map<string, number>();
  for (const item of built) {
    new Set([...item.strong, ...item.body]).forEach((token) => df.set(token, (df.get(token) ?? 0) + 1));
  }
  index = built;
  documentFrequency = df;
  return { index: built, df };
}

export interface Retrieval {
  entry: KnowledgeEntry;
  /** Higher is a better match. Only comparable within one query. */
  score: number;
}

/** A match must reach this score to be used at all. */
export const MIN_RETRIEVAL_SCORE = 4;

/**
 * Find the knowledge-base entries that best match a question.
 * `topic` gives a small boost to the concept the learner is currently studying.
 */
export function retrieve(query: string, options: { topic?: TopicId; limit?: number } = {}): Retrieval[] {
  const { index: items, df } = build();
  const tokens = Array.from(new Set(tokenize(query)));
  if (tokens.length === 0) return [];
  const normalizedQuery = normalizeText(query);
  const total = items.length;

  const scored: Retrieval[] = [];
  for (const item of items) {
    let score = 0;
    let matched = 0;
    for (const token of tokens) {
      const idf = Math.log(1 + total / (df.get(token) ?? total));
      if (item.strong.has(token)) score += 3 * idf;
      else if (item.body.has(token)) score += 1 * idf;
      else continue;
      matched += 1;
    }
    // One stray word in common is not a match: an entry must cover at least
    // half of what was asked ("Who won the cricket match?" shares only "match").
    if (matched * 2 < tokens.length) continue;
    // A question that names what an entry is about ("What is superposition?")
    // should find that entry even when the word is common across the course.
    // Shorter titles win ties, so the entry on the idea itself comes first.
    const titleHits = tokens.filter((token) => item.title.has(token)).length;
    if (titleHits > 0) score += (3 * titleHits) / tokens.length + 1 / item.title.size;
    // An exact keyword phrase in the question is strong evidence.
    for (const phrase of item.phrases) {
      if (normalizedQuery.includes(phrase)) score += 2 + phrase.split(" ").length;
    }
    if (score > 0 && options.topic && item.entry.topic === options.topic) score *= 1.15;
    if (score >= MIN_RETRIEVAL_SCORE) scored.push({ entry: item.entry, score: Math.round(score * 100) / 100 });
  }

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0]?.score ?? 0;
  // Keep only matches that are close to the best one.
  return scored.filter((r) => r.score >= best * 0.6).slice(0, options.limit ?? 3);
}

/** Facts about the knowledge base, used by the health check and the tutor page. */
export function knowledgeStats(): { entries: number; verified: number; version: string; updatedAt: string } {
  const verified = KNOWLEDGE.filter((entry) => entry.meta.verified && entry.meta.status === "published");
  return {
    entries: KNOWLEDGE.length,
    verified: verified.length,
    version: KNOWLEDGE[0]?.meta.version ?? "0",
    updatedAt: KNOWLEDGE[0]?.meta.updatedAt ?? "",
  };
}
