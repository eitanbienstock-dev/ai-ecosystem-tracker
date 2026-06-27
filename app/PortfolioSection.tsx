"use client";

import { useState, useEffect } from "react";
import PortfolioSelector from "./PortfolioSelector";
import { Portfolio } from "./NewPortfolioModal";

type Transaction = {
  id: string;
  transaction_type: "buy" | "sell";
  shares: number;
  price_per_share: number;
  note: string | null;
  transacted_at: string;
  allocation_override_pct: number | null;
};

type Position = {
  company_id: string;
  name: string | null;
  ticker: string | null;
  shares_held: number;
  weighted_avg_cost: number;
  total_cost_basis: number;
  current_price: number | null;
  transactions: Transaction[];
};

export default function PortfolioSection() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasPortfolios, setHasPortfolios] = useState<boolean | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);

  // Model portfolio: formula allocations (company_id → allocation_pct)
  const [formulaAllocations, setFormulaAllocations] = useState<Map<string, number>>(new Map());

  const selectedPortfolio = portfolios.find((p) => p.id === selectedId) ?? null;
  const isModel = selectedPortfolio?.portfolio_type === "model";

  useEffect(() => {
    if (!selectedId) return;
    setLoadingPositions(true);
    setPositions([]);
    fetch(`/api/portfolios/${selectedId}/positions`)
      .then((r) => r.json())
      .then(({ positions: data }) => setPositions(data ?? []))
      .finally(() => setLoadingPositions(false));
  }, [selectedId]);

  // Fetch formula allocations for model portfolios whenever positions change
  useEffect(() => {
    if (!isModel || !selectedPortfolio?.capital_amount || positions.length === 0) {
      setFormulaAllocations(new Map());
      return;
    }
    const companyIds = positions.map((p) => p.company_id);
    fetch("/api/portfolios/model-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_ids: companyIds,
        capital_amount: selectedPortfolio.capital_amount,
      }),
    })
      .then((r) => r.json())
      .then(({ allocations }) => {
        const map = new Map<string, number>();
        for (const a of allocations ?? []) map.set(a.company_id, a.allocation_pct as number);
        setFormulaAllocations(map);
      });
  // positions reference changes on every fetch, but we only want to re-run when the
  // set of company IDs actually changes — using positions.length as the trigger is
  // a lightweight proxy; a full comparison would require serialising the ID array.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModel, selectedPortfolio?.capital_amount, positions.length, selectedId]);

  function handlePortfoliosChange(list: Portfolio[]) {
    setPortfolios(list);
    setHasPortfolios(list.length > 0);
  }

  const totalCostBasis = positions.reduce((sum, p) => sum + p.total_cost_basis, 0);

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-bold text-[#e7e8ea]">Investment Portfolio</h1>
        {hasPortfolios && selectedId && !loadingPositions && (
          <span className="font-mono text-sm text-muted">{positions.length} positions</span>
        )}
      </div>

      <PortfolioSelector onSelect={setSelectedId} onPortfoliosChange={handlePortfoliosChange} />

      {hasPortfolios === false && (
        <div className="rounded border border-dashed border-line py-10 text-center">
          <p className="text-sm text-muted">No portfolios yet. Create one to start tracking positions.</p>
        </div>
      )}

      {hasPortfolios && loadingPositions && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded border border-line bg-panel" />
          ))}
        </div>
      )}

      {hasPortfolios && !loadingPositions && selectedId && positions.length === 0 && (
        <div className="rounded border border-dashed border-line py-10 text-center">
          <p className="text-sm text-muted">
            No positions in this portfolio. Promote a company from the pipeline to get started.
          </p>
        </div>
      )}

      {hasPortfolios && !loadingPositions && positions.length > 0 && (
        <div className="flex flex-col gap-3">
          {positions.map((pos) => {
            const isExpanded = expandedCompanyId === pos.company_id;
            const actualPct = totalCostBasis > 0 ? (pos.total_cost_basis / totalCostBasis) * 100 : 0;
            const formulaPct = formulaAllocations.get(pos.company_id);
            const isOverridden = pos.transactions.some((tx) => tx.allocation_override_pct !== null);

            return (
              <div key={pos.company_id} className="rounded border border-line bg-panel p-5">
                <div
                  className="flex cursor-pointer items-end justify-between"
                  onClick={() => setExpandedCompanyId(isExpanded ? null : pos.company_id)}
                >
                  <div>
                    <span className="font-medium text-[#e7e8ea]">{pos.name ?? pos.company_id}</span>{" "}
                    <span className="font-mono text-xs text-muted">{pos.ticker}</span>
                    {isOverridden && (
                      <span className="ml-2 rounded bg-signal/15 px-1.5 py-0.5 text-[10px] font-medium text-signal">
                        overridden
                      </span>
                    )}
                  </div>
                  <div className="flex items-end gap-4">
                    <div className="text-right">
                      <div className="text-[10px] text-muted">shares</div>
                      <div className="font-mono text-lg font-semibold text-[#e7e8ea]">{pos.shares_held}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-muted">avg cost</div>
                      <div className="font-mono text-lg font-semibold text-[#e7e8ea]">
                        ${pos.weighted_avg_cost.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-muted">cost basis</div>
                      <div className="font-mono text-lg font-semibold text-[#e7e8ea]">
                        ${pos.total_cost_basis.toFixed(2)}
                      </div>
                    </div>
                    {isModel && (
                      <div className="text-right">
                        <div className="text-[10px] text-muted">
                          {formulaPct !== undefined ? "actual / formula" : "actual"}
                        </div>
                        <div className="font-mono text-lg font-semibold text-[#e7e8ea]">
                          {actualPct.toFixed(1)}%
                          {formulaPct !== undefined && (
                            <span className="ml-1 text-sm font-normal text-muted">
                              / {(formulaPct * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 border-t border-line pt-4" onClick={(e) => e.stopPropagation()}>
                    <p className="mb-2 text-xs font-medium text-[#e7e8ea]">Transaction history</p>
                    {pos.transactions.length === 0 ? (
                      <p className="text-xs text-muted">No transactions.</p>
                    ) : (
                      <div className="space-y-1">
                        {pos.transactions.map((tx) => (
                          <div key={tx.id} className="flex flex-wrap items-center gap-3 text-xs">
                            <span className="font-mono text-muted">{tx.transacted_at}</span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                tx.transaction_type === "buy"
                                  ? "bg-rise/15 text-rise"
                                  : "bg-fall/15 text-fall"
                              }`}
                            >
                              {tx.transaction_type.toUpperCase()}
                            </span>
                            <span className="text-[#cfd1d5]">
                              {tx.shares} shares @ ${Number(tx.price_per_share).toFixed(2)}
                            </span>
                            {tx.allocation_override_pct !== null && (
                              <span className="text-signal">
                                {(tx.allocation_override_pct * 100).toFixed(1)}% override
                              </span>
                            )}
                            {tx.note && <span className="text-muted">{tx.note}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
