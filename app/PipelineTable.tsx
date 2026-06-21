"use client";

import { useState } from "react";
import Link from "next/link";
import { Company, Score } from "@/lib/supabase";
import { STATUS_DEFINITIONS } from "@/lib/statusDefinitions";
import { updateResearchStatus } from "@/lib/actions";

type Row = { company: Company; score: Score | undefined };

const dimLabels = ["ecosystem", "financial", "ai moat", "management", "catalyst", "valuation"];
const dimWeights = [25, 20, 15, 15, 15, 10];
const PIPELINE_STATUSES = ["watching", "researching", "active_watch"];

export default function PipelineTable({ rows }: { rows: Row[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

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
          {rows.map(({ company: c, score: s }) => (
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
                  <form action={updateResearchStatus.bind(null, c.id)}>
                    <select
                      name="research_status"
                      defaultValue={c.research_status}
                      onChange={(e) => e.target.form?.requestSubmit()}
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
