import { Shell } from "@/components/Shell";
import { Vocabulary } from "@/components/Vocabulary";

export const metadata = { title: "Vokabeln – falar" };

export default function VocabPage() {
  return (
    <Shell>
      <Vocabulary />
    </Shell>
  );
}
