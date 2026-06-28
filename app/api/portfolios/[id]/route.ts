import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ portfolio: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { name, description } = body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;

  const { data, error } = await supabase
    .from('portfolios')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ portfolio: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Delete child transactions before the parent portfolio row.
  const { error: txError } = await supabase
    .from('portfolio_transactions')
    .delete()
    .eq('portfolio_id', params.id);

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });

  const { error } = await supabase
    .from('portfolios')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
