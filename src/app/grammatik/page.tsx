import { Shell } from "@/components/Shell";
import { GrammarCard } from "@/components/SessionRunner";
import { course } from "@/content";

export const metadata = { title: "Grammatik – falar" };

export default function GrammarPage() {
  return (
    <Shell>
      <h1 className="font-serif text-3xl">Grammatik</h1>
      <p className="mt-2 text-muted">Alle Erklärungen aus den Lektionen zum Nachschlagen.</p>
      {course.map((unit) => (
        <section key={unit.id} className="mt-10">
          <h2 className="mb-4 text-sm uppercase tracking-wide text-muted">{unit.title}</h2>
          <div className="space-y-4">
            {unit.lessons
              .filter((l) => l.grammar)
              .map((l) => (
                <div key={l.id} id={l.id}>
                  <GrammarCard note={l.grammar!} />
                </div>
              ))}
          </div>
        </section>
      ))}
    </Shell>
  );
}
