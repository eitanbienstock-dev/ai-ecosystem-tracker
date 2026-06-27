"use client";

import { useState, useEffect } from "react";
import PortfolioSelector from "./PortfolioSelector";

type Transaction = {
  id: string;
  transaction_type: "buy" | "sell";
  shares: number;
  price_per_share: number;
  note: string | null;
  transacted_at: string;
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

type Portfolio = {
  id: string;
  name: string;
  description: string | null;
};

export default function PortfolioSection() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasPortfolios, setHasPortfolios] = useState<boolean | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingPositions(true);
    setPositions([]);
    fetch(`/api/portfolios/${selectedId}/positions`)
      .then((r) => r.json())
      .then(({ positions: data }) => setPositions(data ?? []))
      .finally(() => setLoadingPositions(false));
  }, [selectedId]);

  function handlePortfoliosChange(portfolios: Portfolio[]) {
    setHasPortfolios(portfolios.length > 0);
  }

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
            return (
              <div key={pos.company_id} className="rounded border border-line bg-panel p-5">
                <div
                  className="flex cursor-pointer items-end justify-between"
                  onClick={() => setExpandedCompanyId(isExpanded ? null : pos.company_id)}
                >
                  <div>
                    <span className="font-medium text-[#e7e8ea]">{pos.name ?? pos.company_id}</span>{" "}
                    <span className="font-mono text-xs text-muted">{pos.ticker}</span>
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
