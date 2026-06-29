import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getLivePrice } from '@/lib/marketData';

const BENCHMARK_TICKER = 'SPY';
const SECTOR_BENCHMARK_TICKER = 'SOXX';

type TxRow = {
  company_id: string;
  transaction_type: 'buy' | 'sell';
  shares: number;
  price_per_share: number;
  transacted_at: string;
  created_at: string;
  benchmark_price_at_entry: number | null;
  sector_benchmark_price_at_entry: number | null;
  benchmark_price_approx: boolean;
  companies: { name: string | null; ticker: string | null } | null;
};

// GET /api/portfolios/[id]/benchmark
// Benchmark comparison for a single portfolio. Each held position is measured
// from its own first-buy transaction date in THIS portfolio against SPY and
// SOXX, using the benchmark prices captured on that first buy.
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase
    .from('portfolio_transactions')
    .select(
      'company_id, transaction_type, shares, price_per_share, transacted_at, created_at, benchmark_price_at_entry, sector_benchmark_price_at_entry, benchmark_price_approx, companies(name, ticker)'
    )
    .eq('portfolio_id', params.id)
    .order('transacted_at', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const txByCompany = new Map<string, TxRow[]>();
  for (const tx of (data ?? []) as unknown as TxRow[]) {
    if (!txByCompany.has(tx.company_id)) txByCompany.set(tx.company_id, []);
    txByCompany.get(tx.company_id)!.push(tx);
  }

  type Holding = {
    company_id: string;
    name: string | null;
    ticker: string | null;
    netShares: number;
    entryPrice: number; // weighted-average cost across buys
    costBasis: number;
    entryDate: string; // first buy transacted_at
    entryBenchmarkPrice: number | null;
    entrySectorPrice: number | null;
    approx: boolean;
  };

  const holdings: Holding[] = [];
  for (const [companyId, txs] of txByCompany) {
    let buyShares = 0;
    let buyCost = 0;
    let netShares = 0;
    const buys = txs.filter((t) => t.transaction_type === 'buy');
    for (const t of txs) {
      const s = Number(t.shares);
      if (t.transaction_type === 'buy') {
        buyShares += s;
        buyCost += s * Number(t.price_per_share);
        netShares += s;
      } else if (t.transaction_type === 'sell') {
        netShares -= s;
      }
    }
    if (netShares <= 0 || buyShares <= 0 || buys.length === 0) continue;

    // buys are already ordered by transacted_at then created_at, so [0] is first.
    const firstBuy = buys[0];
    const entryPrice = buyCost / buyShares;
    holdings.push({
      company_id: companyId,
      name: firstBuy.companies?.name ?? null,
      ticker: firstBuy.companies?.ticker ?? null,
      netShares,
      entryPrice,
      costBasis: netShares * entryPrice,
      entryDate: firstBuy.transacted_at,
      entryBenchmarkPrice:
        firstBuy.benchmark_price_at_entry != null ? Number(firstBuy.benchmark_price_at_entry) : null,
      entrySectorPrice:
        firstBuy.sector_benchmark_price_at_entry != null
          ? Number(firstBuy.sector_benchmark_price_at_entry)
          : null,
      approx: !!firstBuy.benchmark_price_approx,
    });
  }

  if (holdings.length === 0) {
    return NextResponse.json({ rows: [], aggregate: null });
  }

  // Live prices: each held ticker plus the two benchmarks, fetched in parallel.
  const tickers = Array.from(new Set(holdings.map((h) => h.ticker).filter(Boolean) as string[]));
  const [companyQuotes, spy, soxx] = await Promise.all([
    Promise.all(tickers.map(async (t) => ({ t, p: (await getLivePrice(t))?.price ?? null }))),
    getLivePrice(BENCHMARK_TICKER),
    getLivePrice(SECTOR_BENCHMARK_TICKER),
  ]);
  const liveByTicker = new Map<string, number | null>();
  for (const { t, p } of companyQuotes) liveByTicker.set(t, p);
  const liveSpy = spy?.price ?? null;
  const liveSoxx = soxx?.price ?? null;

  const rows = holdings.map((h) => {
    const livePrice = h.ticker ? liveByTicker.get(h.ticker) ?? null : null;
    const holdingReturnPct =
      livePrice != null && h.entryPrice > 0
        ? ((livePrice - h.entryPrice) / h.entryPrice) * 100
        : null;
    const benchmarkReturnPct =
      liveSpy != null && h.entryBenchmarkPrice
        ? ((liveSpy - h.entryBenchmarkPrice) / h.entryBenchmarkPrice) * 100
        : null;
    const sectorBenchmarkReturnPct =
      liveSoxx != null && h.entrySectorPrice
        ? ((liveSoxx - h.entrySectorPrice) / h.entrySectorPrice) * 100
        : null;
    const excessPct =
      holdingReturnPct != null && benchmarkReturnPct != null
        ? holdingReturnPct - benchmarkReturnPct
        : null;
    const sectorExcessPct =
      holdingReturnPct != null && sectorBenchmarkReturnPct != null
        ? holdingReturnPct - sectorBenchmarkReturnPct
        : null;
    return {
      company_id: h.company_id,
      name: h.name,
      ticker: h.ticker,
      entryDate: h.entryDate,
      costBasis: h.costBasis,
      approx: h.approx,
      holdingReturnPct,
      benchmarkReturnPct,
      sectorBenchmarkReturnPct,
      excessPct,
      sectorExcessPct,
    };
  });

  // Aggregate: value-weighted by cost basis over the positions that actually
  // have a benchmark return (so a missing entry price never skews the weights).
  function weighted(selector: (r: (typeof rows)[number]) => number | null, gate: (r: (typeof rows)[number]) => number | null) {
    const eligible = rows.filter((r) => gate(r) !== null && selector(r) !== null);
    const totalWeight = eligible.reduce((a, r) => a + r.costBasis, 0);
    if (totalWeight <= 0) return null;
    return eligible.reduce((a, r) => a + (selector(r) as number) * (r.costBasis / totalWeight), 0);
  }

  const portfolioReturnPct = weighted((r) => r.holdingReturnPct, (r) => r.benchmarkReturnPct);
  const benchmarkReturnPct = weighted((r) => r.benchmarkReturnPct, (r) => r.benchmarkReturnPct);
  const portfolioReturnVsSectorPct = weighted((r) => r.holdingReturnPct, (r) => r.sectorBenchmarkReturnPct);
  const sectorBenchmarkReturnPct = weighted((r) => r.sectorBenchmarkReturnPct, (r) => r.sectorBenchmarkReturnPct);

  const aggregate = {
    portfolioReturnPct,
    benchmarkReturnPct,
    sectorBenchmarkReturnPct,
    excessPct:
      portfolioReturnPct != null && benchmarkReturnPct != null
        ? portfolioReturnPct - benchmarkReturnPct
        : null,
    sectorExcessPct:
      portfolioReturnVsSectorPct != null && sectorBenchmarkReturnPct != null
        ? portfolioReturnVsSectorPct - sectorBenchmarkReturnPct
        : null,
    anyApprox: rows.some((r) => r.approx),
  };

  return NextResponse.json({ rows, aggregate });
}
