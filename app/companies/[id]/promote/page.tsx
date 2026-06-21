import { supabase, Company, Score } from "@/lib/supabase";
import { promoteToInvested } from "@/lib/actions";
import { latestScore } from "@/lib/portfolio";
import { notFound } from "next/navigation";

export default async function PromotePage({ params }: { params: { id: string } }) {
  const { data: company } = await supabase.from("companies").select("*").eq("id", params.id).single();
  if (!company) notFound();
  const c = company as Company;

  const { data: invested } = await supabase.from("companies").select("id").eq("research_status", "invested");
  const investedIds = (invested ?? []).map((x) => x.id);

  const { data: scoreRows } = await supabase
    .from("scores")
    .select("*")
    .in("company_id", [...investedIds, c.id])
    .order("scored_at", { ascending: true });

  const scoresByCompany: Record<string, Score[]> = {};
  for (const s of (scoreRows ?? []) as Score[]) {
    (scoresByCompany[s.company_id] ??= []).push(s);
  }

  const existingScores = investedIds.map((id) => latestScore(scoresByCompany[id])?.composite_score ?? 0);
  const candidateScore = latestScore(scoresByCompany[c.id])?.composite_score ?? 0;
  const sum = existingScores.reduce((a, b) => a + b, 0) + candidateScore;
  const previewTarget = sum > 0 ? Math.round((candidateScore / sum) * 100) : 0;

  const boundPromote = async (formData: FormData) => {
    "use server";
    await promoteToInvested(params.id, formData);
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display mb-2 text-2xl font-bold text-[#e7e8ea]">Promote {c.name}</h1>
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
