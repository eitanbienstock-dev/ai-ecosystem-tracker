const FINNHUB_BASE = "https://finnhub.io/api/v1";

export type LiveMarketCap = {
  marketCap: number; // raw USD value
  fetchedAt: string; // ISO timestamp of this fetch, not an exchange timestamp
};

export type LivePrice = {
  price: number;
  fetchedAt: string;
};

/**
 * Fetches the current price for a ticker via Finnhub's quote endpoint.
 * Returns null on any failure, same fallback contract as getLiveMarketCap.
 */
export async function getLivePrice(ticker: string): Promise<LivePrice | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey || !ticker) return null;

  try {
    const res = await fetch(
      `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.c !== "number" || data.c <= 0) return null;
    return { price: data.c, fetchedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}

/**
 * Fetches current market cap for a ticker via Finnhub's company profile
 * endpoint. Returns null on any failure (missing key, bad ticker, rate
 * limit, network error) so callers can fall back to the stored research
 * snapshot instead of breaking the page.
 */
export async function getLiveMarketCap(
  ticker: string
): Promise<LiveMarketCap | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey || !ticker) return null;

  try {
    const res = await fetch(
      `${FINNHUB_BASE}/stock/profile2?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`,
      { cache: "no-store" }
    );

    if (!res.ok) return null;

    const data = await res.json();

    // Finnhub returns marketCapitalization in millions of USD.
    if (typeof data.marketCapitalization !== "number" || data.marketCapitalization <= 0) {
      return null;
    }

    return {
      marketCap: data.marketCapitalization * 1_000_000,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Fetches live market caps for multiple tickers in parallel. Failures for
 * individual tickers do not affect the others.
 */
export async function getLiveMarketCaps(
  tickers: string[]
): Promise<Map<string, LiveMarketCap>> {
  const results = await Promise.allSettled(
    tickers.map(async (t) => ({ ticker: t, data: await getLiveMarketCap(t) }))
  );

  const map = new Map<string, LiveMarketCap>();
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.data) {
      map.set(r.value.ticker, r.value.data);
    }
  }
  return map;
}
