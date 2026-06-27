import { supabase, Company, Score } from "@/lib/supabase";
import { latestScore } from "@/lib/portfolio";
import PortfolioSection from "./PortfolioSection";
import PipelineTable from "./PipelineTable";
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

  const { data: scoreRows } = await supabase.from("scores").select("*").order("scored_at", { ascending: true });
  const scoresByCompany: Record<string, Score[]> = {};
  for (const s of (scoreRows ?? []) as Score[]) {
    (scoresByCompany[s.company_id] ??= []).push(s);
  }

  const today = new Date().toISOString().slice(0, 10);

  // Signal computation covers all non-archived companies
  const trackedIds = list.filter((c) => c.research_status !== "archived").map((c) => c.id);
  const { data: pipelineCatalysts } = await supabase
    .from("catalysts")
    .select("*")
    .in("company_id", trackedIds.length ? trackedIds : ["00000000-0000-0000-0000-000000000000"]);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const signalByCompany = new Map<string, { overdue: number; newlyResolved: number; reviewDue: boolean }>();
  for (const cat of pipelineCatalysts ?? []) {
    const entry = signalByCompany.get(cat.company_id) ?? { overdue: 0, newlyResolved: 0, reviewDue: false };
    if (cat.status === "pending" && cat.expected_date && cat.expected_date <= today) entry.overdue += 1;
    // Only counts as "new info" if it was actually resolved after being logged,
    // a real transition during a check-in, not a catalyst that arrived already
    // resolved at the moment the company was first researched.
    const createdDate = cat.created_at ? String(cat.created_at).slice(0, 10) : null;
    if (cat.resolved_at && cat.resolved_at >= thirtyDaysAgo && createdDate && cat.resolved_at > createdDate) {
      entry.newlyResolved += 1;
    }
    signalByCompany.set(cat.company_id, entry);
  }
  for (const c of list) {
    if (c.research_status !== "archived" && c.next_review_date && c.next_review_date <= today) {
      const entry = signalByCompany.get(c.id) ?? { overdue: 0, newlyResolved: 0, reviewDue: false };
      entry.reviewDue = true;
      signalByCompany.set(c.id, entry);
    }
  }

  return (
    <div>
      <PortfolioSection />

      <div className="mb-10">
        <div className="mb-3">
          <h1 className="font-display text-2xl font-bold text-[#e7e8ea]">Watched Pipeline</h1>
          <p className="text-xs text-muted">includes current holdings alongside candidates, manually ranked, use the arrows to move a company up or down, or click Composite or Confidence to preview a different order</p>
        </div>
        {list.length === 0 ? (
          <div className="rounded border border-dashed border-line py-10 text-center">
            <p className="text-sm text-muted">No candidates in the pipeline.</p>
            <Link href="/companies/new" className="mt-3 inline-block text-sm text-signal hover:underline">
              + Add company
            </Link>
          </div>
        ) : (
          <PipelineTable
            rows={list.map((c) => ({
              company: c,
              score: latestScore(scoresByCompany[c.id]),
              signal: signalByCompany.get(c.id),
            }))}
          />
        )}
      </div>
    </div>
  );
}
