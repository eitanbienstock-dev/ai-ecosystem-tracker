"use client";

import { useEffect, useState } from "react";
import { Portfolio } from "./NewPortfolioModal";

type Row = {
  company_id: string;
  name: string | null;
  ticker: string | null;
  entryDate: string;
  costBasis: number;
  approx: boolean;
  holdingReturnPct: number | null;
  benchmarkReturnPct: number | null;
  sectorBenchmarkReturnPct: number | null;
  excessPct: number | null;
  sectorExcessPct: number | null;
};

type Aggregate = {
  portfolioReturnPct: number | null;
  benchmarkReturnPct: number | null;
  sectorBenchmarkReturnPct: number | null;
  excessPct: number | null;
  sectorExcessPct: number | null;
  anyApprox: boolean;
};

function pct(v: number | null): string {
  if (v === null) return "not yet available";
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function pts(v: number | null): string {
  if (v === null) return "";
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}pts`;
}

function Figure({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted">{label}</p>
      <p className={`font-mono text-2xl font-bold ${color ?? "text-[#e7e8ea]"}`}>{value}</p>
    </div>
  );
}

function excessColor(v: number | null): string {
  if (v === null) return "text-muted";
  return v >= 0 ? "text-rise" : "text-fall";
}

export default function ScorecardBenchmark() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingPortfolios, setLoadingPortfolios] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/portfolios")
      .then((r) => r.json())
      .then(({ portfolios: data }) => {
        const list: Portfolio[] = data ?? [];
        setPortfolios(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .finally(() => setLoadingPortfolios(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setRows([]);
    setAggregate(null);
    fetch(`/api/portfolios/${selectedId}/benchmark`)
      .then((r) => r.json())
      .then(({ rows: r, aggregate: a }) => {
        setRows(r ?? []);
        setAggregate(a ?? null);
      })
      .finally(() => setLoading(false));
  }, [selectedId]);

  const selected = portfolios.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="mb-6 rounded border border-line bg-panel p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Portfolio vs benchmark</p>

      {/* Portfolio selector — a compact pill row scoped to this section */}
      {loadingPortfolios ? (
        <div className="mb-4 h-7 w-40 animate-pulse rounded-full bg-panelhi" />
      ) : portfolios.length === 0 ? (
        <p className="text-sm text-muted">No portfolios yet.</p>
      ) : (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {portfolios.map((p) => {
            const active = selectedId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`flex items-center rounded-full px-3 py-1 text-sm transition-colors ${
                  active
                    ? "bg-signal font-medium text-black"
                    : "border border-line text-muted hover:border-signal hover:text-[#e7e8ea]"
                }`}
              >
                {p.name}
                <span className={`ml-1.5 font-mono text-[10px] ${active ? "opacity-60" : "opacity-75"}`}>
                  {p.portfolio_type}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selected && loading && (
        <div className="space-y-2">
          <div className="h-12 w-full animate-pulse rounded bg-panelhi" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-panelhi" />
        </div>
      )}

      {selected && !loading && rows.length === 0 && (
        <p className="text-sm text-muted">
          No positions in this portfolio yet. Add positions to see benchmark comparisons.
        </p>
      )}

      {selected && !loading && rows.length > 0 && aggregate && (
        <>
          <div className="mb-3 flex flex-wrap gap-8">
            <Figure label="Portfolio return since entry, value-weighted" value={pct(aggregate.portfolioReturnPct)} />
            <Figure label="S&P 500 over the same entry windows" value={pct(aggregate.benchmarkReturnPct)} color="text-muted" />
            <Figure label="SOXX semiconductor index, same windows" value={pct(aggregate.sectorBenchmarkReturnPct)} color="text-muted" />
            <Figure label="Excess vs S&P 500" value={aggregate.excessPct !== null ? pts(aggregate.excessPct) : "not yet available"} color={excessColor(aggregate.excessPct)} />
            <Figure label="Excess vs sector" value={aggregate.sectorExcessPct !== null ? pts(aggregate.sectorExcessPct) : "not yet available"} color={excessColor(aggregate.sectorExcessPct)} />
          </div>

          <div className="space-y-1">
            {rows.map((r) => (
              <p key={r.company_id} className="text-xs text-muted">
                <span className="font-medium text-[#e7e8ea]">{r.name ?? r.company_id}</span>{" "}
                {pct(r.holdingReturnPct)}
                {" vs SPY "}
                {pct(r.benchmarkReturnPct)}
                {r.excessPct !== null && (
                  <span className={r.excessPct >= 0 ? "text-rise" : "text-fall"}>
                    {" "}({pts(r.excessPct)})
                  </span>
                )}
                {" / vs SOXX "}
                {pct(r.sectorBenchmarkReturnPct)}
                {r.sectorExcessPct !== null && (
                  <span className={r.sectorExcessPct >= 0 ? "text-rise" : "text-fall"}>
                    {" "}({pts(r.sectorExcessPct)})
                  </span>
                )}
                {r.approx && (
                  <span className="ml-1.5 rounded bg-panelhi px-1 py-px text-[10px] text-muted" title="Benchmark price at entry is approximate: it was not captured on the exact entry date.">
                    approximate
                  </span>
                )}
              </p>
            ))}
          </div>

          {aggregate.anyApprox && (
            <p className="mt-3 text-[11px] text-muted">
              Positions marked approximate use a benchmark entry price that was not captured on the exact
              first-buy date, so their benchmark comparison is indicative rather than exact.
            </p>
          )}

          <p className="mt-3 text-[11px] text-muted">
            Each position is compared against both the S&amp;P 500 and the SOXX semiconductor index over the
            same window, from its own first buy in this portfolio to now, not a shared calendar period, since
            capital was deployed on different dates. The sector benchmark exists because a concentrated AI
            infrastructure book can beat the broad market just by being in a hot sector; beating SOXX
            specifically is the more honest signal. The aggregate weights each position by its cost basis.
          </p>
        </>
      )}
    </div>
  );
}
