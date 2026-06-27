import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data: transactions, error } = await supabase
    .from('portfolio_transactions')
    .select('*, companies(id, name, ticker, market_cap)')
    .eq('portfolio_id', params.id)
    .order('transacted_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group transactions by company
  const byCompany = new Map<string, typeof transactions>();
  for (const tx of transactions ?? []) {
    const cid = tx.company_id as string;
    if (!byCompany.has(cid)) byCompany.set(cid, []);
    byCompany.get(cid)!.push(tx);
  }

  const positions = [];
  for (const [company_id, txList] of byCompany) {
    let totalBuyShares = 0;
    let totalBuyCost = 0;
    let totalSellShares = 0;

    for (const tx of txList) {
      const s = Number(tx.shares);
      const p = Number(tx.price_per_share);
      if (tx.transaction_type === 'buy') {
        totalBuyShares += s;
        totalBuyCost += s * p;
      } else if (tx.transaction_type === 'sell') {
        totalSellShares += s;
      }
    }

    const shares_held = totalBuyShares - totalSellShares;
    if (shares_held <= 0) continue;

    const weighted_avg_cost = totalBuyShares > 0 ? totalBuyCost / totalBuyShares : 0;
    const total_cost_basis = shares_held * weighted_avg_cost;
    const company = (txList[0] as any).companies;

    positions.push({
      company_id,
      name: company?.name ?? null,
      ticker: company?.ticker ?? null,
      shares_held,
      weighted_avg_cost,
      total_cost_basis,
      current_price: company?.market_cap ?? null,
      transactions: txList,
    });
  }

  return NextResponse.json({ positions });
}
