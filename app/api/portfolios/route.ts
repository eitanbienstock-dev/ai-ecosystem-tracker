import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ portfolios: data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, description, portfolio_type, capital_amount } = body;

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('portfolios')
    .insert({
      name,
      description,
      portfolio_type: portfolio_type ?? 'manual',
      capital_amount: capital_amount ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ portfolio: data }, { status: 201 });
}
