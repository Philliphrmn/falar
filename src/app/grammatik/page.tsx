import { Shell } from "@/components/Shell";
import { GrammarCard } from "@/components/SessionRunner";
import { course } from "@/content";

export const metadata = { title: "Grammatik – falar" };

export default function GrammarPage() {
  return (
    <Shell>
      <h1 className="font-serif text-3xl">Grammatik &amp; Aussprache</h1>
      <p className="mt-2 text-muted">Alle Erklärungen aus den Lektionen zum Nachschlagen.</p>
      {course.map((unit) => (
        <section key={unit.id} className="mt-10">
          <h2 className="mb-4 text-sm uppercase tracking-wide text-muted">{unit.title}</h2>
          <div className="space-y-4">
            {unit.lessons.map((l) => (
              <div key={l.id} id={l.id} className="space-y-4">
                {l.grammar && <GrammarCard note={l.grammar} />}
                {l.sound && <GrammarCard note={l.sound} label="Aussprache" />}
              </div>
            ))}
          </div>
        </section>
      ))}
    </Shell>
  );
}
