import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase, Company, Partnership, Catalyst, Score } from "@/lib/supabase";
import { getLiveMarketCap } from "@/lib/marketData";

function fmtPct(v: number | null) {
  return v === null ? "—" : `${v}%`;
}

function fmtMarketCap(value: number | null) {
  if (value === null) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  return `$${value}`;
}

function trendArrow(trend: string | null) {
  if (trend === "rising") return <span className="text-rise">▲ rising</span>;
  if (trend === "falling") return <span className="text-fall">▼ falling</span>;
  if (trend === "stable") return <span className="text-muted">— stable</span>;
  return <span className="text-muted">—</span>;
}

export default async function CompanyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!company) notFound();
  const c = company as Company;

  const liveCap = c.ticker ? await getLiveMarketCap(c.ticker) : null;

  const { data: partnerships } = await supabase
    .from("partnerships")
    .select("*")
    .eq("company_id", c.id)
    .order("deal_date", { ascending: false });

  const { data: catalysts } = await supabase
    .from("catalysts")
    .select("*")
    .eq("company_id", c.id)
    .order("expected_date", { ascending: true });

  const { data: scores } = await supabase
    .from("scores")
    .select("*")
    .eq("company_id", c.id)
    .order("scored_at", { ascending: false })
    .limit(1);

  const latestScore = (scores ?? [])[0] as Score | undefined;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#e7e8ea]">
            {c.name}
            {c.ticker && (
              <span className="ml-3 font-mono text-base text-muted">{c.ticker}</span>
            )}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="badge bg-panelhi text-muted">
              {c.research_status.replace("_", " ")}
            </span>
            {c.ai_category && (
              <span className="badge bg-panelhi text-muted">
                {c.ai_category.replace("_", " ")}
              </span>
            )}
            {(c.sector_tags ?? []).map((t) => (
              <span key={t} className="badge bg-panel text-muted border border-line">
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {liveCap ? (
            <span
              className="cursor-help font-mono text-lg text-[#e7e8ea]"
              title={`Live via Finnhub · fetched ${new Date(liveCap.fetchedAt).toLocaleTimeString()}`}
            >
              {fmtMarketCap(liveCap.marketCap)}
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-rise align-middle" />
            </span>
          ) : (
            <span
              className="cursor-help font-mono text-lg text-[#e7e8ea] underline decoration-dotted decoration-muted underline-offset-2"
              title={
                c.market_cap === null
                  ? "Not yet researched"
                  : `Stored snapshot, live fetch unavailable · Source: ${c.market_cap_source ?? "not recorded"} · As of ${c.market_cap_updated_at ?? "unknown date"}`
              }
            >
              {fmtMarketCap(c.market_cap)}
            </span>
          )}
          <Link
            href={`/companies/${c.id}/edit`}
            className="rounded border border-line px-3 py-1.5 text-sm text-muted hover:border-signal hover:text-signal"
          >
            Edit
          </Link>
        </div>
      </div>

      {c.description && (
        <p className="mb-8 max-w-3xl text-sm leading-relaxed text-[#cfd1d5]">
          {c.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-5">
        <Section title="Financial signals">
          <Row label="Revenue growth" value={fmtPct(c.revenue_growth_pct)} />
          <Row label="Gross margin" value={fmtPct(c.gross_margin_pct)} />
          <Row label="AI revenue mix" value={fmtPct(c.ai_revenue_mix_pct)} />
          <Row label="Cash flow" value={c.cash_flow_status ?? "—"} />
          <Row
            label="Valuation"
            value={
              c.valuation_multiple
                ? `${c.valuation_multiple}x ${c.valuation_metric ?? ""}`
                : "—"
            }
          />
        </Section>

        <Section title="Management & ownership">
          <Row
            label="Insider ownership"
            value={
              <>
                {fmtPct(c.insider_ownership_pct)}{" "}
                {trendArrow(c.insider_ownership_trend)}
              </>
            }
          />
          <Row
            label="Institutional ownership"
            value={
              <>
                {fmtPct(c.institutional_ownership_pct)}{" "}
                {trendArrow(c.institutional_ownership_trend)}
              </>
            }
          />
          <Row label="AI claims credibility" value={c.ai_claims_credibility ?? "—"} />
          <Row
            label="Comp tied to AI KPIs"
            value={c.compensation_tied_to_ai === null ? "—" : c.compensation_tied_to_ai ? "Yes" : "No"}
          />
          {c.capital_allocation_assessment && (
            <p className="mt-2 text-xs text-muted">{c.capital_allocation_assessment}</p>
          )}
        </Section>

        <Section title="AI-specific moat">
          {c.moat_description ? (
            <p className="text-sm text-[#cfd1d5]">{c.moat_description}</p>
          ) : (
            <p className="text-sm text-muted">Not yet researched.</p>
          )}
          {c.customer_concentration_risk && (
            <p className="mt-2 text-xs text-fall">
              Concentration risk: {c.customer_concentration_risk}
            </p>
          )}
        </Section>

        <Section title="Ecosystem position">
          <Row
            label="Leverage"
            value={c.ecosystem_leverage_direction?.replace("_", " ") ?? "—"}
          />
          <Row label="Trajectory" value={c.ecosystem_trajectory ?? "—"} />
        </Section>
      </div>

      <Section title="Partnerships" className="mt-5">
        {(partnerships ?? []).length === 0 ? (
          <p className="text-sm text-muted">No partnerships logged yet.</p>
        ) : (
          <div className="space-y-2">
            {(partnerships as Partnership[]).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between border-b border-line py-2 text-sm last:border-0"
              >
                <div>
                  <span className="font-medium text-[#e7e8ea]">{p.partner_name}</span>
                  {p.partner_tier && (
                    <span className="ml-2 text-xs text-muted">{p.partner_tier.replace("_", " ")}</span>
                  )}
                  {p.deal_type && (
                    <span className="ml-2 text-xs text-muted">· {p.deal_type.replace("_", " ")}</span>
                  )}
                </div>
                <span className="font-mono text-xs text-muted">{p.deal_date ?? ""}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Catalysts" className="mt-5">
        {(catalysts ?? []).length === 0 ? (
          <p className="text-sm text-muted">No catalysts logged yet.</p>
        ) : (
          <div className="space-y-2">
            {(catalysts as Catalyst[]).map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between border-b border-line py-2 text-sm last:border-0"
              >
                <span className="text-[#cfd1d5]">{cat.description}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted">{cat.expected_date ?? ""}</span>
                  <span className="badge bg-panelhi text-muted">{cat.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Latest score" className="mt-5">
        {!latestScore ? (
          <p className="text-sm text-muted">Not yet scored.</p>
        ) : (
          <div>
            <div className="mb-3 flex items-center gap-4">
              <span className="font-mono text-3xl font-bold text-signal">
                {latestScore.composite_score ?? "—"}
              </span>
              <span className="text-sm text-muted">
                conviction {latestScore.conviction_score ?? "—"}/5 · scored{" "}
                {latestScore.scored_at}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs text-muted">
              <span>Ecosystem: {latestScore.ecosystem_position_score ?? "—"}</span>
              <span>Financial: {latestScore.financial_quality_score ?? "—"}</span>
              <span>AI moat: {latestScore.ai_moat_score ?? "—"}</span>
              <span>Management: {latestScore.management_ownership_score ?? "—"}</span>
              <span>Catalyst: {latestScore.catalyst_clarity_score ?? "—"}</span>
              <span>Valuation: {latestScore.valuation_score ?? "—"}</span>
            </div>
            {latestScore.thesis && (
              <p className="mt-3 text-sm text-[#cfd1d5]">{latestScore.thesis}</p>
            )}
            {latestScore.biggest_risk && (
              <p className="mt-1 text-xs text-fall">Risk: {latestScore.biggest_risk}</p>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded border border-line bg-panel p-5 ${className}`}>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-[#e7e8ea]">{value}</span>
    </div>
  );
}
