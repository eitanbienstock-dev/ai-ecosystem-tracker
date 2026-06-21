import { supabase, Company, Score, DecisionLogEntry } from "@/lib/supabase";
import { computeTargetWeights, computePositionValues, entryScore, latestScore, daysHeld } from "@/lib/portfolio";
import PortfolioCard from "./PortfolioCard";
import PipelineTable from "./PipelineTable";
import ArchiveSection from "./ArchiveSection";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { data: companies, error } = await supabase.from("companies").select("*");
  if (error) {
    return (
      <div className="rounded border border-fall/40 bg-fall/10 p-4 text-sm text-fall">
        Could not load companies: {error.message}
      </div>
    );
  }

  const list = (companies ?? []) as Company[];
  const invested = list.filter((c) => c.research_status === "invested");
  const pipeline = list.filter((c) => ["watching", "researching", "active_watch"].includes(c.research_status));
  const archive = list.filter((c) => ["passed", "exited"].includes(c.research_status));

  const { data: scoreRows } = await supabase.from("scores").select("*").order("scored_at", { ascending: true });
  const scoresByCompany: Record<string, Score[]> = {};
  for (const s of (scoreRows ?? []) as Score[]) {
    (scoresByCompany[s.company_id] ??= []).push(s);
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: overdueCatalysts } = await supabase
    .from("catalysts")
    .select("company_id")
    .eq("status", "pending")
    .lt("expected_date", today);
  const overdueCountByCompany = new Map<string, number>();
  for (const row of overdueCatalysts ?? []) {
    overdueCountByCompany.set(row.company_id, (overdueCountByCompany.get(row.company_id) ?? 0) + 1);
  }

  pipeline.sort(
    (a, b) =>
      (latestScore(scoresByCompany[b.id])?.composite_score ?? -1) -
      (latestScore(scoresByCompany[a.id])?.composite_score ?? -1)
  );

  const targetWeights = computeTargetWeights(invested, scoresByCompany);
  const { valueByCompany, totalValue } = await computePositionValues(invested);

  const investedIds = invested.map((c) => c.id);
  const { data: logRows } = await supabase
    .from("decision_log")
    .select("*")
    .in("company_id", investedIds.length ? investedIds : ["00000000-0000-0000-0000-000000000000"])
    .order("entry_date", { ascending: false });
  const logByCompany: Record<string, DecisionLogEntry[]> = {};
  for (const l of (logRows ?? []) as DecisionLogEntry[]) {
    (logByCompany[l.company_id] ??= []).push(l);
  }

  return (
    <div>
      <div className="mb-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h1 className="font-display text-2xl font-bold text-[#e7e8ea]">Portfolio</h1>
          <span className="font-mono text-sm text-muted">{invested.length} holdings</span>
        </div>
        {invested.length === 0 ? (
          <div className="rounded border border-dashed border-line py-10 text-center">
            <p className="text-sm text-muted">No holdings yet. Built one at a time, no fixed slot count.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {invested.map((c) => {
              const target = targetWeights.get(c.id) ?? 0;
              const value = valueByCompany.get(c.id) ?? 0;
              const currentW = totalValue > 0 ? (value / totalValue) * 100 : 0;
              return (
                <PortfolioCard
                  key={c.id}
                  data={{
                    company: c,
                    currentScore: latestScore(scoresByCompany[c.id]),
                    entryScoreVal: entryScore(scoresByCompany[c.id], c.entry_date),
                    targetWeight: target,
                    effectiveTargetWeight: c.target_weight_override_pct ?? target,
                    currentWeight: currentW,
                    daysHeld: daysHeld(c.entry_date),
                    overdueCatalystCount: overdueCountByCompany.get(c.id) ?? 0,
                    log: logByCompany[c.id] ?? [],
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="mb-10">
        <div className="mb-3">
          <h1 className="font-display text-2xl font-bold text-[#e7e8ea]">Pipeline</h1>
          <p className="text-xs text-muted">ranked by composite score &middot; candidates for the next deliberate addition</p>
        </div>
        {pipeline.length === 0 ? (
          <div className="rounded border border-dashed border-line py-10 text-center">
            <p className="text-sm text-muted">No candidates in the pipeline.</p>
            <Link href="/companies/new" className="mt-3 inline-block text-sm text-signal hover:underline">
              + Add company
            </Link>
          </div>
        ) : (
          <PipelineTable rows={pipeline.map((c) => ({ company: c, score: latestScore(scoresByCompany[c.id]) }))} />
        )}
      </div>

      <ArchiveSection companies={archive} />
    </div>
  );
}
