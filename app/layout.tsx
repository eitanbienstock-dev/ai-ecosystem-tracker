import type { Metadata } from "next";
import "./globals.css";
import NavHeader from "./NavHeader";

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
        <NavHeader />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
