import { supabase, Company, Score } from "@/lib/supabase";
import { getLivePrice } from "@/lib/marketData";
import { computeBenchmarkRow } from "@/lib/portfolio";
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

  const invested = (companies ?? []).filter((c: any) => c.research_status === "holding") as Company[];
  const benchmarkTickers = Array.from(new Set(invested.map((c) => c.benchmark_ticker).filter(Boolean) as string[]));
  const liveBenchmarkByTicker = new Map<string, number>();
  await Promise.all(
    benchmarkTickers.map(async (t) => {
      const p = await getLivePrice(t);
      if (p) liveBenchmarkByTicker.set(t, p.price);
    })
  );
  const sectorBenchmarkTickers = Array.from(
    new Set(invested.map((c) => c.sector_benchmark_ticker).filter(Boolean) as string[])
  );
  const liveSectorBenchmarkByTicker = new Map<string, number>();
  await Promise.all(
    sectorBenchmarkTickers.map(async (t) => {
      const p = await getLivePrice(t);
      if (p) liveSectorBenchmarkByTicker.set(t, p.price);
    })
  );

  const benchmarkRows = invested.map((c) => {
    const livePrice = c.ticker ? liveByTicker.get(c.ticker) ?? null : null;
    const liveBenchmarkPrice = c.benchmark_ticker ? liveBenchmarkByTicker.get(c.benchmark_ticker) ?? null : null;
    const liveSectorBenchmarkPrice = c.sector_benchmark_ticker
      ? liveSectorBenchmarkByTicker.get(c.sector_benchmark_ticker) ?? null
      : null;
    const { holdingReturnPct, benchmarkReturnPct, excessPct, sectorBenchmarkReturnPct, sectorExcessPct } =
      computeBenchmarkRow(c, livePrice, liveBenchmarkPrice, liveSectorBenchmarkPrice);
    const value = (c.shares_held ?? 0) * (livePrice ?? c.entry_price ?? 0);
    return {
      company: c,
      holdingReturnPct,
      benchmarkReturnPct,
      excessPct,
      sectorBenchmarkReturnPct,
      sectorExcessPct,
      value,
    };
  });
  const totalBenchmarkableValue = benchmarkRows
    .filter((r) => r.excessPct !== null)
    .reduce((a, r) => a + r.value, 0);
  const weightedHoldingReturn =
    totalBenchmarkableValue > 0
      ? benchmarkRows
          .filter((r) => r.excessPct !== null)
          .reduce((a, r) => a + (r.holdingReturnPct ?? 0) * (r.value / totalBenchmarkableValue), 0)
      : null;
  const weightedBenchmarkReturn =
    totalBenchmarkableValue > 0
      ? benchmarkRows
          .filter((r) => r.excessPct !== null)
          .reduce((a, r) => a + (r.benchmarkReturnPct ?? 0) * (r.value / totalBenchmarkableValue), 0)
      : null;
  const totalSectorBenchmarkableValue = benchmarkRows
    .filter((r) => r.sectorExcessPct !== null)
    .reduce((a, r) => a + r.value, 0);
  const weightedSectorBenchmarkReturn =
    totalSectorBenchmarkableValue > 0
      ? benchmarkRows
          .filter((r) => r.sectorExcessPct !== null)
          .reduce((a, r) => a + (r.sectorBenchmarkReturnPct ?? 0) * (r.value / totalSectorBenchmarkableValue), 0)
      : null;

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

      <div className="mb-6 rounded border border-line bg-panel p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Portfolio vs benchmark</p>
        {benchmarkRows.length === 0 ? (
          <p className="text-sm text-muted">No invested holdings yet.</p>
        ) : (
          <>
            <div className="mb-3 flex gap-8">
              <div>
                <p className="text-[10px] text-muted">Portfolio return since entry, value-weighted</p>
                <p className="font-mono text-2xl font-bold text-[#e7e8ea]">
                  {weightedHoldingReturn !== null ? `${weightedHoldingReturn >= 0 ? "+" : ""}${weightedHoldingReturn.toFixed(1)}%` : "not yet available"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted">S&amp;P 500 over the same entry windows</p>
                <p className="font-mono text-2xl font-bold text-muted">
                  {weightedBenchmarkReturn !== null ? `${weightedBenchmarkReturn >= 0 ? "+" : ""}${weightedBenchmarkReturn.toFixed(1)}%` : "not yet available"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted">SOXX semiconductor index, same windows</p>
                <p className="font-mono text-2xl font-bold text-muted">
                  {weightedSectorBenchmarkReturn !== null ? `${weightedSectorBenchmarkReturn >= 0 ? "+" : ""}${weightedSectorBenchmarkReturn.toFixed(1)}%` : "not yet available"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted">Excess vs S&amp;P 500</p>
                <p
                  className={`font-mono text-2xl font-bold ${
                    weightedHoldingReturn !== null && weightedBenchmarkReturn !== null
                      ? weightedHoldingReturn - weightedBenchmarkReturn >= 0
                        ? "text-rise"
                        : "text-fall"
                      : "text-muted"
                  }`}
                >
                  {weightedHoldingReturn !== null && weightedBenchmarkReturn !== null
                    ? `${weightedHoldingReturn - weightedBenchmarkReturn >= 0 ? "+" : ""}${(weightedHoldingReturn - weightedBenchmarkReturn).toFixed(1)}pts`
                    : "not yet available"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted">Excess vs sector</p>
                <p
                  className={`font-mono text-2xl font-bold ${
                    weightedHoldingReturn !== null && weightedSectorBenchmarkReturn !== null
                      ? weightedHoldingReturn - weightedSectorBenchmarkReturn >= 0
                        ? "text-rise"
                        : "text-fall"
                      : "text-muted"
                  }`}
                >
                  {weightedHoldingReturn !== null && weightedSectorBenchmarkReturn !== null
                    ? `${weightedHoldingReturn - weightedSectorBenchmarkReturn >= 0 ? "+" : ""}${(weightedHoldingReturn - weightedSectorBenchmarkReturn).toFixed(1)}pts`
                    : "not yet available"}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              {benchmarkRows.map((r) => (
                <p key={r.company.id} className="text-xs text-muted">
                  <span className="font-medium text-[#e7e8ea]">{r.company.name}</span>{" "}
                  {r.holdingReturnPct !== null ? `${r.holdingReturnPct >= 0 ? "+" : ""}${r.holdingReturnPct.toFixed(1)}%` : "not yet available"}
                  {" vs "}
                  {r.company.benchmark_ticker ?? "benchmark"}{" "}
                  {r.benchmarkReturnPct !== null ? `${r.benchmarkReturnPct >= 0 ? "+" : ""}${r.benchmarkReturnPct.toFixed(1)}%` : "not yet available"}
                  {r.excessPct !== null && (
                    <span className={r.excessPct >= 0 ? "text-rise" : "text-fall"}>
                      {" "}({r.excessPct >= 0 ? "+" : ""}{r.excessPct.toFixed(1)}pts)
                    </span>
                  )}
                  {" / vs "}
                  {r.company.sector_benchmark_ticker ?? "sector"}{" "}
                  {r.sectorBenchmarkReturnPct !== null ? `${r.sectorBenchmarkReturnPct >= 0 ? "+" : ""}${r.sectorBenchmarkReturnPct.toFixed(1)}%` : "not yet available"}
                  {r.sectorExcessPct !== null && (
                    <span className={r.sectorExcessPct >= 0 ? "text-rise" : "text-fall"}>
                      {" "}({r.sectorExcessPct >= 0 ? "+" : ""}{r.sectorExcessPct.toFixed(1)}pts)
                    </span>
                  )}
                </p>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted">
              Each holding is compared against both the S&amp;P 500 and the SOXX semiconductor index over the
              same window, from that holding&apos;s own entry date to now, not a shared calendar period, since
              capital was deployed on different dates. The sector benchmark exists because a concentrated AI
              infrastructure book can beat the broad market just by being in a hot sector during a sector
              boom, that alone is not evidence of selection skill. Beating SOXX specifically is a more honest
              signal. The aggregate weights each holding by its current position value.
            </p>
          </>
        )}
      </div>

      <ScorecardTable rows={rows} />
    </div>
  );
}
