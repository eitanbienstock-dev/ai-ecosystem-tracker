import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

const DIMENSIONS = [
  {
    label: "Ecosystem position",
    weight: 25,
    def: "How structurally embedded the company is in AI supply, partnership, or platform relationships that would be costly or slow for a customer or partner to unwind.",
  },
  {
    label: "Financial quality",
    weight: 20,
    def: "Revenue growth, gross margin, cash flow, and profitability, taken directly from the most recent 10-Q or 10-K rather than aggregator sites.",
  },
  {
    label: "AI moat",
    weight: 15,
    def: "Durability of any AI-specific technical or product differentiation, distinct from ecosystem position, which is about relationships rather than technology.",
  },
  {
    label: "Management & ownership",
    weight: 15,
    def: "Insider and institutional ownership trends, whether AI-related claims hold up under scrutiny, and whether compensation is tied to AI-specific outcomes.",
  },
  {
    label: "Catalyst clarity",
    weight: 15,
    def: "How concrete and trackable the near-term events are that would resolve the thesis one way or the other, not how positive they are.",
  },
  {
    label: "Valuation",
    weight: 10,
    def: "Price relative to fundamentals. Weighted lowest deliberately, since this is a positioning framework built around ecosystem dependency, not a valuation screen.",
  },
];

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display mb-2 text-2xl font-bold text-[#e7e8ea]">Methodology</h1>
      <p className="mb-8 text-sm text-muted">
        How companies are scored, sized, and tracked in this system, and what each number is and is not
        claiming to measure.
      </p>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">Universe</h2>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          Public US companies with market caps up to roughly 100 billion dollars, mapped against a
          ten-category AI ecosystem taxonomy modeled on the frameworks used by Goldman Sachs and Morgan
          Stanley research. The portfolio is concentrated by design, around ten names, not a diversified
          basket, and the thesis is that deep ecosystem intelligence on AI stack dependencies produces
          better risk-adjusted returns than passive AI exposure.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CATEGORY_ORDER.map((cat) => (
            <span key={cat} className="badge bg-panelhi text-muted">
              {CATEGORY_LABELS[cat]}
            </span>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">
          Composite score (0 to 100)
        </h2>
        <p className="mb-3 text-sm leading-relaxed text-[#cfd1d5]">
          A weighted blend of six dimensions, each backed by a written note citing the specific source for
          its key figures. The composite answers one question: is this a good investment on the merits.
        </p>
        <div className="overflow-hidden rounded border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-panel text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5">Dimension</th>
                <th className="px-4 py-2.5">Weight</th>
                <th className="px-4 py-2.5">What it measures</th>
              </tr>
            </thead>
            <tbody>
              {DIMENSIONS.map((d) => (
                <tr key={d.label} className="border-b border-line bg-panel/40 last:border-0">
                  <td className="px-4 py-3 font-medium text-[#e7e8ea]">{d.label}</td>
                  <td className="px-4 py-3 font-mono text-[#e7e8ea]">{d.weight}%</td>
                  <td className="px-4 py-3 text-[#cfd1d5]">{d.def}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">
          Confidence score (1 to 5)
        </h2>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          A separate, independent measure of how reliable the composite score itself is, not a judgment of
          how attractive the company is or how much of it to hold. It tracks three things: whether the
          inputs behind the six dimensions are confirmed from primary filings or estimated, whether the
          thesis is already showing up in disclosed results or is still forward-looking, and how much a
          single new data point could move the score. Composite and confidence are tracked independently
          on purpose, so the system can separately test whether each one predicts returns, rather than
          collapsing two different questions, is this good and how sure are we, into one number.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">
          Position sizing: target weight
        </h2>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          Target weight for any holding is its composite score divided by the sum of composite scores
          across all current holdings. It is recalculated live on every page load rather than stored, so it
          always reflects the latest scores, including the new candidate, if previewing a promotion. Current
          weight, shares held multiplied by live price divided by total portfolio value, is tracked
          separately. A gap of 10 points or more between current and target weight is flagged, which can
          mean either the price has moved or a re-score has changed the target, not necessarily that
          something is wrong.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">Confidence floor</h2>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          Before a candidate is promoted from the watched pipeline into the invested portfolio, its
          confidence score is checked. Below 3 out of 5, a warning appears asking for explicit confirmation
          that the underlying data is solid enough to size real capital against. It is a soft flag, not a
          hard rule, the decision to proceed stays a human one.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">Workflow states</h2>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          Every company sits in exactly one of three states. Investment Portfolio is real capital deployed.
          Watched Pipeline is active candidates, manually ranked rather than auto-sorted by score alone, and
          it also includes current holdings so they can be compared side by side against what is not yet
          funded. Archived is anything no longer active, either evaluated and passed on or previously
          invested and since exited, and every archived company carries a required, visible reason, not
          just a status change with no record of why.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">
          Benchmark comparison
        </h2>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          Each invested holding is compared against the S&amp;P 500 over the same window, from that
          holding&apos;s own entry date to now, not a shared calendar period, since capital was deployed on
          different dates and a single shared window would misrepresent the comparison for holdings entered
          at different times. The benchmark price is captured at the moment of entry, the same discipline
          already applied to a holding&apos;s own entry price, and compared against its live price today. The
          portfolio-level number weights each holding by its current position value. This is the explicit
          test of the standing goal: deep ecosystem intelligence should produce returns exceeding the broad
          market, not just positive returns in isolation.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">
          Validation: does the ranking actually work
        </h2>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          The Scorecard tracks the Pearson correlation, separately, between composite and confidence on one
          side and each stock&apos;s return since it was scored on the other, across every graded score on
          record. A positive number for confidence means scores backed by more verified, primary-source data
          have tended to outperform scores resting on thinner inputs. This is a deliberately strict
          methodology: no correlation is shown until there are at least 20 graded scores averaging at least
          30 days of tracking, since a correlation computed on too little data is noise dressed up as
          signal. The system is built to measure whether it works, not to assume it does.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">
          Data sourcing discipline
        </h2>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          Before leaving a financial field null, revenue growth, margin, cash flow, valuation, or ownership,
          the company&apos;s most recent 10-Q or 10-K is checked directly. Retail aggregator sites are not
          treated as a substitute for the primary filing. Where a figure genuinely cannot be confirmed even
          after checking, that is recorded explicitly as checked but not found, distinct from a field that
          simply has not been looked at yet.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">Research digest</h2>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          Periodic scans of institutional research, currently Goldman Sachs and Morgan Stanley, logged with
          a directional read, bullish or bearish, and where a specific finding bears closely enough on a
          specific holding that it could plausibly change that holding&apos;s score, an explicit flag tied to
          that company until it is reviewed and dismissed. Most institutional research is supportive context
          rather than a trigger for a specific re-score, so this flag is intentionally rare, not a constant
          signal.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">What this is not</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#cfd1d5]">
          <li>Not a diversified portfolio. Concentrated by design, all in AI-adjacent equities.</li>
          <li>
            Not a fully mechanical model. Each score is an analytical judgment informed by primary sources,
            with the underlying reasoning for every dimension visible on the company&apos;s own page, not a
            black box.
          </li>
          <li>
            Not a validated track record yet. The correlation tracking needs time and volume of graded
            scores to mean anything, and will say so plainly until those thresholds are met.
          </li>
        </ul>
      </section>
    </div>
  );
}
