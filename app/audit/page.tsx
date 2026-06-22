import { supabase, Company, Score } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const DIM_WEIGHTS = {
  ecosystem_position_score: 0.25,
  financial_quality_score: 0.2,
  ai_moat_score: 0.15,
  management_ownership_score: 0.15,
  catalyst_clarity_score: 0.15,
  valuation_score: 0.1,
};

const CORE_FIELDS: { key: keyof Company; label: string }[] = [
  { key: "revenue_growth_pct", label: "Revenue growth" },
  { key: "gross_margin_pct", label: "Gross margin" },
  { key: "cash_flow_status", label: "Cash flow status" },
  { key: "valuation_metric", label: "Valuation metric" },
  { key: "insider_ownership_pct", label: "Insider ownership %" },
  { key: "institutional_ownership_pct", label: "Institutional ownership %" },
];

type Finding = { company: string; issue: string; severity: "error" | "warning" };

export default async function DataQualityPage() {
  const { data: companies } = await supabase
    .from("companies")
    .select("*")
    .in("research_status", ["watching", "researching", "active_watch", "invested"]);

  const { data: scores } = await supabase.from("scores").select("*").order("scored_at", { ascending: false });

  const list = (companies ?? []) as Company[];
  const latestScoreByCompany = new Map<string, Score>();
  for (const s of (scores ?? []) as Score[]) {
    if (!latestScoreByCompany.has(s.company_id)) latestScoreByCompany.set(s.company_id, s);
  }

  const findings: Finding[] = [];

  for (const c of list) {
    const score = latestScoreByCompany.get(c.id);

    // Math check: composite score vs weighted dimension sum
    if (score) {
      const weighted = Object.entries(DIM_WEIGHTS).reduce((sum, [key, weight]) => {
        const val = (score as any)[key];
        return sum + (typeof val === "number" ? val * weight : 0);
      }, 0);
      if (score.composite_score !== null && Math.abs(weighted - score.composite_score) > 0.6) {
        findings.push({
          company: c.name,
          issue: `Composite score ${score.composite_score} does not match the weighted dimension sum (${weighted.toFixed(1)})`,
          severity: "error",
        });
      }
    }

    // Trend without a backing percentage (soft, can be legitimate, e.g. strong
    // evidence of selling without one clean aggregate figure)
    if (c.insider_ownership_trend && c.insider_ownership_pct === null) {
      findings.push({
        company: c.name,
        issue: "Insider ownership trend is set but the percentage is null, confirm this was a deliberate, documented gap",
        severity: "warning",
      });
    }
    if (c.institutional_ownership_trend && c.institutional_ownership_pct === null) {
      findings.push({
        company: c.name,
        issue: "Institutional ownership trend is set but the percentage is null, confirm this was a deliberate, documented gap",
        severity: "warning",
      });
    }

    // Missing core fields, checklist only, not auto-distinguishing justified vs not
    const missing = CORE_FIELDS.filter((f) => c[f.key] === null || c[f.key] === undefined);
    if (missing.length > 0) {
      findings.push({
        company: c.name,
        issue: `Missing: ${missing.map((f) => f.label).join(", ")}. Verify each has a "searched, not found" note, not just silence`,
        severity: "warning",
      });
    }

    // Stale market cap snapshot, informational only now that live fetch exists
    if (c.market_cap_updated_at) {
      const daysStale = Math.round((Date.now() - new Date(c.market_cap_updated_at).getTime()) / 86_400_000);
      if (daysStale > 30) {
        findings.push({
          company: c.name,
          issue: `Market cap snapshot is ${daysStale} days old (live fetch will supersede this automatically when the page is viewed)`,
          severity: "warning",
        });
      }
    }
  }

  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warning");

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-[#e7e8ea]">Data quality</h1>
        <p className="text-sm text-muted">
          Runs the checks from the manual audit automatically. Two issue classes are enforced as hard database
          constraints now and cannot recur silently: a cash-burning company can never carry a P/E valuation, and
          a catalyst can never be marked realized without a resolution date. Everything below is the remaining
          class, real but legitimately ambiguous gaps that need a human glance, not a database rule.
        </p>
      </div>

      <div className="mb-6 rounded border border-line bg-panel p-4">
        <p className="text-sm text-[#e7e8ea]">
          <span className="font-mono font-semibold text-fall">{errors.length}</span> hard errors (composite
          score math mismatches) &middot;{" "}
          <span className="font-mono font-semibold text-signal">{warnings.length}</span> warnings to review
        </p>
      </div>

      {findings.length === 0 ? (
        <div className="rounded border border-dashed border-line py-10 text-center">
          <p className="text-sm text-muted">No findings. Everything checked is clean.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {[...errors, ...warnings].map((f, i) => (
            <div
              key={i}
              className={`rounded border p-3 text-sm ${
                f.severity === "error" ? "border-fall/40 bg-fall/10 text-fall" : "border-line bg-panel text-[#cfd1d5]"
              }`}
            >
              <span className="font-medium">{f.company}</span>: {f.issue}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
