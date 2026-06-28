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
    def: "Insider and institutional ownership trends, whether AI-related claims hold up under scrutiny, and the insider transaction signal from Form 4 filings: net buying, net selling, or mixed/neutral, where open-market purchases are the strongest management-conviction signal available since they are rare and discretionary.",
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

      <nav className="mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">On this page</p>
        <ul className="space-y-1 text-sm leading-relaxed text-[#cfd1d5]">
          <li>
            <a href="#universe" className="text-signal hover:underline">Universe</a>
          </li>
          <li>
            <a href="#candidate-intake" className="text-signal hover:underline">
              How candidates enter the pipeline
            </a>
            <ul className="mt-1 space-y-1 pl-5">
              <li>
                <a href="#sourcing" className="text-signal hover:underline">Sourcing</a>
              </li>
              <li>
                <a href="#sourcing-in-practice" className="text-signal hover:underline">
                  How sourcing actually happens in practice
                </a>
              </li>
              <li>
                <a href="#eligibility-screen" className="text-signal hover:underline">
                  Eligibility screen, enforced at intake
                </a>
              </li>
            </ul>
          </li>
          <li>
            <a href="#workflow-states" className="text-signal hover:underline">Workflow states</a>
          </li>
          <li>
            <a href="#pipeline-table" className="text-signal hover:underline">Pipeline table</a>
          </li>
          <li>
            <a href="#portfolio-architecture" className="text-signal hover:underline">Portfolio architecture</a>
          </li>
          <li>
            <a href="#transaction-ledger" className="text-signal hover:underline">Transaction ledger</a>
          </li>
          <li>
            <a href="#composite-score" className="text-signal hover:underline">Composite score (0 to 100)</a>
          </li>
          <li>
            <a href="#leverage-assessment" className="text-signal hover:underline">Leverage assessment</a>
          </li>
          <li>
            <a href="#confidence-score" className="text-signal hover:underline">Confidence score (1 to 5)</a>
          </li>
          <li>
            <a href="#position-sizing" className="text-signal hover:underline">Position sizing</a>
          </li>
          <li>
            <a href="#confidence-floor" className="text-signal hover:underline">Confidence floor</a>
          </li>
          <li>
            <a href="#concentration-flag" className="text-signal hover:underline">
              Promotion-time concentration flag
            </a>
          </li>
          <li>
            <a href="#capital-concentration" className="text-signal hover:underline">Capital concentration</a>
          </li>
          <li>
            <a href="#benchmark-comparison" className="text-signal hover:underline">Benchmark comparison</a>
          </li>
          <li>
            <a href="#validation" className="text-signal hover:underline">
              Validation: does the ranking actually work
            </a>
          </li>
          <li>
            <a href="#data-sourcing" className="text-signal hover:underline">Data sourcing discipline</a>
          </li>
          <li>
            <a href="#research-digest" className="text-signal hover:underline">Research digest</a>
          </li>
          <li>
            <a href="#what-this-is-not" className="text-signal hover:underline">What this is not</a>
          </li>
        </ul>
      </nav>

      <section id="universe" className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">Universe</h2>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          Companies listed on a major US exchange, Nasdaq or NYSE, with market caps up to roughly 100
          billion dollars, mapped against a ten-category AI ecosystem taxonomy modeled on the frameworks
          used by Goldman Sachs and Morgan Stanley research. Exchange listing, not country of
          incorporation, is what matters here, since it is what makes a position genuinely investable and
          liquid. Nebius Group, a Dutch entity trading on Nasdaq, is a working example. The portfolio is
          concentrated by design, around ten names, not a diversified basket, and the thesis is that deep
          ecosystem intelligence on AI stack dependencies produces better risk-adjusted returns than
          passive AI exposure. The 100 billion dollar ceiling is checked at intake. If an existing holding
          grows past it afterward, nothing is automatically actioned, selling a winner on a schedule set by
          its own re-rating rather than by anything about the business changing would be close to
          self-sabotage for a concentrated, conviction-driven book. Instead, a visible flag appears on the
          company page and on its portfolio card once market cap crosses the ceiling without having been a
          deliberate intake exception, the same pattern already used for weight drift and overdue
          catalysts: nothing forced, just a conscious prompt to ask whether the original under-coverage
          rationale still holds. Exceptions to the ceiling can also be made at intake itself, but only
          deliberately and visibly, not quietly: Marvell Technology was added at roughly 244 billion
          dollars specifically because its strategic position in AI custom silicon and optical interconnect
          was judged to outweigh the size consideration, a recorded, one-off override of the screen rather
          than a change to the screen, and is excluded from the crossing flag since it was never under the
          ceiling to begin with.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CATEGORY_ORDER.map((cat) => (
            <span key={cat} className="badge bg-panelhi text-muted">
              {CATEGORY_LABELS[cat]}
            </span>
          ))}
        </div>
      </section>

      <section id="candidate-intake" className="mb-8">
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
          at all. Category balance is not itself a goal: a coverage gap is one legitimate reason to go
          looking, but it never justifies adding a company that is not genuinely one of the strongest
          opportunities found. Several names can land in the same category if that is honestly where the
          best ideas are.
        </p>
        <p id="sourcing" className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Sourcing</p>
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
        <p id="sourcing-in-practice" className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
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
        <p id="eligibility-screen" className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
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

      <section id="workflow-states" className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">Workflow states</h2>
        <p className="mb-3 text-sm leading-relaxed text-[#cfd1d5]">
          Every company carries exactly one of four research statuses, all visible in the pipeline table on
          the{" "}
          <Link href="/" className="text-signal hover:underline">
            homepage
          </Link>
          {" "}and filterable by status.
        </p>
        <div className="mb-3 overflow-hidden rounded border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-panel text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line bg-panel/40">
                <td className="px-4 py-3 font-medium text-[#e7e8ea]">Watched</td>
                <td className="px-4 py-3 text-[#cfd1d5]">
                  In the active pipeline. Scored and ranked, no current position in any portfolio.
                </td>
              </tr>
              <tr className="border-b border-line bg-panel/40">
                <td className="px-4 py-3 font-medium text-[#e7e8ea]">Holding</td>
                <td className="px-4 py-3 text-[#cfd1d5]">
                  An active position exists in at least one portfolio. Set automatically when a buy
                  transaction is recorded.
                </td>
              </tr>
              <tr className="border-b border-line bg-panel/40">
                <td className="px-4 py-3 font-medium text-[#e7e8ea]">Exited</td>
                <td className="px-4 py-3 text-[#cfd1d5]">
                  Was previously held and has been fully sold across all portfolios. Set automatically
                  when net shares reach zero.
                </td>
              </tr>
              <tr className="border-b border-line bg-panel/40 last:border-0">
                <td className="px-4 py-3 font-medium text-[#e7e8ea]">Archived</td>
                <td className="px-4 py-3 text-[#cfd1d5]">
                  No longer under active consideration. Evaluated and passed on, or exited with no
                  expectation of return. Every archived company carries a required, visible reason.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          Status transitions between Watched, Holding, and Exited are automatic: the system updates
          research_status whenever a buy or sell transaction is recorded, based on net shares across all
          portfolios. Moving a company from Exited or Archived back to the pipeline restores it to Watched.
        </p>
      </section>

      <section id="pipeline-table" className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">Pipeline table</h2>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          The pipeline table on the{" "}
          <Link href="/" className="text-signal hover:underline">
            homepage
          </Link>{" "}
          lists every company with its status, composite score, and confidence score, alongside a live
          current price and today&apos;s percentage change pulled from Finnhub for each row, fetched when
          the page loads and shown as a dash for any ticker whose quote is unavailable. By default the rows
          are sorted by confidence descending, then composite descending, so the most reliably-scored names
          surface first; clicking the composite or confidence column header switches the sort to that
          column. Status filter chips above the table narrow it to Watched, Holding, Exited, or Archived, or
          show every company at once.
        </p>
      </section>

      <section id="portfolio-architecture" className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">
          Portfolio architecture
        </h2>
        <p className="mb-3 text-sm leading-relaxed text-[#cfd1d5]">
          The system supports multiple named portfolios, each tracking positions independently. Two portfolio
          types are available.
        </p>
        <p className="mb-3 text-sm leading-relaxed text-[#cfd1d5]">
          <span className="font-medium text-[#e7e8ea]">Manual</span> portfolios are built position by
          position at the user&apos;s discretion, with no formula governing how capital is sized or
          allocated. Each buy or sell is recorded individually.
        </p>
        <p className="mb-3 text-sm leading-relaxed text-[#cfd1d5]">
          <span className="font-medium text-[#e7e8ea]">Model</span> portfolios are created with a fixed
          capital amount and a selected set of companies. At creation, the system computes an allocation
          across the selected companies using a confidence-adjusted composite weighting formula:
          raw_weight&nbsp;=&nbsp;composite_score&nbsp;×&nbsp;confidence_score for each company; each
          company&apos;s allocation_pct&nbsp;=&nbsp;raw_weight&nbsp;÷&nbsp;sum of all raw_weights;
          dollar_amount&nbsp;=&nbsp;allocation_pct&nbsp;×&nbsp;capital_amount; shares&nbsp;=&nbsp;floor
          of dollar_amount&nbsp;÷&nbsp;current price. Positions created at model launch record the formula
          allocation; any subsequent transactions record the actual override percentage if they deviate
          from the model. Position cards display both the current actual allocation and the original formula
          allocation side by side, and a visible badge flags any position that has been manually adjusted.
        </p>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          Decision log entries are portfolio-scoped: each entry carries a portfolio_id foreign key linking
          it to the portfolio the decision relates to.
        </p>
      </section>

      <section id="transaction-ledger" className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">
          Transaction ledger
        </h2>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          All position changes — buys, sells, trims — are recorded as individual transactions in a
          portfolio_transactions table rather than stored as flat current values on the company record.
          From that ledger, the system computes at read time: shares held (net of all buys and sells for
          that company in that portfolio), weighted average cost basis across all buys, total cost basis,
          and unrealized profit and loss against the live price, in both dollar and percentage terms. A
          company&apos;s research_status is derived from net shares across all portfolios combined:
          any net-positive position anywhere means Holding; fully sold across all portfolios means Exited.
        </p>
      </section>

      <section id="composite-score" className="mb-8">
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

      <section id="leverage-assessment" className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">
          Leverage assessment
        </h2>
        <p className="mb-3 text-sm leading-relaxed text-[#cfd1d5]">
          Each company is assessed on a durability axis separate from the composite score: once things
          settle, is this hard to displace, or could a customer or partner switch to a competitor without
          much pain? Every company receives one of three values.
        </p>
        <div className="mb-3 overflow-hidden rounded border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-panel text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5">Value</th>
                <th className="px-4 py-2.5">Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line bg-panel/40">
                <td className="px-4 py-3 font-medium text-[#e7e8ea]">Hard to replace</td>
                <td className="px-4 py-3 text-[#cfd1d5]">
                  Real switching costs exist. Once embedded, a customer or partner would find it expensive
                  or slow to move to a competitor.
                </td>
              </tr>
              <tr className="border-b border-line bg-panel/40">
                <td className="px-4 py-3 font-medium text-[#e7e8ea]">Commoditized</td>
                <td className="px-4 py-3 text-[#cfd1d5]">
                  Limited switching costs. A customer or partner could move to a competitor without much
                  friction.
                </td>
              </tr>
              <tr className="border-b border-line bg-panel/40 last:border-0">
                <td className="px-4 py-3 font-medium text-[#e7e8ea]">Contested</td>
                <td className="px-4 py-3 text-[#cfd1d5]">
                  Assessed and genuinely balanced: real switching-cost signals alongside real displacement
                  risk, evidence pointing both ways rather than not yet looked at.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          The{" "}
          <Link href="/infrastructure" className="text-signal hover:underline">
            AI Infrastructure Stack
          </Link>{" "}
          page is the conceptual lens for resolving leverage calls: a company&apos;s leverage is assessed by
          where it sits in the stack and whether structural power accrues to its node or flows up or
          downstream to suppliers and customers.
        </p>
      </section>

      <section id="confidence-score" className="mb-8">
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

      <section id="position-sizing" className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">
          Position sizing
        </h2>
        <p className="mb-3 text-sm leading-relaxed text-[#cfd1d5]">
          Manual portfolios use discretionary sizing: each position is sized by the user&apos;s own
          judgment at the time of entry, with no formula involvement.
        </p>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          Model portfolios use a formula-driven allocation described in the Portfolio architecture section
          above. The formula is applied once at portfolio creation using scores at that point in time;
          subsequent re-scores do not automatically rebalance existing positions. The portfolio display
          shows each position&apos;s current actual allocation alongside its original formula allocation,
          so any drift from the original model is visible at a glance.
        </p>
      </section>

      <section id="confidence-floor" className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">Confidence floor</h2>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          Before a candidate is promoted from the Watched Pipeline into the Investment Portfolio, its
          confidence score is checked. Below 3 out of 5, a warning appears asking for explicit confirmation
          that the underlying data is solid enough to size real capital against. It is a soft flag, not a
          hard rule, the decision to proceed stays a human one.
        </p>
      </section>

      <section id="concentration-flag" className="mb-8">
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

      <section id="capital-concentration" className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">
          Capital concentration
        </h2>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          The{" "}
          <Link href="/dashboard" className="text-signal hover:underline">
            Coverage map
          </Link>{" "}
          separates two different questions. Capital concentration is about real money: what share of
          invested capital sits in each AI category, and what share sits in a holding with a disclosed
          relationship to a given named partner, weighted by each holding&apos;s cost basis, not a simple
          count of companies. Cost basis is computed from the transaction ledger, buys minus sells across
          all portfolios, rather than from flat columns on the company record. A holding with several
          partners contributes its full cost basis to each one, since the position is genuinely exposed
          through every one of those relationships at once, not divided across them. Research coverage,
          shown separately further down
          the same page, answers a different question: which parts of the taxonomy have been researched at
          all, independent of whether anything found there was ever funded.
        </p>
      </section>

      <section id="benchmark-comparison" className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-signal">
          Benchmark comparison
        </h2>
        <p className="text-sm leading-relaxed text-[#cfd1d5]">
          Each invested holding is compared against both the S&amp;P 500 and the SOXX semiconductor index
          over the same window, from that holding&apos;s own entry date to now, not a shared calendar
          period, since capital was deployed on different dates and a single shared window would
          misrepresent the comparison for holdings entered at different times. The entry date is the date of
          the company&apos;s first buy transaction in the ledger, and the holding&apos;s entry price is the
          weighted-average cost across its buys, both derived from the transaction ledger rather than a
          stored snapshot. Each benchmark&apos;s price at that entry is captured on the company record and
          compared against its live price today. The sector benchmark exists because this
          book is deliberately concentrated in AI infrastructure, semiconductors most of all, and beating
          the S&amp;P 500 during an AI-driven semiconductor boom proves very little about selection skill
          on its own. Beating SOXX specifically, the sector that is actually driving most of the book's
          concentration, is the more honest test. The portfolio-level number weights each holding by its
          cost basis. This is the explicit test of the standing goal: deep ecosystem
          intelligence should produce returns exceeding the broad market and the sector it sits in, not
          just positive returns in isolation, and not just a sector tailwind mistaken for skill. Shown on
          the{" "}
          <Link href="/scorecard" className="text-signal hover:underline">
            Scorecard
          </Link>
          .
        </p>
      </section>

      <section id="validation" className="mb-8">
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

      <section id="data-sourcing" className="mb-8">
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

      <section id="research-digest" className="mb-8">
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

      <section id="what-this-is-not">
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
