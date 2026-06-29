import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getLivePrice } from '@/lib/marketData';

const BENCHMARK_TICKER = 'SPY';
const SECTOR_BENCHMARK_TICKER = 'SOXX';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data, error } = await supabase
    .from('portfolio_transactions')
    .select('*, companies(name, ticker)')
    .eq('portfolio_id', params.id)
    .order('transacted_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ transactions: data });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { company_id, transaction_type, shares, price_per_share, note, transacted_at, allocation_override_pct } = body;

  if (!company_id || !transaction_type || !shares || !price_per_share) {
    return NextResponse.json(
      { error: 'company_id, transaction_type, shares, and price_per_share are required' },
      { status: 400 }
    );
  }

  // Capture the live SPY and SOXX prices at the moment a buy is recorded, so the
  // benchmark comparison can measure each position from its own entry. Marked
  // approximate when the transaction is back-dated, since the live quote then no
  // longer matches the close on the recorded date. Sells need no entry snapshot.
  let benchmarkPriceAtEntry: number | null = null;
  let sectorBenchmarkPriceAtEntry: number | null = null;
  let benchmarkPriceApprox = false;
  if (transaction_type === 'buy') {
    const [spy, soxx] = await Promise.all([
      getLivePrice(BENCHMARK_TICKER),
      getLivePrice(SECTOR_BENCHMARK_TICKER),
    ]);
    benchmarkPriceAtEntry = spy?.price ?? null;
    sectorBenchmarkPriceAtEntry = soxx?.price ?? null;
    const today = new Date().toISOString().slice(0, 10);
    benchmarkPriceApprox = !!transacted_at && transacted_at !== today;
  }

  const { data, error } = await supabase
    .from('portfolio_transactions')
    .insert({
      portfolio_id: params.id,
      company_id,
      transaction_type,
      shares,
      price_per_share,
      note,
      transacted_at,
      allocation_override_pct: allocation_override_pct ?? null,
      benchmark_price_at_entry: benchmarkPriceAtEntry,
      sector_benchmark_price_at_entry: sectorBenchmarkPriceAtEntry,
      benchmark_price_approx: benchmarkPriceApprox,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recompute net shares across ALL portfolios for this company
  const { data: allTx, error: txError } = await supabase
    .from('portfolio_transactions')
    .select('transaction_type, shares')
    .eq('company_id', company_id);

  if (!txError && allTx) {
    let netShares = 0;
    let hasSell = false;
    for (const tx of allTx) {
      if (tx.transaction_type === 'buy') netShares += Number(tx.shares);
      else if (tx.transaction_type === 'sell') {
        netShares -= Number(tx.shares);
        hasSell = true;
      }
    }

    const newStatus = netShares > 0 ? 'holding' : hasSell ? 'exited' : undefined;
    if (newStatus) {
      await supabase
        .from('companies')
        .update({ research_status: newStatus })
        .eq('id', company_id);
    }
  }

  return NextResponse.json({ transaction: data }, { status: 201 });
}
