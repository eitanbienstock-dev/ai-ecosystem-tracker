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
  const { data: scores } = await supabase.from("scores").select("*").order("scored_at", { ascending: false });
  const { data: companies } = await supabase.from("companies").select("*");

  const companyById = new Map<string, Company>();
  for (const c of (companies ?? []) as Company[]) companyById.set(c.id, c);

  // Dedupe live price fetches per ticker
  const tickers = Array.from(new Set((companies ?? []).map((c: any) => c.ticker).filter(Boolean)));
  const liveByTicker = new Map<string, number>();
  await Promise.all(
    tickers.map(async (t) => {
      const p = await getLivePrice(t as string);
      if (p) liveByTicker.set(t as string, p.price);
    })
  );

  const allScores = (scores ?? []) as Score[];
  const rows = allScores.map((s) => {
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
      conviction: s.conviction_score,
      priceThen,
      priceNow: livePrice,
      changePct,
    };
  });

  // Accuracy metric: correlation between conviction (and composite) and forward
  // return, across every score that has both a starting price and a current
  // price. Gated behind minimum sample size and minimum average days tracked,
  // a correlation computed on same-day data is not a measurement.
  const usable = rows.filter((r) => r.changePct !== null);
  const n = usable.length;
  const avgDays = n > 0 ? usable.reduce((a, r) => a + r.daysSince, 0) / n : 0;
  const meetsThreshold = n >= MIN_N && avgDays >= MIN_AVG_DAYS;

  const convictionCorr = meetsThreshold
    ? pearson(usable.map((r) => r.conviction ?? 0), usable.map((r) => r.changePct as number))
    : null;
  const compositeCorr = meetsThreshold
    ? pearson(usable.map((r) => r.composite ?? 0), usable.map((r) => r.changePct as number))
    : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#e7e8ea]">Scorecard</h1>
        <p className="max-w-2xl text-sm text-muted">
          Every score graded against what the stock actually did since. This is the feedback loop the rest of
          the system was missing, conviction and composite score are opinions until something measures
          whether they were right.
        </p>
      </div>

      <div className="mb-6 rounded border border-line bg-panel p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">System accuracy</p>
        {meetsThreshold ? (
          <div className="flex gap-8">
            <div>
              <p className="text-[10px] text-muted">Conviction ↔ forward return</p>
              <p className="font-mono text-2xl font-bold text-signal">
                {convictionCorr !== null ? convictionCorr.toFixed(2) : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted">Composite ↔ forward return</p>
              <p className="font-mono text-2xl font-bold text-signal">
                {compositeCorr !== null ? compositeCorr.toFixed(2) : "—"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#cfd1d5]">
            Not enough data to mean anything yet: {n} of {MIN_N} graded scores, averaging{" "}
            {avgDays.toFixed(1)} of {MIN_AVG_DAYS} days tracked. A correlation computed below this threshold
            is statistical noise, not a measurement, so no number is shown until both bars are cleared.{" "}
            {n > 0 && avgDays < 3 && (
              <span>
                Worth knowing: every score was just re-scored today, which resets this clock to zero in
                exchange for better-calibrated data. That trade was made deliberately, not accidentally.
              </span>
            )}
          </p>
        )}
        <p className="mt-3 text-[11px] text-muted">
          What this measures: correlation between conviction (or composite score) and the stock&apos;s
          forward return since that score was made, across every score ever recorded, not just the latest
          per company. A positive number means higher-conviction names have tended to outperform
          lower-conviction names since being scored, the same concept funds call an information coefficient.
          It does not mean conviction predicts direction in an absolute sense, conviction is a portfolio-fit
          judgment, not a price forecast.
        </p>
      </div>

      <ScorecardTable rows={rows} />
    </div>
  );
}
