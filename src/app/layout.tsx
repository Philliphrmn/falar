import type { Metadata, Viewport } from "next";
import { Geist, Fraunces } from "next/font/google";
import { AppProvider } from "@/components/AppProvider";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "falar – Portugiesisch lernen",
  description: "Europäisches Portugiesisch lernen: Lektionen, Hören, Sprechen, Grammatik und Wiederholung.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#11151b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${geist.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
