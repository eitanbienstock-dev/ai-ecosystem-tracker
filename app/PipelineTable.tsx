"use client";

import { useState } from "react";
import Link from "next/link";
import { Company, Score } from "@/lib/supabase";
import { movePipelineRank, archiveCompany } from "@/lib/actions";

type Row = {
  company: Company;
  score: Score | undefined;
  signal?: { overdue: number; newlyResolved: number; reviewDue: boolean };
};

const dimLabels = ["ecosystem", "financial", "ai moat", "management", "catalyst", "valuation"];
const dimWeights = [25, 20, 15, 15, 15, 10];

export default function PipelineTable({ rows }: { rows: Row[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"default" | "composite" | "confidence">("default");
  const [pending, setPending] = useState<string | null>(null);

  const displayRows =
    sortBy === "default"
      ? rows
      : [...rows].sort((a, b) => {
          const primary =
            sortBy === "composite"
              ? [a.score?.composite_score ?? -1, b.score?.composite_score ?? -1]
              : [a.score?.confidence_score ?? -1, b.score?.confidence_score ?? -1];
          const diff = primary[1] - primary[0];
          if (diff !== 0) return diff;
          const secondary =
            sortBy === "composite"
              ? [a.score?.confidence_score ?? -1, b.score?.confidence_score ?? -1]
              : [a.score?.composite_score ?? -1, b.score?.composite_score ?? -1];
          return secondary[1] - secondary[0];
        });

  function headerButton(label: string, key: "composite" | "confidence") {
    const active = sortBy === key;
    return (
      <button onClick={() => setSortBy(active ? "default" : key)} className={active ? "text-signal" : ""}>
        {label} {active && "↓"}
      </button>
    );
  }

  async function move(companyId: string, direction: "up" | "down") {
    setPending(companyId);
    await movePipelineRank(companyId, direction);
    setPending(null);
  }

  return (
    <div className="overflow-hidden rounded border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-panel text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3">Rank</th>
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">{headerButton("Composite", "composite")}</th>
            <th className="px-4 py-3">{headerButton("Confidence", "confidence")}</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map(({ company: c, score: s, signal }, i) => (
            <>
              <tr key={c.id} className="border-b border-line bg-panel/40 hover:bg-panelhi">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="w-5 font-mono text-xs text-muted">{i + 1}</span>
                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={sortBy !== "default" || i === 0 || pending === c.id}
                        onClick={() => move(c.id, "up")}
                        title="Move up"
                        className="leading-none text-muted hover:text-signal disabled:opacity-20"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={sortBy !== "default" || i === displayRows.length - 1 || pending === c.id}
                        onClick={() => move(c.id, "down")}
                        title="Move down"
                        className="leading-none text-muted hover:text-signal disabled:opacity-20"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/companies/${c.id}`} className="font-medium text-[#e7e8ea]">
                    {c.name}
                  </Link>{" "}
                  <span
                    className="cursor-pointer font-mono text-xs text-muted hover:text-signal"
                    onClick={() => setOpenId(openId === c.id ? null : c.id)}
                  >
                    {c.ticker}
                  </span>
                  {c.rejection_reason && (
                    <span className="ml-2 text-xs text-muted" title={`Previously rejected: ${c.rejection_reason}`}>
                      (previously passed)
                    </span>
                  )}
                  {signal && signal.newlyResolved > 0 && (
                    <span
                      className="badge ml-1.5 bg-rise/15 text-rise"
                      title="A catalyst was marked resolved in the last 30 days, new information worth a promotion decision"
                    >
                      new info
                    </span>
                  )}
                  {signal && signal.overdue > 0 && (
                    <span
                      className="badge ml-1.5 bg-signal/15 text-signal"
                      title="A catalyst's expected date has passed while still pending, worth checking what actually happened"
                    >
                      check due
                    </span>
                  )}
                  {signal && signal.reviewDue && (
                    <span
                      className="badge ml-1.5 bg-signal/15 text-signal"
                      title="The next review date you set for this company has arrived"
                    >
                      review due
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-sm text-[#e7e8ea]">{s?.composite_score ?? "—"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-sm text-[#e7e8ea]">{s?.confidence_score ?? "—"}/5</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/companies/${c.id}/promote`}
                      className="rounded border border-line px-3 py-1 text-xs hover:border-signal"
                    >
                      Promote to invested
                    </Link>
                    <form action={archiveCompany.bind(null, c.id)}>
                      <button
                        type="submit"
                        className="rounded border border-line px-3 py-1 text-xs text-muted hover:border-fall hover:text-fall"
                      >
                        Archive
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
              {openId === c.id && s && (
                <tr key={`${c.id}-rationale`} className="border-b border-line bg-panelhi">
                  <td colSpan={5} className="px-4 py-3">
                    <p className="mb-2 text-xs font-medium text-[#e7e8ea]">{c.name} — composite score breakdown</p>
                    {[
                      [s.ecosystem_position_score, s.ecosystem_position_note],
                      [s.financial_quality_score, s.financial_quality_note],
                      [s.ai_moat_score, s.ai_moat_note],
                      [s.management_ownership_score, s.management_ownership_note],
                      [s.catalyst_clarity_score, s.catalyst_clarity_note],
                      [s.valuation_score, s.valuation_note],
                    ].map(([v, n], di) => (
                      <div key={di} className="mb-1.5">
                        <span className="font-mono text-sm font-medium text-[#e7e8ea]">{v ?? "—"}</span>{" "}
                        <span className="text-xs text-muted">
                          {dimLabels[di]} ({dimWeights[di]}% weight)
                        </span>
                        {n && <div className="text-xs text-[#cfd1d5]">{n}</div>}
                      </div>
                    ))}
                    <div className="mt-2 border-t border-line pt-2">
                      <span className="font-mono text-sm font-medium text-[#e7e8ea]">{s.confidence_score}/5</span>{" "}
                      <span className="text-xs text-muted">confidence, how verified and stable the score inputs are</span>
                      {s.confidence_note && <div className="text-xs text-[#cfd1d5]">{s.confidence_note}</div>}
                      {s.watch_condition && (
                        <div className="mt-1 text-xs text-signal">Watching for: {s.watch_condition}</div>
                      )}
                    </div>
                    {s.ecosystem_synthesis && (
                      <p className="mt-2 rounded bg-panel p-2 text-xs text-signal">
                        <span className="font-medium">What the ecosystem position means: </span>
                        {s.ecosystem_synthesis}
                      </p>
                    )}
                    {s.thesis && <p className="mt-2 text-xs text-[#cfd1d5]">{s.thesis}</p>}
                    {s.biggest_risk && <p className="mt-1 text-xs text-fall">Risk: {s.biggest_risk}</p>}
                    <Link
                      href={`/companies/${c.id}`}
                      className="mt-3 inline-block text-xs text-signal hover:underline"
                    >
                      View full research (financials, management, moat, partnerships, catalysts) →
                    </Link>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
