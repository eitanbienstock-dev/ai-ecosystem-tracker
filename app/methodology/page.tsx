import Link from "next/link";
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
          Companies listed on a major US exchange, Nasdaq or NYSE, with market caps up to roughly 100
          billion dollars, mapped against a ten-category AI ecosystem taxonomy modeled on the frameworks
          used by Goldman Sachs and Morgan Stanley research. Exchange listing, not country of
          incorporation, is what matters here, since it is what makes a position genuinely investable and
          liquid. Nebius Group, a Dutch entity trading on Nasdaq, is a working example. The portfolio is
          concentrated by design, around ten names, not a diversified basket, and the thesis is that deep
          ecosystem intelligence on AI stack dependencies produces better risk-adjusted returns than
          passive AI exposure. The 100 billion dollar ceiling is checked at intake; what happens if a
          holding grows past it afterward is an open question the system does not yet have a stated answer
          to.
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
          How candidates enter the pipeline
        </h2>
        <p className="mb-3 text-sm leading-relaxed text-[#cfd1d5]">
          A scoring system is only as good as what it gets asked to score. A candidate is sourced from one
          of four channels, often several at once as a researched batch rather than one name at a time, and
          has to clear an eligibility screen before it is{" "}
          <Link href="/companies/new" className="text-signal hover:underline">
            added
          </Link>{" "}
          at all.
        </p>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Sourcing</p>
        <ul className="mb-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[#cfd1d5]">
          <li>
            A coverage gap. The{" "}
            <Link href="/dashboard" className="text-signal hover:underline">
              Coverage map
            </Link>{" "}
            flags any AI category with zero companies researched, and that gap is itself the prompt to go
            find a candidate there.
          </li>
          <li>
            An ecosystem mention. Researching one company&apos;s partners, suppliers, or customers
            regularly turns up a name not yet in the universe.
          </li>
          <li>
            A specific company named in scanned institutional research, logged in the{" "}
            <Link href="/research" className="text-signal hover:underline">
              Research digest
            </Link>
            .
          </li>
          <li>Direct observation: news, filings, or market activity surfacing a name worth a look.</li>
        </ul>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
          How sourcing actually happens in practice
        </p>
        <p className="mb-3 text-sm leading-relaxed text-[#cfd1d5]">
          Most candidates do not arrive one at a time. A coverage gap or a direct request to expand a
          category prompts a preliminary research pass across several plausible candidates at once, each
          checked against the same basic criteria, ticker, category fit, market cap range, and a real
          reason it belongs, before being proposed. That preliminary pass is deliberately lighter than full
          scoring: it establishes eligibility and a working rationale, not the six-dimension composite or a
          confidence read, which only happen once a candidate is actually being tracked. The result is a
          shortlist, not an automatic addition. A person decides which of the proposed candidates actually
          get added, and every one that is still has to clear the same intake requirements individually, no
          exception for arriving as part of a batch.
        </p>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Eligibility screen, enforced at intake
        </p>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          Ticker, AI category, AI materiality, and a real description of why the company is being tracked
          are all required fields, not optional ones, both in the form and in the underlying action that
          saves it. A name with no recorded rationale is indistinguishable from a passing thought, and the
          system will not save one. This is the one piece of intake discipline that is mechanically
          enforced rather than just practiced; sourcing itself stays a human judgment call informed by the
          four channels above, not something a screener generates automatically.
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
          just a status change with no record of why. All three live on the{" "}
          <Link href="/" className="text-signal hover:underline">
            homepage
          </Link>
          .
        </p>
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
          Before a candidate is promoted from the Watched Pipeline into the Investment Portfolio, its
          confidence score is checked. Below 3 out of 5, a warning appears asking for explicit confirmation
          that the underlying data is solid enough to size real capital against. It is a soft flag, not a
          hard rule, the decision to proceed stays a human one.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">
          Promotion-time concentration flag
        </h2>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          The same promote screen checks the candidate against current holdings on two dimensions: whether
          any invested holding already shares its AI category, and whether any invested holding has a
          disclosed relationship with the same named partner. Both are non-blocking flags, not a calculated
          score, since most overlap in this kind of book is structural rather than alarming, an AI
          infrastructure thesis will naturally cluster around the same handful of hyperscalers and chip
          suppliers. The flag exists so that clustering is visible at the moment of committing capital,
          not to discourage it outright.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">
          Capital concentration
        </h2>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          The{" "}
          <Link href="/dashboard" className="text-signal hover:underline">
            Coverage map
          </Link>{" "}
          separates two different questions. Capital concentration is about real money: what share of
          currently invested value sits in each AI category, and what share sits in a holding with a
          disclosed relationship to a given named partner, weighted by each holding&apos;s current position
          value, not a simple count of companies. A holding with several partners contributes its full
          value to each one, since the position is genuinely exposed through every one of those
          relationships at once, not divided across them. Research coverage, shown separately further down
          the same page, answers a different question: which parts of the taxonomy have been researched at
          all, independent of whether anything found there was ever funded.
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
          market, not just positive returns in isolation. Shown on the{" "}
          <Link href="/scorecard" className="text-signal hover:underline">
            Scorecard
          </Link>
          .
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">
          Validation: does the ranking actually work
        </h2>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          The{" "}
          <Link href="/scorecard" className="text-signal hover:underline">
            Scorecard
          </Link>{" "}
          tracks the Pearson correlation, separately, between composite and confidence on one side and each
          stock&apos;s return since it was scored on the other, across every graded score on record. A
          positive number for confidence means scores backed by more verified, primary-source data have
          tended to outperform scores resting on thinner inputs. This is a deliberately strict methodology:
          no correlation is shown until there are at least 20 graded scores averaging at least 30 days of
          tracking, since a correlation computed on too little data is noise dressed up as signal. The
          system is built to measure whether it works, not to assume it does.
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
          simply has not been looked at yet. The{" "}
          <Link href="/audit" className="text-signal hover:underline">
            Data quality
          </Link>{" "}
          page checks this mechanically where it can: that each composite score actually equals its
          weighted dimensions within a small rounding tolerance, that an ownership trend is never set
          without the percentage behind it, since a trend with no number is unverifiable, that core
          financial fields are not silently missing, and that market cap snapshots are not going stale. It
          catches arithmetic, internal inconsistency, and staleness, not whether a primary source was
          genuinely checked, that part stays a matter of discipline, not something software can verify on
          its own.
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
          signal. Logged on the{" "}
          <Link href="/research" className="text-signal hover:underline">
            Research digest
          </Link>{" "}
          page.
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
