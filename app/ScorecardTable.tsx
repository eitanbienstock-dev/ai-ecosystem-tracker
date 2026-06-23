"use client";

import { useState } from "react";
import { formatDate } from "@/lib/format";

type Row = {
  id: string;
  name: string;
  ticker: string | null;
  scoredAt: string;
  daysSince: number;
  composite: number | null;
  confidence: number | null;
  priceThen: number | null;
  priceNow: number | null;
  changePct: number | null;
};

export default function ScorecardTable({ rows }: { rows: Row[] }) {
  const [sortBy, setSortBy] = useState<"composite" | "confidence">("composite");

  const sorted = [...rows].sort((a, b) => {
    const primary = sortBy === "composite" ? [a.composite, b.composite] : [a.confidence, b.confidence];
    const diff = (primary[1] ?? -1) - (primary[0] ?? -1);
    if (diff !== 0) return diff;
    // Tiebreak on the other metric so toggling sort always visibly reorders ties
    const secondary = sortBy === "composite" ? [a.confidence, b.confidence] : [a.composite, b.composite];
    return (secondary[1] ?? -1) - (secondary[0] ?? -1);
  });

  function headerButton(label: string, key: "composite" | "confidence") {
    const active = sortBy === key;
    return (
      <button
        onClick={() => setSortBy(key)}
        className={`flex items-center gap-1 ${active ? "text-signal" : ""}`}
      >
        {label} {active && "↓"}
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-panel text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Scored</th>
            <th className="px-4 py-3">{headerButton("Composite", "composite")}</th>
            <th className="px-4 py-3">{headerButton("Confidence", "confidence")}</th>
            <th className="px-4 py-3">Price then</th>
            <th className="px-4 py-3">Price now</th>
            <th className="px-4 py-3">Change since</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id} className="border-b border-line bg-panel/40">
              <td className="px-4 py-3">
                <span className="font-medium text-[#e7e8ea]">{r.name}</span>{" "}
                <span className="font-mono text-xs text-muted">{r.ticker}</span>
              </td>
              <td className="px-4 py-3 text-xs text-muted">
                {formatDate(r.scoredAt)} ({r.daysSince}d ago)
              </td>
              <td className="px-4 py-3 font-mono">{r.composite ?? "not scored"}</td>
              <td className="px-4 py-3 font-mono">{r.confidence ?? "not graded"}/5</td>
              <td className="px-4 py-3 font-mono text-muted">
                {r.priceThen ? `$${r.priceThen.toFixed(2)}` : "not recorded"}
              </td>
              <td className="px-4 py-3 font-mono text-muted">{r.priceNow ? `$${r.priceNow.toFixed(2)}` : "not available"}</td>
              <td className="px-4 py-3">
                {r.changePct !== null ? (
                  <span className={r.changePct >= 0 ? "text-rise" : "text-fall"}>
                    {r.changePct >= 0 ? "+" : ""}
                    {r.changePct.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-muted">no live price</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
