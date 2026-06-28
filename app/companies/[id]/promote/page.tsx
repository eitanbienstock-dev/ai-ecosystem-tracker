import { supabase, Company, Score, Partnership } from "@/lib/supabase";
import { latestScore } from "@/lib/portfolio";
import { notFound } from "next/navigation";
import PromoteClientForm from "./PromoteClientForm";

export const dynamic = "force-dynamic";

export default async function PromotePage({ params }: { params: { id: string } }) {
  const { data: company } = await supabase.from("companies").select("*").eq("id", params.id).single();
  if (!company) notFound();
  const c = company as Company;

  if (c.research_status === "holding") {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="font-display mb-2 text-2xl font-bold text-[#e7e8ea]">
          {c.name} is already in the portfolio
        </h1>
        <p className="text-sm text-muted">
          This company already has real capital deployed. Use the portfolio section on the homepage to view
          or manage positions.
        </p>
      </div>
    );
  }

  const { data: holdingCompanies } = await supabase
    .from("companies")
    .select("id, name, ai_category")
    .in("research_status", ["holding"]);
  const holding = (holdingCompanies ?? []) as Pick<Company, "id" | "name" | "ai_category">[];
  const holdingIds = holding.map((x) => x.id);

  const { data: scoreRows } = await supabase
    .from("scores")
    .select("*")
    .in("company_id", [...holdingIds, c.id])
    .order("scored_at", { ascending: true });

  const scoresByCompany: Record<string, Score[]> = {};
  for (const s of (scoreRows ?? []) as Score[]) {
    (scoresByCompany[s.company_id] ??= []).push(s);
  }

  const candidateLatest = latestScore(scoresByCompany[c.id]);
  const candidateScore = candidateLatest?.composite_score ?? 0;
  const candidateConfidence = candidateLatest?.confidence_score ?? null;
  const existingScores = holdingIds.map((id) => latestScore(scoresByCompany[id])?.composite_score ?? 0);
  const sum = existingScores.reduce((a, b) => a + b, 0) + candidateScore;
  const previewTarget = sum > 0 ? Math.round((candidateScore / sum) * 100) : 0;

  const categoryOverlap = c.ai_category
    ? holding.filter((h) => h.ai_category === c.ai_category)
    : [];

  const { data: allPartnerships } = await supabase
    .from("partnerships")
    .select("*")
    .in("company_id", [...holdingIds, c.id]);
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
      const h = holding.find((h) => h.id === p.company_id);
      if (!h) continue;
      (
        byPartner.get(p.partner_name) ??
        byPartner.set(p.partner_name, new Set()).get(p.partner_name)!
      ).add(h.name);
    }
    for (const [partner, holdings] of byPartner.entries()) {
      partnerOverlap.push({ partner, holdings: Array.from(holdings) });
    }
  }

  const { data: portfoliosData } = await supabase
    .from("portfolios")
    .select("id, name, description")
    .order("created_at", { ascending: true });
  const portfolios = (portfoliosData ?? []) as {
    id: string;
    name: string;
    description: string | null;
  }[];

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display mb-2 text-2xl font-bold text-[#e7e8ea]">Promote {c.name}</h1>
      <p className="mb-3 text-sm text-muted">
        Composite{" "}
        <span className="font-mono text-[#e7e8ea]">
          {candidateLatest?.composite_score ?? "not scored"}
        </span>{" "}
        &middot; confidence{" "}
        <span className="font-mono text-[#e7e8ea]">{candidateConfidence ?? "not graded"}/5</span>
      </p>
      {candidateConfidence !== null && candidateConfidence < 3 && (
        <p className="mb-3 rounded bg-signal/10 p-2 text-xs text-signal">
          Confidence is {candidateConfidence}/5, below the usual 3/5 floor for committing capital. Not
          blocked, just worth confirming the underlying data is solid enough before sizing a real position.
        </p>
      )}
      {categoryOverlap.length > 0 && (
        <p className="mb-3 rounded bg-signal/10 p-2 text-xs text-signal">
          Same AI category as {categoryOverlap.map((h) => h.name).join(", ")}, already in the portfolio.
          Not blocked, just a concentration flag worth weighing alongside conviction in this specific name.
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
        <span className="font-mono font-medium text-[#e7e8ea]">{previewTarget}%</span>, recalculated
        across all {holdingIds.length + 1} holdings. Existing targets will shift to make room,
        automatically, the next time the homepage loads.
      </p>

      <PromoteClientForm
        companyId={params.id}
        companyName={c.name}
        initialPortfolios={portfolios}
      />
    </div>
  );
}
