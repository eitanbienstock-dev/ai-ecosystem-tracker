import { supabase, Company, Score } from "@/lib/supabase";
import { getLivePrice } from "@/lib/marketData";
import ScorecardTable from "../ScorecardTable";
import ScorecardBenchmark from "../ScorecardBenchmark";

export const dynamic = "force-dynamic";

const MIN_N = 20;
const MIN_AVG_DAYS = 30;
const MIN_SNAPSHOTS = 5; // daily points beyond the entry needed to judge a path

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

// Largest peak-to-trough decline along a price path, as a positive percent.
function maxDrawdownPct(path: number[]): number | null {
  if (path.length < 2) return null;
  let peak = path[0];
  let maxDd = 0;
  for (const v of path) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd * 100;
}

// Standard deviation of step-to-step returns along a price path (a fraction).
function pathVolatility(path: number[]): number | null {
  if (path.length < 3) return null;
  const rets: number[] = [];
  for (let i = 1; i < path.length; i++) {
    if (path[i - 1] === 0) return null;
    rets.push((path[i] - path[i - 1]) / path[i - 1]);
  }
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  return Math.sqrt(variance);
}

type SnapRow = { company_id: string; price: number | string; captured_on: string };

export default async function ScorecardPage() {
  const { data: scores } = await supabase.from("scores").select("*").order("scored_at", { ascending: true });
  const { data: companies } = await supabase.from("companies").select("*");
  const { data: snapshots } = await supabase
    .from("price_snapshots")
    .select("company_id, price, captured_on")
    .order("captured_on", { ascending: true });

  const companyById = new Map<string, Company>();
  for (const c of (companies ?? []) as Company[]) companyById.set(c.id, c);

  // Daily snapshot path per company, ascending by date (query already ordered).
  const snapsByCompany = new Map<string, { on: string; price: number }[]>();
  for (const s of (snapshots ?? []) as SnapRow[]) {
    const arr = snapsByCompany.get(s.company_id) ?? [];
    arr.push({ on: s.captured_on, price: Number(s.price) });
    snapsByCompany.set(s.company_id, arr);
  }

  const tickers = Array.from(new Set((companies ?? []).map((c: any) => c.ticker).filter(Boolean)));
  const liveByTicker = new Map<string, number>();
  await Promise.all(
    tickers.map(async (t) => {
      const p = await getLivePrice(t as string);
      if (p) liveByTicker.set(t as string, p.price);
    })
  );

  const allScores = (scores ?? []) as Score[];

  // Full history, used only for the accuracy metrics, not displayed as rows
  const graded = allScores
    .map((s) => {
      const company = companyById.get(s.company_id);
      const livePrice = company?.ticker ? liveByTicker.get(company.ticker) ?? null : null;
      const priceThen = s.price_at_scoring ? Number(s.price_at_scoring) : null;
      const changePct = priceThen && livePrice ? ((livePrice - priceThen) / priceThen) * 100 : null;
      const daysSince = Math.round((Date.now() - new Date(s.scored_at).getTime()) / 86_400_000);

      // Price path from this score's entry through the captured daily series to now.
      let drawdownResistance: number | null = null;
      let riskAdjusted: number | null = null;
      if (priceThen && livePrice && changePct !== null) {
        const seriesSnaps = (snapsByCompany.get(s.company_id) ?? [])
          .filter((x) => x.on >= s.scored_at.slice(0, 10))
          .map((x) => x.price);
        if (seriesSnaps.length >= MIN_SNAPSHOTS) {
          const path = [priceThen, ...seriesSnaps, livePrice];
          const dd = maxDrawdownPct(path);
          const vol = pathVolatility(path);
          if (dd !== null) drawdownResistance = -dd; // signed so higher = held up better
          if (vol !== null && vol > 0) riskAdjusted = changePct / 100 / vol;
        }
      }

      return {
        confidence: s.confidence_score,
        composite: s.composite_score,
        changePct,
        daysSince,
        drawdownResistance,
        riskAdjusted,
      };
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

  // Risk-axis measures, gated on a real daily series existing for enough names.
  const ddPairs = graded.filter((r) => r.drawdownResistance !== null);
  const raPairs = graded.filter((r) => r.riskAdjusted !== null);
  const timeOk = avgDays >= MIN_AVG_DAYS;
  const drawdownCorr =
    ddPairs.length >= MIN_N && timeOk
      ? pearson(ddPairs.map((r) => r.composite ?? 0), ddPairs.map((r) => r.drawdownResistance as number))
      : null;
  const riskAdjCorr =
    raPairs.length >= MIN_N && timeOk
      ? pearson(raPairs.map((r) => r.composite ?? 0), raPairs.map((r) => r.riskAdjusted as number))
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
          <div className="flex flex-wrap gap-8">
            <div>
              <p className="text-[10px] text-muted">Confidence ↔ raw forward return</p>
              <p className="font-mono text-2xl font-bold text-signal">
                {confidenceCorr !== null ? confidenceCorr.toFixed(2) : "not yet available"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted">Composite ↔ raw forward return</p>
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

        <div className="mt-4 flex flex-wrap gap-8 border-t border-line pt-4">
          <div>
            <p className="text-[10px] text-muted">Composite ↔ drawdown resistance</p>
            {drawdownCorr !== null ? (
              <p className="font-mono text-2xl font-bold text-signal">{drawdownCorr.toFixed(2)}</p>
            ) : (
              <p className="max-w-xs text-xs text-[#cfd1d5]">
                Building price history: {ddPairs.length} of {MIN_N} names have enough daily points.
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] text-muted">Composite ↔ risk-adjusted return</p>
            {riskAdjCorr !== null ? (
              <p className="font-mono text-2xl font-bold text-signal">{riskAdjCorr.toFixed(2)}</p>
            ) : (
              <p className="max-w-xs text-xs text-[#cfd1d5]">
                Building price history: {raPairs.length} of {MIN_N} names have enough daily points.
              </p>
            )}
          </div>
        </div>

        <p className="mt-3 text-[11px] text-muted">
          Correlation between confidence, and separately composite score, and each stock&apos;s return since
          it was scored, across every score on record. A positive number for confidence means scores backed
          by more verified, primary-source data have tended to outperform scores resting on thinner or
          unconfirmed inputs, a test of whether data reliability itself predicts returns, not a
          price-direction forecast on its own. The composite is built to predict risk-adjusted performance,
          so the raw-return correlation is one of three measures. A daily price snapshot now records the path
          of each scored name, and the drawdown and risk-adjusted correlations populate here as that series
          builds. Both are signed so that a higher number means the higher-scored names held up better.
        </p>
      </div>

      <ScorecardBenchmark />

      <ScorecardTable rows={rows} />
    </div>
  );
}
