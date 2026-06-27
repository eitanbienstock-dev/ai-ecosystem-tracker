import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data: transactions, error } = await supabase
    .from('portfolio_transactions')
    .select('*, companies(id, name, ticker)')
    .eq('portfolio_id', params.id)
    .order('transacted_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group transactions by company and compute positions
  const byCompany = new Map<string, NonNullable<typeof transactions>>();
  for (const tx of transactions ?? []) {
    const cid = tx.company_id as string;
    if (!byCompany.has(cid)) byCompany.set(cid, []);
    byCompany.get(cid)!.push(tx);
  }

  const positions: any[] = [];
  for (const [company_id, txList] of byCompany) {
    let totalBuyShares = 0, totalBuyCost = 0, totalSellShares = 0;
    for (const tx of txList) {
      const s = Number(tx.shares), p = Number(tx.price_per_share);
      if (tx.transaction_type === 'buy') { totalBuyShares += s; totalBuyCost += s * p; }
      else if (tx.transaction_type === 'sell') { totalSellShares += s; }
    }
    const shares_held = totalBuyShares - totalSellShares;
    if (shares_held <= 0) continue;

    const weighted_avg_cost = totalBuyShares > 0 ? totalBuyCost / totalBuyShares : 0;
    const company = (txList[0] as any).companies;
    positions.push({
      company_id,
      name: company?.name ?? null,
      ticker: company?.ticker ?? null,
      shares_held,
      weighted_avg_cost,
      total_cost_basis: shares_held * weighted_avg_cost,
      composite_score: null,
      confidence_score: null,
      transactions: txList,
    });
  }

  // Attach latest composite + confidence scores for client-side sorting
  if (positions.length > 0) {
    const companyIds = positions.map((p: any) => p.company_id);
    const { data: scoreRows } = await supabase
      .from('scores')
      .select('company_id, composite_score, confidence_score, scored_at')
      .in('company_id', companyIds)
      .order('scored_at', { ascending: false });

    const scoreMap = new Map<string, { composite_score: number | null; confidence_score: number | null }>();
    for (const row of scoreRows ?? []) {
      if (!scoreMap.has(row.company_id)) scoreMap.set(row.company_id, row);
    }
    for (const pos of positions) {
      const s = scoreMap.get(pos.company_id);
      if (s) { pos.composite_score = s.composite_score; pos.confidence_score = s.confidence_score; }
    }
  }

  return NextResponse.json({ positions });
}
