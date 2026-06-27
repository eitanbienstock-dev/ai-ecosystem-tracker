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
  composite_score: number | null;
  confidence_score: number | null;
  transactions: Transaction[];
};

type TxModalState = {
  portfolioId: string;
  position: Position;
  type: "buy" | "sell";
  sellAll?: boolean;
};

function fmtPnl(n: number): string {
  const abs = Math.abs(n);
  const sign = n >= 0 ? "+" : "−";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function StatCell({ label, value, loading }: { label: string; value: React.ReactNode; loading?: boolean }) {
  return (
    <div className="text-right">
      <div className="text-[10px] text-muted">{label}</div>
      <div className={`font-mono text-sm font-medium ${loading ? "text-muted" : "text-[#e7e8ea]"}`}>
        {value}
      </div>
    </div>
  );
}

function TransactionModal({ state, onClose, onDone }: {
  state: TxModalState;
  onClose: () => void;
  onDone: () => void;
}) {
  const [shares, setShares] = useState(state.sellAll ? String(state.position.shares_held) : "");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBuy = state.type === "buy";

  async function submit() {
    const sharesNum = Number(shares);
    const priceNum = Number(price);
    if (!sharesNum || !priceNum) { setError("Shares and price are required."); return; }
    if (!isBuy && sharesNum > state.position.shares_held) {
      setError(`Cannot sell more than ${state.position.shares_held} shares held.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/portfolios/${state.portfolioId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: state.position.company_id,
          transaction_type: state.type,
          shares: sharesNum,
          price_per_share: priceNum,
          note: note.trim() || null,
          transacted_at: new Date().toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json();
        setError(msg ?? "Transaction failed.");
        return;
      }
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  const title = state.sellAll
    ? `Sell all — ${state.position.name}`
    : isBuy
    ? `Buy more — ${state.position.name}`
    : `Trim — ${state.position.name}`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-24">
      <div className="w-full max-w-sm rounded border border-line bg-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-[#e7e8ea]">{title}</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-[#e7e8ea]">✕</button>
        </div>
        <p className="mb-4 text-xs text-muted">
          {state.position.ticker} · {state.position.shares_held} shares currently held
        </p>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-muted">Shares</span>
          <input
            autoFocus={!state.sellAll}
            type="number"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            readOnly={state.sellAll}
            className="input w-full"
            placeholder="0"
          />
        </label>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-muted">Price per share ($)</span>
          <input
            autoFocus={!!state.sellAll}
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="input w-full"
            placeholder="0.00"
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-xs text-muted">Note (optional)</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input w-full"
            placeholder="Reason for this transaction"
          />
        </label>
        {error && <p className="mb-3 text-xs text-fall">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={submitting}
            className={`rounded px-4 py-1.5 text-sm font-medium disabled:opacity-40 ${
              isBuy
                ? "border border-rise/50 bg-rise/15 text-rise hover:bg-rise/25"
                : "border border-fall/50 bg-fall/15 text-fall hover:bg-fall/25"
            }`}
          >
            {submitting ? "Saving…" : isBuy ? "Record buy" : "Record sell"}
          </button>
          <button
            onClick={onClose}
            className="rounded border border-line px-4 py-1.5 text-sm text-muted hover:border-signal"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioSection() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasPortfolios, setHasPortfolios] = useState<boolean | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
  const [livePriceMap, setLivePriceMap] = useState<Map<string, number | null>>(new Map());
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [txModal, setTxModal] = useState<TxModalState | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
  }, [selectedId, refreshTrigger]);

  // Fetch live prices whenever positions change
  useEffect(() => {
    if (positions.length === 0) { setLivePriceMap(new Map()); return; }
    const tickers = positions.map((p) => p.ticker).filter(Boolean) as string[];
    if (tickers.length === 0) return;
    setLoadingPrices(true);
    fetch(`/api/prices?tickers=${tickers.join(",")}`)
      .then((r) => r.json())
      .then(({ prices }) => {
        const map = new Map<string, number | null>();
        for (const pos of positions) {
          if (pos.ticker) map.set(pos.ticker, prices[pos.ticker] ?? null);
        }
        setLivePriceMap(map);
      })
      .finally(() => setLoadingPrices(false));
  }, [positions]);

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
      body: JSON.stringify({ company_ids: companyIds, capital_amount: selectedPortfolio.capital_amount }),
    })
      .then((r) => r.json())
      .then(({ allocations }) => {
        const map = new Map<string, number>();
        for (const a of allocations ?? []) map.set(a.company_id, a.allocation_pct as number);
        setFormulaAllocations(map);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModel, selectedPortfolio?.capital_amount, positions.length, selectedId]);

  function handlePortfoliosChange(list: Portfolio[]) {
    setPortfolios(list);
    setHasPortfolios(list.length > 0);
  }

  const totalCostBasis = positions.reduce((sum, p) => sum + p.total_cost_basis, 0);

  // Sort by confidence desc, composite desc
  const sortedPositions = [...positions].sort((a, b) => {
    const confDiff = (b.confidence_score ?? -1) - (a.confidence_score ?? -1);
    if (confDiff !== 0) return confDiff;
    return (b.composite_score ?? -1) - (a.composite_score ?? -1);
  });

  return (
    <div className="mb-10">
      {txModal && (
        <TransactionModal
          state={txModal}
          onClose={() => setTxModal(null)}
          onDone={() => { setTxModal(null); setRefreshTrigger((t) => t + 1); }}
        />
      )}

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
        <div className="space-y-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded border border-line bg-panel" />
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
        <div className="flex flex-col gap-1.5">
          {sortedPositions.map((pos) => {
            const isExpanded = expandedCompanyId === pos.company_id;
            const actualPct = totalCostBasis > 0 ? (pos.total_cost_basis / totalCostBasis) * 100 : 0;
            const formulaPct = formulaAllocations.get(pos.company_id);
            const isOverridden = pos.transactions.some((tx) => tx.allocation_override_pct !== null);
            const livePrice = pos.ticker ? livePriceMap.get(pos.ticker) : null;
            const hasLivePrice = livePrice != null;
            const unrealizedDollar = hasLivePrice
              ? (livePrice - pos.weighted_avg_cost) * pos.shares_held
              : null;
            const unrealizedPct =
              hasLivePrice && pos.weighted_avg_cost > 0
                ? ((livePrice - pos.weighted_avg_cost) / pos.weighted_avg_cost) * 100
                : null;

            return (
              <div key={pos.company_id} className="rounded border border-line bg-panel px-3 py-2">
                {/* Main row */}
                <div className="flex items-center gap-3">
                  {/* Company name — click to expand */}
                  <div
                    className="w-40 min-w-0 flex-shrink-0 cursor-pointer"
                    onClick={() => setExpandedCompanyId(isExpanded ? null : pos.company_id)}
                  >
                    <div className="flex min-w-0 items-baseline gap-1.5">
                      <span className="truncate text-sm font-medium text-[#e7e8ea]">
                        {pos.name ?? pos.company_id}
                      </span>
                      <span className="flex-shrink-0 font-mono text-xs text-muted">{pos.ticker}</span>
                    </div>
                    {isOverridden && (
                      <span className="mt-0.5 inline-block rounded bg-signal/15 px-1 py-px text-[10px] font-medium text-signal">
                        overridden
                      </span>
                    )}
                  </div>

                  {/* Stats — click to expand */}
                  <div
                    className="flex flex-1 cursor-pointer items-center justify-end gap-4"
                    onClick={() => setExpandedCompanyId(isExpanded ? null : pos.company_id)}
                  >
                    <StatCell label="shares" value={pos.shares_held} />
                    <StatCell label="avg cost" value={`$${pos.weighted_avg_cost.toFixed(2)}`} />
                    <StatCell label="basis" value={`$${pos.total_cost_basis.toFixed(0)}`} />
                    <StatCell
                      label="price"
                      value={hasLivePrice ? `$${livePrice.toFixed(2)}` : "—"}
                      loading={loadingPrices && livePrice === undefined}
                    />
                    {unrealizedDollar !== null && unrealizedPct !== null ? (
                      <div className="text-right">
                        <div className="text-[10px] text-muted">P&L</div>
                        <div className={`font-mono text-sm font-medium ${unrealizedDollar >= 0 ? "text-rise" : "text-fall"}`}>
                          {fmtPnl(unrealizedDollar)}
                          <span className="ml-1 text-[10px] font-normal opacity-75">
                            {unrealizedPct >= 0 ? "+" : ""}{unrealizedPct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ) : loadingPrices ? (
                      <StatCell label="P&L" value="—" loading />
                    ) : null}
                    {isModel && (
                      <div className="text-right">
                        <div className="text-[10px] text-muted">
                          {formulaPct !== undefined ? "actual / model" : "actual"}
                        </div>
                        <div className="font-mono text-sm font-medium text-[#e7e8ea]">
                          {actualPct.toFixed(1)}%
                          {formulaPct !== undefined && (
                            <span className="ml-1 text-xs font-normal text-muted">
                              / {(formulaPct * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      onClick={() =>
                        selectedId &&
                        setTxModal({ portfolioId: selectedId, position: pos, type: "buy" })
                      }
                      className="rounded border border-line px-2 py-1 text-xs text-muted hover:border-rise hover:text-rise"
                    >
                      Buy more
                    </button>
                    <button
                      onClick={() =>
                        selectedId &&
                        setTxModal({ portfolioId: selectedId, position: pos, type: "sell" })
                      }
                      className="rounded border border-line px-2 py-1 text-xs text-muted hover:border-fall hover:text-fall"
                    >
                      Trim
                    </button>
                    <button
                      onClick={() =>
                        selectedId &&
                        setTxModal({ portfolioId: selectedId, position: pos, type: "sell", sellAll: true })
                      }
                      className="rounded border border-fall/40 px-2 py-1 text-xs text-fall/70 hover:border-fall hover:text-fall"
                    >
                      Sell all
                    </button>
                  </div>
                </div>

                {/* Expanded: transaction history */}
                {isExpanded && (
                  <div className="mt-2.5 border-t border-line pt-2.5" onClick={(e) => e.stopPropagation()}>
                    <p className="mb-1.5 text-xs font-medium text-[#e7e8ea]">Transaction history</p>
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
