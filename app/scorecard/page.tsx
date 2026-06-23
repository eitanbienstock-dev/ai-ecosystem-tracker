import { supabase, Company, Score } from "@/lib/supabase";
import { getLivePrice } from "@/lib/marketData";
import ScorecardTable from "../ScorecardTable";

export const dynamic = "force-dynamic";

const MIN_N = 20;
const MIN_AVG_DAYS = 30;

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 2) return null;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0,
    denX = 0,
    denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  if (denX === 0 || denY === 0) return null;
  return num / Math.sqrt(denX * denY);
}

export default async function ScorecardPage() {
  const { data: scores } = await supabase.from("scores").select("*").order("scored_at", { ascending: true });
  const { data: companies } = await supabase.from("companies").select("*");

  const companyById = new Map<string, Company>();
  for (const c of (companies ?? []) as Company[]) companyById.set(c.id, c);

  const tickers = Array.from(new Set((companies ?? []).map((c: any) => c.ticker).filter(Boolean)));
  const liveByTicker = new Map<string, number>();
  await Promise.all(
    tickers.map(async (t) => {
      const p = await getLivePrice(t as string);
      if (p) liveByTicker.set(t as string, p.price);
    })
  );

  const allScores = (scores ?? []) as Score[];

  // Full history, used only for the accuracy metric, not displayed as rows
  const graded = allScores
    .map((s) => {
      const company = companyById.get(s.company_id);
      const livePrice = company?.ticker ? liveByTicker.get(company.ticker) ?? null : null;
      const priceThen = s.price_at_scoring ? Number(s.price_at_scoring) : null;
      const changePct = priceThen && livePrice ? ((livePrice - priceThen) / priceThen) * 100 : null;
      const daysSince = Math.round((Date.now() - new Date(s.scored_at).getTime()) / 86_400_000);
      return { confidence: s.confidence_score, composite: s.composite_score, changePct, daysSince };
    })
    .filter((r) => r.changePct !== null);

  const n = graded.length;
  const avgDays = n > 0 ? graded.reduce((a, r) => a + r.daysSince, 0) / n : 0;
  const meetsThreshold = n >= MIN_N && avgDays >= MIN_AVG_DAYS;
  const confidenceCorr = meetsThreshold
    ? pearson(graded.map((r) => r.confidence ?? 0), graded.map((r) => r.changePct as number))
    : null;
  const compositeCorr = meetsThreshold
    ? pearson(graded.map((r) => r.composite ?? 0), graded.map((r) => r.changePct as number))
    : null;

  // Display rows: one per company, latest score only
  const latestByCompany = new Map<string, Score>();
  for (const s of allScores) latestByCompany.set(s.company_id, s); // ascending order, last write wins

  const rows = Array.from(latestByCompany.values()).map((s) => {
    const company = companyById.get(s.company_id);
    const livePrice = company?.ticker ? liveByTicker.get(company.ticker) ?? null : null;
    const priceThen = s.price_at_scoring ? Number(s.price_at_scoring) : null;
    const changePct = priceThen && livePrice ? ((livePrice - priceThen) / priceThen) * 100 : null;
    const daysSince = Math.round((Date.now() - new Date(s.scored_at).getTime()) / 86_400_000);
    return {
      id: s.id,
      name: company?.name ?? "Unknown",
      ticker: company?.ticker ?? null,
      scoredAt: s.scored_at,
      daysSince,
      composite: s.composite_score,
      confidence: s.confidence_score,
      priceThen,
      priceNow: livePrice,
      changePct,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#e7e8ea]">Scorecard</h1>
        <p className="max-w-2xl text-sm text-muted">
          One row per company, its most recent score, the price when that score was made, and the price now.
          Click a column header to change the sort order.
        </p>
      </div>

      <div className="mb-6 rounded border border-line bg-panel p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">System accuracy</p>
        {meetsThreshold ? (
          <div className="flex gap-8">
            <div>
              <p className="text-[10px] text-muted">Confidence ↔ forward return</p>
              <p className="font-mono text-2xl font-bold text-signal">
                {confidenceCorr !== null ? confidenceCorr.toFixed(2) : "not yet available"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted">Composite ↔ forward return</p>
              <p className="font-mono text-2xl font-bold text-signal">
                {compositeCorr !== null ? compositeCorr.toFixed(2) : "not yet available"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#cfd1d5]">
            Accumulating data: {n} of {MIN_N} graded scores, averaging {avgDays.toFixed(1)} of {MIN_AVG_DAYS}{" "}
            days tracked. A number appears here once both thresholds are met.
          </p>
        )}
        <p className="mt-3 text-[11px] text-muted">
          Correlation between confidence, and separately composite score, and each stock&apos;s return since
          it was scored, across every score on record. A positive number for confidence means scores backed
          by more verified, primary-source data have tended to outperform scores resting on thinner or
          unconfirmed inputs, a test of whether data reliability itself predicts returns, not a
          price-direction forecast on its own.
        </p>
      </div>

      <ScorecardTable rows={rows} />
    </div>
  );
}
