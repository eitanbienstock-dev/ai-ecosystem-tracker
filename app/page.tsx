import Link from "next/link";
import { supabase, Company, Score } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function statusColor(status: string) {
  switch (status) {
    case "invested":
      return "bg-rise/15 text-rise";
    case "active_watch":
      return "bg-signal/15 text-signal";
    case "exited":
    case "passed":
      return "bg-line text-muted";
    default:
      return "bg-panelhi text-muted";
  }
}

function trajectoryColor(t: string | null) {
  if (t === "strengthening") return "text-rise";
  if (t === "weakening") return "text-fall";
  return "text-muted";
}

function scoreColor(score: number | null) {
  if (score === null) return "text-muted";
  if (score >= 65) return "text-rise";
  if (score >= 50) return "text-signal";
  return "text-muted";
}

function formatMarketCap(value: number | null) {
  if (value === null) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  return `$${value}`;
}

export default async function HomePage() {
  const { data: companies, error } = await supabase
    .from("companies")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded border border-fall/40 bg-fall/10 p-4 text-sm text-fall">
        Could not load companies: {error.message}
      </div>
    );
  }

  const { data: scores } = await supabase
    .from("scores")
    .select("*")
    .order("scored_at", { ascending: false });

  const latestScoreByCompany = new Map<string, Score>();
  for (const s of (scores ?? []) as Score[]) {
    if (!latestScoreByCompany.has(s.company_id)) {
      latestScoreByCompany.set(s.company_id, s);
    }
  }

  const list = ((companies ?? []) as Company[]).sort((a, b) => {
    const scoreA = latestScoreByCompany.get(a.id)?.composite_score ?? -1;
    const scoreB = latestScoreByCompany.get(b.id)?.composite_score ?? -1;
    return scoreB - scoreA;
  });

  if (list.length === 0) {
    return (
      <div className="rounded border border-dashed border-line py-16 text-center">
        <p className="font-display text-lg text-[#e7e8ea]">No companies tracked yet</p>
        <p className="mt-2 text-sm text-muted">
          Add the first name on your midcap watchlist to get started.
        </p>
        <Link
          href="/companies/new"
          className="mt-4 inline-block rounded border border-signal px-4 py-2 text-sm font-medium text-signal hover:bg-signal/10"
        >
          + Add company
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-bold text-[#e7e8ea]">Watchlist</h1>
        <span className="font-mono text-sm text-muted">{list.length} tracked</span>
      </div>

      <div className="overflow-hidden rounded border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-panel text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Sector</th>
              <th className="px-4 py-3">Market cap</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ecosystem trajectory</th>
              <th className="px-4 py-3">Score</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr
                key={c.id}
                className="border-b border-line bg-panel/40 last:border-0 hover:bg-panelhi"
              >
                <td className="px-4 py-3">
                  <Link href={`/companies/${c.id}`} className="block">
                    <span className="font-medium text-[#e7e8ea]">{c.name}</span>
                    {c.ticker && (
                      <span className="ml-2 font-mono text-xs text-muted">{c.ticker}</span>
                    )}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">
                  {(c.sector_tags ?? []).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 font-mono text-[#e7e8ea]">
                  <span
                    className="cursor-help underline decoration-dotted decoration-muted underline-offset-2"
                    title={
                      c.market_cap === null
                        ? "Not yet researched"
                        : `Source: ${c.market_cap_source ?? "not recorded"} · As of ${c.market_cap_updated_at ?? "unknown date"}`
                    }
                  >
                    {formatMarketCap(c.market_cap)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${statusColor(c.research_status)}`}>
                    {c.research_status.replace("_", " ")}
                  </span>
                </td>
                <td className={`px-4 py-3 ${trajectoryColor(c.ecosystem_trajectory)}`}>
                  {c.ecosystem_trajectory ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const score = latestScoreByCompany.get(c.id);
                    if (!score || score.composite_score === null) {
                      return <span className="text-muted">not scored</span>;
                    }
                    return (
                      <span
                        className={`cursor-help font-mono font-semibold ${scoreColor(score.composite_score)}`}
                        title={score.thesis ?? ""}
                      >
                        {score.composite_score}
                        <span className="ml-1 text-xs text-muted">
                          · conviction {score.conviction_score ?? "—"}/5
                        </span>
                      </span>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
