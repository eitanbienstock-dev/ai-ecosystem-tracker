"use client";

import { useState } from "react";
import { Company } from "@/lib/supabase";
import { restoreToPipeline } from "@/lib/actions";

export default function ArchiveSection({ companies }: { companies: Company[] }) {
  const [open, setOpen] = useState(false);
  const exitedCount = companies.filter((c) => c.exit_date).length;
  const passedCount = companies.length - exitedCount;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded border border-line px-4 py-2.5 text-sm text-muted hover:border-signal"
      >
        <span>
          Archived &middot; {passedCount} passed, {exitedCount} exited
        </span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {companies.map((c) => (
            <div key={c.id} className="rounded border border-line bg-panel p-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-medium text-[#e7e8ea]">{c.name}</span>{" "}
                  <span className="font-mono text-xs text-muted">{c.ticker}</span>
                  <span className="ml-2 text-xs text-muted">
                    {c.exit_date
                      ? `exited ${c.exit_date}`
                      : `passed ${c.last_reviewed_at ?? "unknown date"}`}
                  </span>
                </div>
                <form action={restoreToPipeline.bind(null, c.id)}>
                  <button
                    type="submit"
                    className="rounded border border-line px-3 py-1 text-xs hover:border-signal"
                  >
                    Move to pipeline
                  </button>
                </form>
              </div>
              <p className="mt-1 text-xs text-muted">
                {c.exit_date
                  ? `${c.exit_price ? `Exit price $${c.exit_price}. ` : ""}`
                  : c.rejection_reason}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
