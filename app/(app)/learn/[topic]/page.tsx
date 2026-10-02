import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConceptJourney } from "@/components/journey/ConceptJourney";
import { LessonView } from "@/components/LessonView";
import { LESSONS, lessonFor } from "@/data/concepts";
import { conceptContent } from "@/data/curriculum";
import { topicTitle } from "@/data/topics";
import type { TopicId } from "@/lib/types";

/** Any other /learn/… address is a 404. */
export const dynamicParams = false;

/** Pre-build one page per lesson: /learn/qubit, /learn/gates, /learn/superposition … */
export function generateStaticParams() {
  return Object.keys(LESSONS).map((topic) => ({ topic }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic } = await params;
  return { title: lessonFor(topic as TopicId) ? topicTitle(topic as TopicId) : "Lesson" };
}

export default async function LessonPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const lesson = lessonFor(topic as TopicId);
  if (!lesson) notFound();

  // Quantum concepts are a 13-stage journey. Python Foundations is an optional warm-up lesson.
  if (conceptContent(lesson.id)) {
    return (
      <Suspense fallback={<p className="text-mute">Loading the concept…</p>}>
        <ConceptJourney topic={lesson.id} />
      </Suspense>
    );
  }
  return <LessonView topic={lesson.id} lesson={lesson} />;
}
