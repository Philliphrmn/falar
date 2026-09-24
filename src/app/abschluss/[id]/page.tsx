import { notFound } from "next/navigation";
import { course } from "@/content";
import { UnitClient } from "@/components/UnitClient";

export function generateStaticParams() {
  return course.filter((u) => u.speaking).map((u) => ({ id: u.id }));
}

export default async function UnitPage(props: PageProps<"/abschluss/[id]">) {
  const { id } = await props.params;
  if (!course.some((u) => u.id === id && u.speaking)) notFound();
  return <UnitClient unitId={id} />;
}
