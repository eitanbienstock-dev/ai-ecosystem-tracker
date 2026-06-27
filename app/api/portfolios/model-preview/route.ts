import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { computeModelAllocations, AllocationInput } from '@/lib/portfolioAllocation';

function latestScoresByCompany(
  scoreRows: { company_id: string; composite_score: number | null; confidence_score: number | null; scored_at: string }[]
): Map<string, { composite_score: number | null; confidence_score: number | null }> {
  const map = new Map<string, { composite_score: number | null; confidence_score: number | null }>();
  for (const row of scoreRows) {
    if (!map.has(row.company_id)) {
      map.set(row.company_id, {
        composite_score: row.composite_score,
        confidence_score: row.confidence_score,
      });
    }
  }
  return map;
}

// GET: return all watched/holding companies with their latest scores, available for model portfolio construction
export async function GET() {
  const { data: companies, error: compError } = await supabase
    .from('companies')
    .select('id, name, ticker, market_cap')
    .in('research_status', ['watched', 'holding'])
    .order('name', { ascending: true });

  if (compError) return NextResponse.json({ error: compError.message }, { status: 500 });

  const companyIds = (companies ?? []).map((c) => c.id);
  if (companyIds.length === 0) return NextResponse.json({ companies: [] });

  const { data: scoreRows, error: scoreError } = await supabase
    .from('scores')
    .select('company_id, composite_score, confidence_score, scored_at')
    .in('company_id', companyIds)
    .order('scored_at', { ascending: false });

  if (scoreError) return NextResponse.json({ error: scoreError.message }, { status: 500 });

  const scoreMap = latestScoresByCompany(scoreRows ?? []);

  const result = (companies ?? []).map((c) => {
    const scores = scoreMap.get(c.id);
    return {
      company_id: c.id,
      name: c.name,
      ticker: c.ticker,
      composite_score: scores?.composite_score ?? null,
      confidence_score: scores?.confidence_score ?? null,
      // market_cap is used as a price proxy here.
      // For accurate per-share allocation, Finnhub live price should be fetched
      // client-side and passed in via the POST body instead.
      current_price: c.market_cap ?? null,
    };
  });

  return NextResponse.json({ companies: result });
}

// POST: run model allocation preview — read-only, does not write to the database
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { company_ids, capital_amount } = body;

  if (!Array.isArray(company_ids) || !capital_amount || Number(capital_amount) <= 0) {
    return NextResponse.json(
      { error: 'company_ids (array) and capital_amount (> 0) are required' },
      { status: 400 }
    );
  }

  const { data: companies, error: compError } = await supabase
    .from('companies')
    .select('id, name, ticker, market_cap')
    .in('id', company_ids);

  if (compError) return NextResponse.json({ error: compError.message }, { status: 500 });

  const { data: scoreRows, error: scoreError } = await supabase
    .from('scores')
    .select('company_id, composite_score, confidence_score, scored_at')
    .in('company_id', company_ids)
    .order('scored_at', { ascending: false });

  if (scoreError) return NextResponse.json({ error: scoreError.message }, { status: 500 });

  const scoreMap = latestScoresByCompany(scoreRows ?? []);

  const inputs: AllocationInput[] = (companies ?? []).map((c) => {
    const scores = scoreMap.get(c.id);
    return {
      company_id: c.id,
      name: c.name,
      ticker: c.ticker,
      composite_score: scores?.composite_score ?? 0,
      confidence_score: scores?.confidence_score ?? 0,
      // market_cap is used as a price proxy here.
      // For accurate per-share allocation, Finnhub live price should be fetched
      // client-side and passed in instead.
      current_price: c.market_cap ?? null,
    };
  });

  const allocations = computeModelAllocations(inputs, Number(capital_amount));
  return NextResponse.json({ allocations });
}
