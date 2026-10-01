import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonView } from "@/components/LessonView";
import { LESSONS, lessonFor } from "@/data/concepts";
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
  return <LessonView topic={lesson.id} lesson={lesson} />;
}
