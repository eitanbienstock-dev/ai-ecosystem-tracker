import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Ecosystem Tracker",
  description: "Internal research and scoring tool for AI ecosystem investing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-body antialiased">
        <header className="border-b border-line bg-panel">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-display text-lg font-bold text-signal">
              AI Ecosystem Tracker
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/methodology"
                className="rounded border border-line bg-panelhi px-3 py-1.5 text-sm font-medium text-[#e7e8ea] hover:border-signal hover:text-signal"
              >
                Methodology
              </Link>
              <Link
                href="/scorecard"
                className="rounded border border-line bg-panelhi px-3 py-1.5 text-sm font-medium text-[#e7e8ea] hover:border-signal hover:text-signal"
              >
                Scorecard
              </Link>
              <Link
                href="/audit"
                className="rounded border border-line bg-panelhi px-3 py-1.5 text-sm font-medium text-[#e7e8ea] hover:border-signal hover:text-signal"
              >
                Data quality
              </Link>
              <Link
                href="/research"
                className="rounded border border-line bg-panelhi px-3 py-1.5 text-sm font-medium text-[#e7e8ea] hover:border-signal hover:text-signal"
              >
                Research digest
              </Link>
              <Link
                href="/dashboard"
                className="rounded border border-line bg-panelhi px-3 py-1.5 text-sm font-medium text-[#e7e8ea] hover:border-signal hover:text-signal"
              >
                Coverage map
              </Link>
              <Link
                href="/infrastructure"
                className="rounded border border-line bg-panelhi px-3 py-1.5 text-sm font-medium text-[#e7e8ea] hover:border-signal hover:text-signal"
              >
                AI stack
              </Link>
              <Link
                href="/companies/new"
                className="rounded border border-line bg-panelhi px-3 py-1.5 text-sm font-medium text-[#e7e8ea] hover:border-signal hover:text-signal"
              >
                + Add company
              </Link>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
