"use client";

import { useState } from "react";
import Link from "next/link";
import { Company, Score, DecisionLogEntry } from "@/lib/supabase";
import { logReview, recordTransaction } from "@/lib/actions";

type PortfolioCardData = {
  company: Company;
  currentScore: Score | undefined;
  entryScoreVal: Score | undefined;
  targetWeight: number;
  effectiveTargetWeight: number;
  currentWeight: number;
  daysHeld: number | null;
  overdueCatalystCount: number;
  log: DecisionLogEntry[];
};

function fmtMarketCap(value: number | null) {
  if (value === null) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  return `$${value}`;
}

const dimLabels = ["ecosystem", "financial", "ai moat", "management", "catalyst", "valuation"];
const dimWeights = [25, 20, 15, 15, 15, 10];

export default function PortfolioCard({ data }: { data: PortfolioCardData }) {
  const [open, setOpen] = useState(false);
  const [showCaution, setShowCaution] = useState<null | "trimmed" | "exited">(null);

  const { company, currentScore, entryScoreVal, targetWeight, effectiveTargetWeight, currentWeight, daysHeld, overdueCatalystCount, log } = data;

  const scoreDelta = (currentScore?.composite_score ?? 0) - (entryScoreVal?.composite_score ?? 0);
  const drift = currentWeight - effectiveTargetWeight;
  const weightFlagged = Math.abs(drift) >= 10;
  const underYear = (daysHeld ?? 0) < 365;

  const dims = currentScore
    ? [
        { v: currentScore.ecosystem_position_score, n: currentScore.ecosystem_position_note },
        { v: currentScore.financial_quality_score, n: currentScore.financial_quality_note },
        { v: currentScore.ai_moat_score, n: currentScore.ai_moat_note },
        { v: currentScore.management_ownership_score, n: currentScore.management_ownership_note },
        { v: currentScore.catalyst_clarity_score, n: currentScore.catalyst_clarity_note },
        { v: currentScore.valuation_score, n: currentScore.valuation_note },
      ]
    : [];

  function attemptAction(type: "trimmed" | "exited") {
    if (underYear) {
      setShowCaution(type);
    } else {
      const form = document.getElementById(`txn-form-${company.id}`) as HTMLFormElement;
      (form.elements.namedItem("entry_type") as HTMLInputElement).value = type;
      form.requestSubmit();
    }
  }

  function proceedAnyway() {
    if (!showCaution) return;
    const form = document.getElementById(`txn-form-${company.id}`) as HTMLFormElement;
    (form.elements.namedItem("entry_type") as HTMLInputElement).value = showCaution;
    setShowCaution(null);
    form.requestSubmit();
  }

  return (
    <div className="rounded border border-line bg-panel p-5">
      <div className="flex items-end justify-between">
        <div className="cursor-pointer" onClick={() => setOpen(!open)}>
          <Link
            href={`/companies/${company.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-[#e7e8ea] hover:text-signal"
          >
            {company.name}
          </Link>{" "}
          <span className="font-mono text-xs text-muted">{company.ticker}</span>
        </div>
        <div className="flex items-end gap-4 cursor-pointer" onClick={() => setOpen(!open)}>
          <div className="text-right">
            <div className="text-[10px] text-muted">composite</div>
            <div className="font-mono text-lg font-semibold text-[#e7e8ea]">
              {currentScore?.composite_score ?? "—"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted">confidence</div>
            <div className="font-mono text-lg font-semibold text-[#e7e8ea]">
              {currentScore?.confidence_score ?? "—"}/5
            </div>
          </div>
          <div className="text-right text-xs text-muted">
            held {daysHeld !== null ? Math.round(daysHeld / 30) : "—"}mo
          </div>
        </div>
      </div>

      <div className="relative mt-2 h-1.5 rounded bg-panelhi">
        <div
          className={`absolute left-0 top-0 h-1.5 rounded ${weightFlagged ? "bg-signal" : "bg-rise/60"}`}
          style={{ width: `${Math.min(currentWeight, 100)}%` }}
        />
        <div
          className="absolute -top-0.5 h-2.5 w-0.5 bg-[#e7e8ea]"
          style={{ left: `${Math.min(effectiveTargetWeight, 100)}%` }}
        />
      </div>
      <p className={`mt-1 text-xs ${weightFlagged ? "text-signal" : "text-muted"}`}>
        current {Math.round(currentWeight)}% &middot; target {Math.round(effectiveTargetWeight)}% &middot; drift{" "}
        {drift > 0 ? "+" : ""}
        {Math.round(drift)}pts{weightFlagged ? " — flagged" : ""}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {scoreDelta <= -5 && <span className="badge bg-fall/15 text-fall">score down {scoreDelta}</span>}
        {scoreDelta >= 5 && <span className="badge bg-rise/15 text-rise">score up +{scoreDelta}</span>}
        {weightFlagged && <span className="badge bg-signal/15 text-signal">weight drift</span>}
        {overdueCatalystCount > 0 && (
          <span className="badge bg-signal/15 text-signal">{overdueCatalystCount} catalyst overdue</span>
        )}
        {company.needs_review && <span className="badge bg-signal/15 text-signal">needs review</span>}
        {!weightFlagged && overdueCatalystCount === 0 && !company.needs_review && scoreDelta > -5 && scoreDelta < 5 && (
          <span className="text-xs text-muted">no flags</span>
        )}
      </div>

      {open && (
        <div className="mt-4 border-t border-line pt-4" onClick={(e) => e.stopPropagation()}>
          {currentScore && (
            <div className="mb-3 rounded bg-panelhi p-3">
              <p className="mb-2 text-xs font-medium text-[#e7e8ea]">Composite score breakdown</p>
              {dims.map((d, i) => (
                <div key={i} className="mb-1.5">
                  <span className="font-mono text-sm font-medium text-[#e7e8ea]">{d.v ?? "—"}</span>{" "}
                  <span className="text-xs text-muted">
                    {dimLabels[i]} ({dimWeights[i]}% weight)
                  </span>
                  {d.n && <div className="text-xs text-[#cfd1d5]">{d.n}</div>}
                </div>
              ))}
              <div className="mt-2 border-t border-line pt-2">
                <span className="font-mono text-sm font-medium text-[#e7e8ea]">
                  {currentScore.confidence_score}/5
                </span>{" "}
                <span className="text-xs text-muted">confidence, how verified and stable the score inputs are</span>
                {currentScore.confidence_note && (
                  <div className="text-xs text-[#cfd1d5]">{currentScore.confidence_note}</div>
                )}
              </div>
              {currentScore.ecosystem_synthesis && (
                <p className="mt-2 rounded bg-panel p-2 text-xs text-signal">
                  <span className="font-medium">What the ecosystem position means: </span>
                  {currentScore.ecosystem_synthesis}
                </p>
              )}
              {currentScore.thesis && <p className="mt-2 text-xs text-[#cfd1d5]">{currentScore.thesis}</p>}
              {currentScore.biggest_risk && (
                <p className="mt-1 text-xs text-fall">Risk: {currentScore.biggest_risk}</p>
              )}
            </div>
          )}

          <p className="mb-2 text-xs text-muted">
            Entered {company.entry_date} at ${company.entry_price?.toFixed(2)} &middot; entry score{" "}
            {entryScoreVal?.composite_score ?? "—"} &middot; last reviewed {company.last_reviewed_at ?? "never"}
          </p>

          <div className="mb-3 space-y-1">
            {log.length === 0 && <p className="text-xs text-muted">No decision log entries yet.</p>}
            {log.map((l) => (
              <div key={l.id} className="text-xs">
                <span className="font-mono text-muted">{l.entry_date}</span> — {l.entry_type}
                {l.note ? `: ${l.note}` : ""}
              </div>
            ))}
          </div>

          <form
            id={`review-form-${company.id}`}
            action={logReview.bind(null, company.id)}
            className="mb-2 flex gap-2"
          >
            <input
              name="note"
              placeholder="Review note (defaults to no change)"
              className="input flex-1 text-xs"
            />
            {company.needs_review && (
              <label className="flex items-center gap-1 text-xs text-muted">
                <input type="checkbox" name="clear_needs_review" /> clears flag
              </label>
            )}
            <button type="submit" className="rounded border border-line px-3 py-1 text-xs hover:border-signal">
              Log review
            </button>
          </form>

          <form id={`txn-form-${company.id}`} action={recordTransaction.bind(null, company.id)} className="hidden">
            <input type="hidden" name="entry_type" />
            <input type="hidden" name="price" value={company.entry_price ?? 0} />
            <input type="hidden" name="shares" value={company.shares_held ?? 0} />
          </form>

          <div className="flex gap-2">
            <button
              onClick={() => attemptAction("trimmed")}
              className="rounded border border-line px-3 py-1 text-xs hover:border-signal"
            >
              Trim
            </button>
            <button
              onClick={() => attemptAction("exited")}
              className="rounded border border-line px-3 py-1 text-xs hover:border-fall"
            >
              Exit
            </button>
            <Link
              href={`/companies/${company.id}/edit`}
              className="rounded border border-line px-3 py-1 text-xs text-muted hover:border-signal"
            >
              Edit research
            </Link>
          </div>

          {showCaution && (
            <div className="mt-3 rounded bg-signal/10 p-3">
              <p className="mb-2 text-xs text-signal">
                Held {Math.round((daysHeld ?? 0) / 30)} months, below the preferred 12 month minimum. Not blocked,
                just worth confirming.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={proceedAnyway}
                  className="rounded border border-line px-3 py-1 text-xs hover:border-signal"
                >
                  Proceed anyway
                </button>
                <button
                  onClick={() => setShowCaution(null)}
                  className="rounded border border-line px-3 py-1 text-xs hover:border-fall"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
