import { NextRequest, NextResponse } from 'next/server';
import { getLivePrice } from '@/lib/marketData';

// GET /api/prices?tickers=NVDA,PATH,... — returns live share prices from Finnhub
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('tickers') ?? '';
  const tickers = raw.split(',').map((t) => t.trim()).filter(Boolean);
  if (tickers.length === 0) return NextResponse.json({ prices: {} });

  const results = await Promise.all(tickers.map((t) => getLivePrice(t)));
  const prices: Record<string, number | null> = {};
  const changes: Record<string, number | null> = {};
  tickers.forEach((t, i) => {
    prices[t] = results[i]?.price ?? null;
    changes[t] = results[i]?.changePct ?? null;
  });

  return NextResponse.json({ prices, changes });
}
