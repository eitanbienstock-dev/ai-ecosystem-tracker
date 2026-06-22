"use client";

import { useState } from "react";
import Link from "next/link";
import { Company, Score } from "@/lib/supabase";
import { STATUS_DEFINITIONS } from "@/lib/statusDefinitions";
import { updateResearchStatus } from "@/lib/actions";

type Row = { company: Company; score: Score | undefined; signal?: { overdue: number; newlyResolved: number } };

const dimLabels = ["ecosystem", "financial", "ai moat", "management", "catalyst", "valuation"];
const dimWeights = [25, 20, 15, 15, 15, 10];
const PIPELINE_STATUSES = ["watching", "researching", "active_watch"];

export default function PipelineTable({ rows }: { rows: Row[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<Record<string, string>>({});

  function handleStatusChange(companyId: string, newStatus: string, conviction: number | null | undefined) {
    if (newStatus === "active_watch" && (conviction ?? 0) < 3) {
      setLocalStatus((prev) => ({ ...prev, [companyId]: newStatus }));
      setConfirmingId(companyId);
      return;
    }
    setLocalStatus((prev) => ({ ...prev, [companyId]: newStatus }));
    document.getElementById(`status-form-${companyId}`)?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
  }

  function confirmAnyway(companyId: string) {
    setConfirmingId(null);
    (document.getElementById(`status-form-${companyId}`) as HTMLFormElement)?.requestSubmit();
  }

  function cancelPromotion(companyId: string, originalStatus: string) {
    setLocalStatus((prev) => ({ ...prev, [companyId]: originalStatus }));
    setConfirmingId(null);
  }

  return (
    <div className="overflow-hidden rounded border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-panel text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Composite</th>
            <th className="px-4 py-3">Conviction</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ company: c, score: s, signal }) => (
            <>
              <tr key={c.id} className="border-b border-line bg-panel/40 hover:bg-panelhi">
                <td className="px-4 py-3">
                  <Link href={`/companies/${c.id}`} className="font-medium text-[#e7e8ea]">
                    {c.name}
                  </Link>{" "}
                  <span
                    className="cursor-pointer font-mono text-xs text-muted hover:text-signal"
                    onClick={() => setOpenId(openId === c.id ? null : c.id)}
                  >
                    {c.ticker}
                  </span>
                  {c.rejection_reason && (
                    <span className="ml-2 text-xs text-muted" title={`Previously rejected: ${c.rejection_reason}`}>
                      (previously passed)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <form id={`status-form-${c.id}`} action={updateResearchStatus.bind(null, c.id)}>
                    <input type="hidden" name="research_status" value={localStatus[c.id] ?? c.research_status} />
                    <select
                      value={localStatus[c.id] ?? c.research_status}
                      onChange={(e) => handleStatusChange(c.id, e.target.value, s?.conviction_score)}
                      title={STATUS_DEFINITIONS[c.research_status]}
                      className="rounded border border-line bg-panelhi px-2 py-1 text-xs text-muted hover:border-signal"
                    >
                      {PIPELINE_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </form>
                  {signal && signal.newlyResolved > 0 && (
                    <span
                      className="badge ml-1.5 bg-rise/15 text-rise"
                      title="A catalyst was marked resolved in the last 30 days, new information worth a promotion decision"
                    >
                      new info
                    </span>
                  )}
                  {signal && signal.overdue > 0 && (
                    <span
                      className="badge ml-1.5 bg-signal/15 text-signal"
                      title="A catalyst's expected date has passed while still pending, worth checking what actually happened"
                    >
                      check due
                    </span>
                  )}
                  {confirmingId === c.id && (
                    <div className="mt-2 rounded bg-signal/10 p-2">
                      <p className="mb-1.5 text-xs text-signal">
                        Conviction is {s?.conviction_score ?? "—"}/5, below the usual 3/5 guideline for active
                        watch. Not blocked, just confirm.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => confirmAnyway(c.id)}
                          className="rounded border border-line px-2 py-0.5 text-xs hover:border-signal"
                        >
                          Promote anyway
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelPromotion(c.id, c.research_status)}
                          className="rounded border border-line px-2 py-0.5 text-xs hover:border-fall"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-sm text-[#e7e8ea]">{s?.composite_score ?? "—"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-sm text-[#e7e8ea]">{s?.conviction_score ?? "—"}/5</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/companies/${c.id}/promote`}
                    className="rounded border border-line px-3 py-1 text-xs hover:border-signal"
                  >
                    Promote to invested
                  </Link>
                </td>
              </tr>
              {openId === c.id && s && (
                <tr key={`${c.id}-rationale`} className="border-b border-line bg-panelhi">
                  <td colSpan={5} className="px-4 py-3">
                    <p className="mb-2 text-xs font-medium text-[#e7e8ea]">{c.name} — composite score breakdown</p>
                    {[
                      [s.ecosystem_position_score, s.ecosystem_position_note],
                      [s.financial_quality_score, s.financial_quality_note],
                      [s.ai_moat_score, s.ai_moat_note],
                      [s.management_ownership_score, s.management_ownership_note],
                      [s.catalyst_clarity_score, s.catalyst_clarity_note],
                      [s.valuation_score, s.valuation_note],
                    ].map(([v, n], i) => (
                      <div key={i} className="mb-1.5">
                        <span className="font-mono text-sm font-medium text-[#e7e8ea]">{v ?? "—"}</span>{" "}
                        <span className="text-xs text-muted">
                          {dimLabels[i]} ({dimWeights[i]}% weight)
                        </span>
                        {n && <div className="text-xs text-[#cfd1d5]">{n}</div>}
                      </div>
                    ))}
                    <div className="mt-2 border-t border-line pt-2">
                      <span className="font-mono text-sm font-medium text-[#e7e8ea]">{s.conviction_score}/5</span>{" "}
                      <span className="text-xs text-muted">conviction, holistic judgment on top of the formula</span>
                      {s.conviction_note && <div className="text-xs text-[#cfd1d5]">{s.conviction_note}</div>}
                      {s.watch_condition && (
                        <div className="mt-1 text-xs text-signal">Watching for: {s.watch_condition}</div>
                      )}
                    </div>
                    {s.thesis && <p className="mt-2 text-xs text-[#cfd1d5]">{s.thesis}</p>}
                    {s.biggest_risk && <p className="mt-1 text-xs text-fall">Risk: {s.biggest_risk}</p>}
                    <Link
                      href={`/companies/${c.id}`}
                      className="mt-3 inline-block text-xs text-signal hover:underline"
                    >
                      View full research (financials, management, moat, partnerships, catalysts) →
                    </Link>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
