import { Shell } from "@/components/Shell";
import { SettingsForm } from "@/components/SettingsForm";

export const metadata = { title: "Einstellungen – falar" };

export default function SettingsPage() {
  return (
    <Shell>
      <SettingsForm />
    </Shell>
  );
}
