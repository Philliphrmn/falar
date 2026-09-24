"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./AppProvider";
import { LoginForm } from "./LoginForm";
import { Wordmark } from "./Wordmark";
import { IconBook, IconFlame, IconList, IconPath, IconRepeat, IconSettings } from "./icons";

const NAV = [
  { href: "/", label: "Lernen", Icon: IconPath },
  { href: "/wiederholen", label: "Wiederholen", Icon: IconRepeat },
  { href: "/vokabeln", label: "Vokabeln", Icon: IconList },
  { href: "/grammatik", label: "Grammatik", Icon: IconBook },
  { href: "/einstellungen", label: "Einstellungen", Icon: IconSettings },
];

/** Seitenrahmen mit Navigation; zeigt das Login, solange niemand angemeldet ist. */
export function Shell({ children }: { children: React.ReactNode }) {
  const { session, authReady, streak, dueIds, error } = useApp();
  const pathname = usePathname();

  if (!authReady) return <div className="min-h-screen" />;
  if (!session) return <LoginForm />;

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-6 px-4">
          <Link href="/"><Wordmark /></Link>
          <nav className="hidden flex-1 gap-1 sm:flex">
            {NAV.slice(0, 4).map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-1.5 text-sm transition hover:bg-surface-2 ${
                  pathname === href ? "bg-surface-2 font-medium" : "text-muted"
                }`}
              >
                {label}
                {href === "/wiederholen" && dueIds.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-accent px-1.5 text-xs text-accent-ink">{dueIds.length}</span>
                )}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 sm:ml-0">
            <span className="flex items-center gap-1 text-sm text-warm" title="Tage in Folge">
              <IconFlame className="h-4 w-4" /> {streak}
            </span>
            <Link href="/einstellungen" className="hidden text-muted hover:text-ink sm:block" aria-label="Einstellungen">
              <IconSettings />
            </Link>
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto mt-4 max-w-4xl px-4">
          <p className="rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">Fehler beim Laden: {error}</p>
        </div>
      )}

      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-bg/95 backdrop-blur sm:hidden">
        {NAV.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
              pathname === href ? "text-accent" : "text-muted"
            }`}
          >
            <Icon />
            {label.replace("Einstellungen", "Mehr")}
            {href === "/wiederholen" && dueIds.length > 0 && (
              <span className="absolute right-[22%] top-1 h-2 w-2 rounded-full bg-accent" />
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
