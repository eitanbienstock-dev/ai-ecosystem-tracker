import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const ORG_ID = '7da641eb-0864-415e-ac4a-6bb0f385aab4';
const FINNHUB_TOKEN = process.env.FINNHUB_API_KEY;
const TOTAL_CAPITAL = 1_000_000;

async function getLivePrice(ticker: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_TOKEN}`
    );
    const data = await res.json();
    const price = data?.c ?? data?.pc ?? null;
    return price && price > 0 ? price : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date().toISOString().split('T')[0];
  const portfolioName = `Top 10 Weekly - ${today}`;

  const { data: existing } = await supabase
    .from('portfolios')
    .select('id')
    .eq('name', portfolioName)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ message: 'Portfolio already created for today', name: portfolioName });
  }

  const { data: companies, error: qError } = await supabase
    .from('companies')
    .select('id, name, ticker, research_status')
    .in('research_status', ['holding', 'watched'])
    .not('ticker', 'is', null);

  if (qError || !companies) {
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }

  const scored: { id: string; name: string; ticker: string; composite: number }[] = [];

  for (const c of companies) {
    const { data: score } = await supabase
      .from('scores')
      .select('composite_score, confidence_score')
      .eq('company_id', c.id)
      .order('scored_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (score && score.confidence_score >= 3) {
      scored.push({ id: c.id, name: c.name, ticker: c.ticker, composite: score.composite_score });
    }
  }

  const top10 = scored.sort((a, b) => b.composite - a.composite).slice(0, 10);

  if (top10.length === 0) {
    return NextResponse.json({ message: 'No companies meet confidence threshold', date: today });
  }

  const totalScore = top10.reduce((sum, c) => sum + c.composite, 0);

  const { data: portfolio, error: portError } = await supabase
    .from('portfolios')
    .insert({
      organisation_id: ORG_ID,
      name: portfolioName,
      portfolio_type: 'model',
      capital_amount: TOTAL_CAPITAL
    })
    .select('id')
    .single();

  if (portError || !portfolio) {
    return NextResponse.json({ error: 'Failed to create portfolio' }, { status: 500 });
  }

  const transactedAt = new Date().toISOString();
  const results: { ticker: string; composite: number; weight: number; allocation: number; shares: number; price: number }[] = [];

  for (const company of top10) {
    const weight = company.composite / totalScore;
    const allocation = Math.round(TOTAL_CAPITAL * weight);
    const price = await getLivePrice(company.ticker);
    if (!price) continue;

    const shares = Math.floor(allocation / price);
    if (shares < 1) continue;

    await supabase.from('portfolio_transactions').insert({
      portfolio_id: portfolio.id,
      company_id: company.id,
      transaction_type: 'buy',
      shares,
      price_per_share: price,
      transacted_at: transactedAt,
      note: `Weekly model entry. Composite ${company.composite}. Weight ${(weight * 100).toFixed(1)}%. Allocation $${allocation.toLocaleString()}. Price via Finnhub.`
    });

    results.push({ ticker: company.ticker, composite: company.composite, weight: Math.round(weight * 1000) / 10, allocation, shares, price });
  }

  return NextResponse.json({
    message: 'Weekly portfolio created',
    name: portfolioName,
    total_capital: TOTAL_CAPITAL,
    positions: results.length,
    companies: results
  });
}
