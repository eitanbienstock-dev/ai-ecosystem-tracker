import { Company, Score } from "@/lib/supabase";
import { getLivePrice } from "@/lib/marketData";

export type ScoreSeries = Record<string, Score[]>; // company_id -> scores sorted by scored_at asc

export function latestScore(series: Score[] | undefined): Score | undefined {
  if (!series || series.length === 0) return undefined;
  return series[series.length - 1];
}

export function entryScore(series: Score[] | undefined, entryDate: string | null): Score | undefined {
  if (!series || series.length === 0) return undefined;
  if (!entryDate) return series[0];
  const onOrAfter = series.find((s) => s.scored_at >= entryDate);
  return onOrAfter ?? series[0];
}

/**
 * Suggested target weight: this company's score divided by the sum of
 * scores across all currently invested companies. Unconstrained, no
 * ceiling, recomputed fresh every time, never stored. Recomputes for
 * everyone automatically whenever the set of holdings changes.
 */
export function computeTargetWeights(
  invested: Company[],
  scoreSeries: ScoreSeries
): Map<string, number> {
  const scores = invested.map((c) => latestScore(scoreSeries[c.id])?.composite_score ?? 0);
  const sum = scores.reduce((a, b) => a + b, 0);
  const map = new Map<string, number>();
  invested.forEach((c, i) => {
    map.set(c.id, sum > 0 ? Math.round((scores[i] / sum) * 100) : 0);
  });
  return map;
}

export function effectiveTarget(company: Company, suggested: number): number {
  return company.target_weight_override_pct ?? suggested;
}

export async function computePositionValues(
  invested: Company[]
): Promise<{ valueByCompany: Map<string, number>; totalValue: number; priceByCompany: Map<string, number> }> {
  const valueByCompany = new Map<string, number>();
  const priceByCompany = new Map<string, number>();
  await Promise.all(
    invested.map(async (c) => {
      const shares = c.shares_held ?? 0;
      const live = c.ticker ? await getLivePrice(c.ticker) : null;
      const price = live?.price ?? c.entry_price ?? 0;
      valueByCompany.set(c.id, shares * price);
      if (live?.price) priceByCompany.set(c.id, live.price);
    })
  );
  const totalValue = Array.from(valueByCompany.values()).reduce((a, b) => a + b, 0);
  return { valueByCompany, totalValue, priceByCompany };
}

export function daysHeld(entryDate: string | null): number | null {
  if (!entryDate) return null;
  return Math.round((Date.now() - new Date(entryDate).getTime()) / 86_400_000);
}

export function computeBenchmarkRow(
  c: Company,
  livePrice: number | null,
  liveBenchmarkPrice: number | null
): { holdingReturnPct: number | null; benchmarkReturnPct: number | null; excessPct: number | null } {
  const holdingReturnPct =
    c.entry_price && livePrice ? ((livePrice - c.entry_price) / c.entry_price) * 100 : null;
  const benchmarkReturnPct =
    c.benchmark_price_at_entry && liveBenchmarkPrice
      ? ((liveBenchmarkPrice - c.benchmark_price_at_entry) / c.benchmark_price_at_entry) * 100
      : null;
  const excessPct =
    holdingReturnPct !== null && benchmarkReturnPct !== null ? holdingReturnPct - benchmarkReturnPct : null;
  return { holdingReturnPct, benchmarkReturnPct, excessPct };
}
