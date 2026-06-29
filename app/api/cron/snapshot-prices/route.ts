import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getLivePrice } from "@/lib/marketData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Records one live-price row per active company per day, building the price
// path that the Scorecard needs for drawdown and risk-adjusted correlations.
// Scheduled by vercel.json. Historical backfill is not possible on the free
// Finnhub tier, so the series only grows forward from the day this goes live.
export async function GET(request: Request) {
  // Optional protection. If CRON_SECRET is configured, require the matching
  // bearer token that Vercel Cron sends automatically. If it is not set, the
  // route runs unprotected; the (company_id, captured_on) unique constraint
  // keeps repeat calls on the same day idempotent either way.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  // US markets are closed on weekends; a quote then just repeats Friday's
  // close under a weekend date, so skip.
  const day = new Date().getUTCDay(); // 0 Sun ... 6 Sat
  if (day === 0 || day === 6) {
    return NextResponse.json({ skipped: "weekend" });
  }

  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, ticker, research_status")
    .neq("research_status", "archived");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const targets = (companies ?? []).filter(
    (c: { ticker: string | null }) => typeof c.ticker === "string" && c.ticker.length > 0
  );

  const today = new Date().toISOString().slice(0, 10);
  let inserted = 0;
  let failed = 0;

  await Promise.all(
    targets.map(async (c: { id: string; ticker: string | null }) => {
      const quote = await getLivePrice(c.ticker as string);
      if (!quote) {
        failed += 1;
        return;
      }
      const { error: insErr } = await supabase.from("price_snapshots").upsert(
        {
          company_id: c.id,
          ticker: c.ticker,
          price: quote.price,
          captured_on: today,
          source: "finnhub_quote",
        },
        { onConflict: "company_id,captured_on", ignoreDuplicates: true }
      );
      if (insErr) failed += 1;
      else inserted += 1;
    })
  );

  return NextResponse.json({ date: today, total: targets.length, inserted, failed });
}
