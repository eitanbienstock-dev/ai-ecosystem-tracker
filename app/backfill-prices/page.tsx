import { supabase } from "@/lib/supabase";
import { getHistoricalPrice } from "@/lib/marketData";

export const dynamic = "force-dynamic";

export default async function BackfillPricesPage() {
  const { data: scores, error } = await supabase
    .from("scores")
    .select("id, company_id, scored_at, price_at_scoring")
    .is("price_at_scoring", null);

  if (error) {
    return <div className="text-fall">Could not load scores: {error.message}</div>;
  }

  const results: { company: string; status: string }[] = [];

  for (const s of scores ?? []) {
    const { data: company } = await supabase
      .from("companies")
      .select("name, ticker")
      .eq("id", s.company_id)
      .single();

    if (!company?.ticker) {
      results.push({ company: company?.name ?? s.company_id, status: "skipped, no ticker" });
      continue;
    }

    const price = await getHistoricalPrice(company.ticker, s.scored_at);

    if (price === null) {
      results.push({ company: company.name, status: "Finnhub returned no data for this date" });
      continue;
    }

    const { error: updateError } = await supabase
      .from("scores")
      .update({
        price_at_scoring: price,
        price_at_scoring_date: s.scored_at,
        price_source: "finnhub_historical_backfill",
      })
      .eq("id", s.id);

    results.push({
      company: company.name,
      status: updateError ? `update failed: ${updateError.message}` : `backfilled at $${price.toFixed(2)}`,
    });
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display mb-4 text-xl font-bold text-[#e7e8ea]">Price backfill</h1>
      {results.length === 0 ? (
        <p className="text-sm text-muted">Nothing to backfill, every score already has a price.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {results.map((r, i) => (
            <div key={i} className="rounded border border-line bg-panel p-3 text-sm">
              <span className="font-medium text-[#e7e8ea]">{r.company}</span>: {r.status}
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-muted">
        Safe to revisit, already-backfilled scores are skipped automatically.
      </p>
    </div>
  );
}
