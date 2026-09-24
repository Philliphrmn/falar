import { notFound } from "next/navigation";
import { allLessons, getLesson } from "@/content";
import { LessonClient } from "@/components/LessonClient";

export function generateStaticParams() {
  return allLessons.map((l) => ({ id: l.id }));
}

export default async function LessonPage(props: PageProps<"/lektion/[id]">) {
  const { id } = await props.params;
  if (!getLesson(id)) notFound();
  return <LessonClient lessonId={id} />;
}
