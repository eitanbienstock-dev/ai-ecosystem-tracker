"use client";

import { useState } from "react";
import { Company } from "@/lib/supabase";

export default function ArchiveSection({ companies }: { companies: Company[] }) {
  const [open, setOpen] = useState(false);
  const passedCount = companies.filter((c) => c.research_status === "passed").length;
  const exitedCount = companies.filter((c) => c.research_status === "exited").length;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded border border-line px-4 py-2.5 text-sm text-muted hover:border-signal"
      >
        <span>
          Archive &middot; {passedCount} passed, {exitedCount} exited
        </span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {companies.map((c) => (
            <div key={c.id} className="rounded border border-line bg-panel p-3">
              <span className="font-medium text-[#e7e8ea]">{c.name}</span>{" "}
              <span className="font-mono text-xs text-muted">{c.ticker}</span>
              <p className="mt-1 text-xs text-muted">
                {c.research_status === "exited"
                  ? `Exited ${c.exit_date ?? ""}${c.exit_price ? ` at $${c.exit_price}` : ""}`
                  : c.rejection_reason}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
