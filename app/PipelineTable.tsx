"use client";

import { useState } from "react";
import Link from "next/link";
import { Company, Score } from "@/lib/supabase";
import { movePipelineRank, archiveCompany, restoreToPipeline } from "@/lib/actions";
import ArchiveControl from "./ArchiveControl";

type Row = {
  company: Company;
  score: Score | undefined;
  signal?: { overdue: number; newlyResolved: number; reviewDue: boolean };
};

type Filter = "all" | "watched" | "holding" | "exited" | "archived";

const dimLabels = ["ecosystem", "financial", "ai moat", "management", "catalyst", "valuation"];
const dimWeights = [25, 20, 15, 15, 15, 10];

const PIPELINE_STATUSES = new Set(["pipeline", "watched", "invested", "holding", "exited"]);

function statusBadge(status: string) {
  switch (status) {
    case "pipeline":
    case "watched":
      return <span className="badge bg-[#3a3a3a] text-muted">Watched</span>;
    case "holding":
    case "invested":
      return <span className="badge bg-rise/15 text-rise">Holding</span>;
    case "exited":
      return <span className="badge bg-blue-500/15 text-blue-400">Exited</span>;
    case "archived":
      return <span className="badge bg-muted/10 text-muted">Archived</span>;
    default:
      return <span className="badge bg-muted/10 text-muted">{status}</span>;
  }
}

const FILTER_LABELS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "watched", label: "Watched" },
  { key: "holding", label: "Holding" },
  { key: "exited", label: "Exited" },
  { key: "archived", label: "Archived" },
];

function matchesFilter(status: string, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "holding") return status === "holding" || status === "invested";
  return status === filter;
}

export default function PipelineTable({ rows }: { rows: Row[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"default" | "composite" | "confidence">("confidence");
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, setPending] = useState<string | null>(null);

  const counts = Object.fromEntries(
    FILTER_LABELS.map(({ key }) => [
      key,
      rows.filter(({ company: c }) => matchesFilter(c.research_status, key)).length,
    ])
  ) as Record<Filter, number>;

  const sorted =
    sortBy === "default"
      ? [...rows].sort(
          (a, b) =>
            (a.company.pipeline_order ?? 999) - (b.company.pipeline_order ?? 999)
        )
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

  const displayRows = sorted.filter(({ company: c }) =>
    matchesFilter(c.research_status, filter)
  );

  function headerButton(label: string, key: "composite" | "confidence") {
    const active = sortBy === key;
    return (
      <button onClick={() => setSortBy(active ? "default" : key)} className={active ? "text-signal" : ""}>
        {label} {active && "▲"}
      </button>
    );
  }

  async function move(companyId: string, direction: "up" | "down") {
    setPending(companyId);
    await movePipelineRank(companyId, direction);
    setPending(null);
  }

  const canRank = (c: Company, i: number) =>
    sortBy === "default" &&
    PIPELINE_STATUSES.has(c.research_status) &&
    c.research_status !== "exited" &&
    pending !== c.id;

  return (
    <div>
      {/* Filter chips */}
      <div className="mb-3 flex flex-wrap gap-2">
        {FILTER_LABELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              filter === key
                ? "bg-signal font-medium text-black"
                : "border border-line text-muted hover:border-signal hover:text-[#e7e8ea]"
            }`}
          >
            {label}
            {counts[key] > 0 && (
              <span className={`ml-1.5 font-mono text-xs ${filter === key ? "text-black/70" : "text-muted"}`}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded border border-line">
        {/* Horizontal scroll wrapper — keeps table columns intact on narrow screens */}
        <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-panel text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">{headerButton("Composite", "composite")}</th>
                <th className="px-4 py-3">{headerButton("Confidence", "confidence")}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map(({ company: c, score: s, signal }, i) => (
                <tr key={c.id} className="border-b border-line bg-panel/40 hover:bg-panelhi">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="w-5 font-mono text-xs text-muted">{i + 1}</span>
                      <div className="flex flex-col">
                        <button
                          type="button"
                          disabled={!canRank(c, i) || i === 0}
                          onClick={() => move(c.id, "up")}
                          title="Move up"
                          className="leading-none text-muted hover:text-signal disabled:opacity-20"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={!canRank(c, i) || i === displayRows.length - 1}
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
                      className={`cursor-pointer font-mono text-xs text-muted hover:text-signal ${
                        (c.pending_digest_flags ?? []).length > 0
                          ? "rounded border border-signal px-1 ring-1 ring-signal"
                          : ""
                      }`}
                      onClick={() => setOpenId(openId === c.id ? null : c.id)}
                      title={
                        (c.pending_digest_flags ?? []).length > 0
                          ? "A research digest entry may require updating this company"
                          : undefined
                      }
                    >
                      {c.ticker}
                    </span>
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
                    {c.archive_reason && filter === "archived" && (
                      <p className="mt-1 text-xs text-muted">
                        <span className="font-medium">Archived: </span>
                        {c.archive_reason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">{statusBadge(c.research_status)}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-[#e7e8ea]">
                      {s?.composite_score ?? "not scored"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-[#e7e8ea]">
                      {s?.confidence_score ?? "not graded"}/5
                    </span>
                  </td>
                  <td className="relative px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {(c.research_status === "pipeline" || c.research_status === "watched") && (
                        <>
                          <Link
                            href={`/companies/${c.id}/promote`}
                            className="rounded border border-line px-3 py-1 text-xs hover:border-signal whitespace-nowrap"
                          >
                            Add to portfolio
                          </Link>
                          <ArchiveControl companyId={c.id} />
                        </>
                      )}
                      {(c.research_status === "exited" || c.research_status === "archived") && (
                        <form action={restoreToPipeline.bind(null, c.id)}>
                          <button
                            type="submit"
                            className="rounded border border-line px-3 py-1 text-xs hover:border-signal whitespace-nowrap"
                          >
                            Move to pipeline
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {displayRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                    No companies with this status.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Score breakdown panel — rendered outside the table to avoid DOM nesting issues */}
      {displayRows.map(({ company: c, score: s }) =>
        openId === c.id && s ? (
          <div key={`${c.id}-rationale`} className="mt-1 rounded border border-line bg-panelhi px-4 py-3">
            <p className="mb-2 text-xs font-medium text-[#e7e8ea]">
              composite score breakdown for {c.name}
            </p>
            {[
              [s.ecosystem_position_score, s.ecosystem_position_note],
              [s.financial_quality_score, s.financial_quality_note],
              [s.ai_moat_score, s.ai_moat_note],
              [s.management_ownership_score, s.management_ownership_note],
              [s.catalyst_clarity_score, s.catalyst_clarity_note],
              [s.valuation_score, s.valuation_note],
            ].map(([v, n], di) => (
              <div key={di} className="mb-1.5">
                <span className="font-mono text-sm font-medium text-[#e7e8ea]">{v ?? "not scored"}</span>{" "}
                <span className="text-xs text-muted">
                  {dimLabels[di]} ({dimWeights[di]}% weight)
                </span>
                {n && <div className="text-xs text-[#cfd1d5]">{n as string}</div>}
              </div>
            ))}
            <div className="mt-2 border-t border-line pt-2">
              <span className="font-mono text-sm font-medium text-[#e7e8ea]">{s.confidence_score}/5</span>{" "}
              <span className="text-xs text-muted">
                confidence, how verified and stable the score inputs are
              </span>
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
          </div>
        ) : null
      )}
    </div>
  );
}
