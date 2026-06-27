import { supabase, Company, Score, Partnership } from "@/lib/supabase";
import { promoteToInvested } from "@/lib/actions";
import { latestScore } from "@/lib/portfolio";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PromotePage({ params }: { params: { id: string } }) {
  const { data: company } = await supabase.from("companies").select("*").eq("id", params.id).single();
  if (!company) notFound();
  const c = company as Company;

  if (c.research_status === "invested") {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="font-display mb-2 text-2xl font-bold text-[#e7e8ea]">{c.name} is already invested</h1>
        <p className="text-sm text-muted">
          This company already has real capital deployed. Use Trim or Exit on its portfolio card on the
          homepage to change the position, not this page, which is only for promoting a new candidate.
        </p>
      </div>
    );
  }

  const { data: investedCompanies } = await supabase
    .from("companies")
    .select("id, name, ai_category")
    .eq("research_status", "invested");
  const invested = (investedCompanies ?? []) as Pick<Company, "id" | "name" | "ai_category">[];
  const investedIds = invested.map((x) => x.id);

  const { data: scoreRows } = await supabase
    .from("scores")
    .select("*")
    .in("company_id", [...investedIds, c.id])
    .order("scored_at", { ascending: true });

  const scoresByCompany: Record<string, Score[]> = {};
  for (const s of (scoreRows ?? []) as Score[]) {
    (scoresByCompany[s.company_id] ??= []).push(s);
  }

  const candidateLatest = latestScore(scoresByCompany[c.id]);
  const candidateScore = candidateLatest?.composite_score ?? 0;
  const candidateConfidence = candidateLatest?.confidence_score ?? null;
  const existingScores = investedIds.map((id) => latestScore(scoresByCompany[id])?.composite_score ?? 0);
  const sum = existingScores.reduce((a, b) => a + b, 0) + candidateScore;
  const previewTarget = sum > 0 ? Math.round((candidateScore / sum) * 100) : 0;

  const categoryOverlap = c.ai_category
    ? invested.filter((h) => h.ai_category === c.ai_category)
    : [];

  const { data: allPartnerships } = await supabase
    .from("partnerships")
    .select("*")
    .in("company_id", [...investedIds, c.id]);
  const candidatePartners = new Set(
    ((allPartnerships ?? []) as Partnership[])
      .filter((p) => p.company_id === c.id)
      .map((p) => p.partner_name)
  );
  const partnerOverlap: { partner: string; holdings: string[] }[] = [];
  if (candidatePartners.size > 0) {
    const byPartner = new Map<string, Set<string>>();
    for (const p of (allPartnerships ?? []) as Partnership[]) {
      if (p.company_id === c.id || !candidatePartners.has(p.partner_name)) continue;
      const holding = invested.find((h) => h.id === p.company_id);
      if (!holding) continue;
      (byPartner.get(p.partner_name) ?? byPartner.set(p.partner_name, new Set()).get(p.partner_name)!).add(
        holding.name
      );
    }
    for (const [partner, holdings] of byPartner.entries()) {
      partnerOverlap.push({ partner, holdings: Array.from(holdings) });
    }
  }

  const boundPromote = async (formData: FormData) => {
    "use server";
    await promoteToInvested(params.id, formData);
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display mb-2 text-2xl font-bold text-[#e7e8ea]">Promote {c.name}</h1>
      <p className="mb-3 text-sm text-muted">
        Composite <span className="font-mono text-[#e7e8ea]">{candidateLatest?.composite_score ?? "not scored"}</span>
        {" "}&middot; confidence <span className="font-mono text-[#e7e8ea]">{candidateConfidence ?? "not graded"}/5</span>
      </p>
      {candidateConfidence !== null && candidateConfidence < 3 && (
        <p className="mb-3 rounded bg-signal/10 p-2 text-xs text-signal">
          Confidence is {candidateConfidence}/5, below the usual 3/5 floor for committing capital. Not blocked,
          just worth confirming the underlying data is solid enough before sizing a real position.
        </p>
      )}
      {categoryOverlap.length > 0 && (
        <p className="mb-3 rounded bg-signal/10 p-2 text-xs text-signal">
          Same AI category as {categoryOverlap.map((h) => h.name).join(", ")}, already in the portfolio. Not
          blocked, just a concentration flag worth weighing alongside conviction in this specific name.
        </p>
      )}
      {partnerOverlap.length > 0 && (
        <div className="mb-3 rounded bg-signal/10 p-2 text-xs text-signal">
          <p>Shares a disclosed partner with current holdings:</p>
          <ul className="ml-3 list-disc">
            {partnerOverlap.map((row) => (
              <li key={row.partner}>
                {row.partner}, also disclosed by {row.holdings.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mb-6 text-sm text-muted">
        Suggested target weight if added now:{" "}
        <span className="font-mono font-medium text-[#e7e8ea]">{previewTarget}%</span>, recalculated across all{" "}
        {investedIds.length + 1} holdings. Existing targets will shift to make room, automatically, the next time
        the homepage loads.
      </p>
      <form action={boundPromote} className="rounded border border-line bg-panel p-6">
        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Entry price ($)</span>
          <input name="entry_price" type="number" step="0.01" required className="input" />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Shares</span>
          <input name="shares" type="number" required className="input" />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
            Note (optional, becomes the first decision log entry)
          </span>
          <textarea name="note" rows={3} className="input" placeholder="Why now, why this size" />
        </label>
        <button
          type="submit"
          className="rounded bg-signal px-4 py-2 text-sm font-semibold text-ink hover:bg-signal/90"
        >
          Confirm initiate position
        </button>
      </form>
    </div>
  );
}
