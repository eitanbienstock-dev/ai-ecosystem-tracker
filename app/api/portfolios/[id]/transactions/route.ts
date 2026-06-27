import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
  const { company_id, transaction_type, shares, price_per_share, note, transacted_at } = body;

  if (!company_id || !transaction_type || !shares || !price_per_share) {
    return NextResponse.json(
      { error: 'company_id, transaction_type, shares, and price_per_share are required' },
      { status: 400 }
    );
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
