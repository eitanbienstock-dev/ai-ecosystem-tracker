"use client";

import { useState } from "react";
import Link from "next/link";
import { Company, Score } from "@/lib/supabase";
import { restoreToPipeline } from "@/lib/actions";
import { formatDate } from "@/lib/format";

type Row = { company: Company; score: Score | undefined };

export default function ArchiveSection({ rows }: { rows: Row[] }) {
  const [open, setOpen] = useState(false);
  const exitedCount = rows.filter((r) => r.company.exit_date).length;
  const passedCount = rows.length - exitedCount;

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
        <div className="mt-2 overflow-hidden rounded border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-panel text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Composite</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Archived</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ company: c, score: s }) => (
                <>
                  <tr key={c.id} className="border-b border-line bg-panel/40 hover:bg-panelhi">
                    <td className="px-4 py-3">
                      <Link href={`/companies/${c.id}`} className="font-medium text-[#e7e8ea]">
                        {c.name}
                      </Link>{" "}
                      <span
                      className={`font-mono text-xs text-muted ${
                        (c.pending_digest_flags ?? []).length > 0 ? "rounded border border-signal px-1 ring-1 ring-signal" : ""
                      }`}
                    >
                      {c.ticker}
                    </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-[#e7e8ea]">{s?.composite_score ?? "not scored"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-[#e7e8ea]">{s?.confidence_score ?? "not graded"}/5</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {c.exit_date
                        ? `exited ${formatDate(c.exit_date)}${c.exit_price ? ` at $${c.exit_price}` : ""}`
                        : `passed ${c.last_reviewed_at ? formatDate(c.last_reviewed_at) : "unknown date"}`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={restoreToPipeline.bind(null, c.id)}>
                        <button
                          type="submit"
                          className="rounded border border-line px-3 py-1 text-xs hover:border-signal"
                        >
                          Move to pipeline
                        </button>
                      </form>
                    </td>
                  </tr>
                  {c.archive_reason && (
                    <tr key={`${c.id}-reason`} className="border-b border-line bg-panelhi last:border-0">
                      <td colSpan={5} className="px-4 py-2 text-xs text-[#cfd1d5]">
                        <span className="font-medium text-muted">Why archived: </span>
                        {c.archive_reason}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
