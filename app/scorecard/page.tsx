import { supabase, Company, Score } from "@/lib/supabase";
import { getLivePrice } from "@/lib/marketData";

export const dynamic = "force-dynamic";

export default async function ScorecardPage() {
  const { data: scores } = await supabase
    .from("scores")
    .select("*")
    .order("scored_at", { ascending: false });

  const { data: companies } = await supabase.from("companies").select("*");
  const companyById = new Map<string, Company>();
  for (const c of (companies ?? []) as Company[]) companyById.set(c.id, c);

  const rows = await Promise.all(
    ((scores ?? []) as Score[]).map(async (s) => {
      const company = companyById.get(s.company_id);
      const live = company?.ticker ? await getLivePrice(company.ticker) : null;
      const changePct =
        s.price_at_scoring && live?.price
          ? ((live.price - s.price_at_scoring) / s.price_at_scoring) * 100
          : null;
      const daysSince = Math.round((Date.now() - new Date(s.scored_at).getTime()) / 86_400_000);
      return { score: s, company, livePrice: live?.price ?? null, changePct, daysSince };
    })
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#e7e8ea]">Scorecard</h1>
        <p className="max-w-2xl text-sm text-muted">
          Every score graded against what the stock actually did since. This is the feedback loop the rest of
          the system was missing, conviction and composite score are opinions until something measures whether
          they were right.
        </p>
        <p className="mt-2 max-w-2xl text-xs text-signal">
          Honest caveat: tracking for the original ten scores effectively started{" "}
          {new Date().toISOString().slice(0, 10)}, not their original scoring date, Finnhub&apos;s historical
          price data sits behind a paid tier we don&apos;t have, so backfilling the true historical price wasn&apos;t
          possible without fabricating precision we don&apos;t actually have. Every score from this point forward
          captures its price live, at the moment it&apos;s created, with no gap. Nothing on this page is a backtest
          yet either way, it is instrumentation that only becomes meaningful once enough time and enough scores
          accumulate. Do not draw conclusions from short-term price moves this early.
        </p>
      </div>

      <div className="overflow-hidden rounded border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-panel text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Scored</th>
              <th className="px-4 py-3">Composite</th>
              <th className="px-4 py-3">Conviction</th>
              <th className="px-4 py-3">Price then</th>
              <th className="px-4 py-3">Price now</th>
              <th className="px-4 py-3">Change since</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ score: s, company, livePrice, changePct, daysSince }) => (
              <tr key={s.id} className="border-b border-line bg-panel/40">
                <td className="px-4 py-3">
                  <span className="font-medium text-[#e7e8ea]">{company?.name ?? "Unknown"}</span>{" "}
                  <span className="font-mono text-xs text-muted">{company?.ticker}</span>
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {s.scored_at} ({daysSince}d ago)
                </td>
                <td className="px-4 py-3 font-mono">{s.composite_score ?? "—"}</td>
                <td className="px-4 py-3 font-mono">{s.conviction_score ?? "—"}/5</td>
                <td className="px-4 py-3 font-mono text-muted">
                  {s.price_at_scoring ? `$${Number(s.price_at_scoring).toFixed(2)}` : "not recorded"}
                </td>
                <td className="px-4 py-3 font-mono text-muted">
                  {livePrice ? `$${livePrice.toFixed(2)}` : "—"}
                </td>
                <td className="px-4 py-3">
                  {changePct !== null ? (
                    <span className={changePct >= 0 ? "text-rise" : "text-fall"}>
                      {changePct >= 0 ? "+" : ""}
                      {changePct.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
