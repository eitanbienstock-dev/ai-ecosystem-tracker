"use client";

import { useState, useEffect, useRef } from "react";
import { computeModelAllocations, AllocationInput } from "@/lib/portfolioAllocation";

export type Portfolio = {
  id: string;
  name: string;
  description: string | null;
  portfolio_type: "manual" | "model";
  capital_amount: number | null;
};

type CompanyOption = {
  company_id: string;
  name: string;
  ticker: string | null;
  composite_score: number | null;
  confidence_score: number | null;
};

type PreviewRow = {
  company_id: string;
  name: string;
  ticker: string | null;
  allocation_pct: number;
  dollar_amount: number;
  shares: number | null;
  current_price: number | null;
  price_needed: boolean;
};

type CreateResult = { positions: number; deployed: number };

type Props = {
  onCreated: (portfolio: Portfolio) => void;
  onClose: () => void;
};

type Step = "type" | "model_config";

function fmt$(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export default function NewPortfolioModal({ onCreated, onClose }: Props) {
  const [step, setStep] = useState<Step>("type");
  const [portfolioType, setPortfolioType] = useState<"manual" | "model">("manual");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // model_config step
  const [capitalAmount, setCapitalAmount] = useState("");
  const [availableCompanies, setAvailableCompanies] = useState<CompanyOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  // priceMap: company_id → live share price (null = fetch failed for this ticker)
  const [priceMap, setPriceMap] = useState<Map<string, number | null>>(new Map());
  const [syncingPrices, setSyncingPrices] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [createResult, setCreateResult] = useState<CreateResult | null>(null);
  const hasAutoSynced = useRef(false);

  // Fetch company list when entering model config step
  useEffect(() => {
    if (step !== "model_config") return;
    setLoadingCompanies(true);
    fetch("/api/portfolios/model-preview")
      .then((r) => r.json())
      .then(({ companies }) => setAvailableCompanies(companies ?? []))
      .finally(() => setLoadingCompanies(false));
  }, [step]);

  // Auto-sync once if entering model_config with pre-existing selection
  useEffect(() => {
    if (step !== "model_config" || hasAutoSynced.current) return;
    hasAutoSynced.current = true;
    if (selectedIds.size > 0 && Number(capitalAmount) > 0) {
      void syncPrices();
    }
  // syncPrices is stable within a render; deps intentionally limited to step
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Recompute preview rows client-side whenever selection, capital, or prices change.
  // Allocation % and $ are price-independent; shares fill in once priceMap is populated.
  useEffect(() => {
    const capital = Number(capitalAmount);
    if (selectedIds.size === 0 || capital <= 0 || availableCompanies.length === 0) {
      setPreviewRows([]);
      return;
    }
    const selected = availableCompanies.filter((c) => selectedIds.has(c.company_id));
    const inputs: AllocationInput[] = selected.map((c) => ({
      company_id: c.company_id,
      name: c.name,
      ticker: c.ticker,
      composite_score: c.composite_score ?? 0,
      confidence_score: c.confidence_score ?? 0,
      current_price: priceMap.get(c.company_id) ?? null,
    }));
    setPreviewRows(computeModelAllocations(inputs, capital));
  }, [selectedIds, capitalAmount, availableCompanies, priceMap]);

  async function syncPrices() {
    if (syncingPrices) return;
    const tickers = availableCompanies
      .filter((c) => selectedIds.has(c.company_id) && c.ticker)
      .map((c) => c.ticker as string);
    if (tickers.length === 0) return;

    setSyncingPrices(true);
    try {
      const params = new URLSearchParams({ tickers: tickers.join(",") });
      const res = await fetch(`/api/prices?${params}`);
      const { prices } = await res.json();

      // Build updated priceMap keyed by company_id
      const next = new Map<string, number | null>(priceMap);
      for (const c of availableCompanies) {
        if (selectedIds.has(c.company_id) && c.ticker) {
          next.set(c.company_id, prices[c.ticker] ?? null);
        }
      }
      setPriceMap(next);
      setLastSyncTime(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } finally {
      setSyncingPrices(false);
    }
  }

  const filteredCompanies = availableCompanies
    .filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || (c.ticker ?? "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const confDiff = (b.confidence_score ?? -1) - (a.confidence_score ?? -1);
      if (confDiff !== 0) return confDiff;
      return (b.composite_score ?? -1) - (a.composite_score ?? -1);
    });

  function toggleCompany(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectByConfidence(min: number) {
    setSelectedIds(
      new Set(
        availableCompanies
          .filter((c) => (c.confidence_score ?? 0) >= min)
          .map((c) => c.company_id)
      )
    );
  }

  function selectAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const c of filteredCompanies) next.add(c.company_id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function createManual() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });
      const { portfolio } = await res.json();
      onCreated(portfolio);
    } finally {
      setSubmitting(false);
    }
  }

  async function createModel() {
    if (!name.trim() || !capitalAmount || submitting) return;
    const rowsToInsert = previewRows.filter((r) => r.shares !== null && r.shares > 0);
    setSubmitting(true);
    try {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          portfolio_type: "model",
          capital_amount: Number(capitalAmount),
        }),
      });
      const { portfolio } = await res.json();
      const today = new Date().toISOString().slice(0, 10);

      let deployed = 0;
      for (const row of rowsToInsert) {
        await fetch(`/api/portfolios/${portfolio.id}/transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_id: row.company_id,
            transaction_type: "buy",
            shares: row.shares,
            price_per_share: row.current_price,
            allocation_override_pct: null,
            note: "Model portfolio initial allocation — confidence-adjusted composite weighting",
            transacted_at: today,
          }),
        });
        deployed += row.shares! * row.current_price!;
      }

      setCreateResult({ positions: rowsToInsert.length, deployed });
      setTimeout(() => onCreated(portfolio), 1800);
    } finally {
      setSubmitting(false);
    }
  }

  const canAdvanceToModel = portfolioType === "model" && name.trim().length > 0;
  const canCreateManual = portfolioType === "manual" && name.trim().length > 0;
  const positionsCount = previewRows.filter((r) => r.shares !== null && r.shares > 0).length;
  const priceUnavailableCount = previewRows.filter((r) => r.price_needed).length;
  const canCreateModel =
    name.trim().length > 0 && Number(capitalAmount) > 0 && positionsCount > 0;
  const showPreviewTable =
    selectedIds.size > 0 && Number(capitalAmount) > 0 && previewRows.length > 0;

  const modalWidth = createResult ? "max-w-sm" : step === "model_config" ? "max-w-5xl" : "max-w-lg";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-16">
      <div className={`w-full ${modalWidth} rounded border border-line bg-panel p-6`}>
        {/* Success screen */}
        {createResult && (
          <div className="text-center">
            <div className="mb-2 text-2xl">✓</div>
            <h2 className="mb-1 font-display text-lg font-semibold text-[#e7e8ea]">Portfolio created</h2>
            <p className="text-sm text-muted">
              {createResult.positions} positions · {fmt$(createResult.deployed)} deployed
            </p>
          </div>
        )}

        {/* Step 1: type + name/description */}
        {!createResult && step === "type" && (
          <>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-[#e7e8ea]">New portfolio</h2>
              <button onClick={onClose} className="text-xs text-muted hover:text-[#e7e8ea]">✕</button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setPortfolioType("manual")}
                className={`rounded border p-4 text-left transition-colors ${
                  portfolioType === "manual" ? "border-signal bg-signal/10" : "border-line hover:border-signal"
                }`}
              >
                <div className="mb-1 font-medium text-[#e7e8ea]">Manual</div>
                <div className="text-xs text-muted">Build position by position, your own sizing and timing</div>
              </button>
              <button
                onClick={() => setPortfolioType("model")}
                className={`rounded border p-4 text-left transition-colors ${
                  portfolioType === "model" ? "border-signal bg-signal/10" : "border-line hover:border-signal"
                }`}
              >
                <div className="mb-1 font-medium text-[#e7e8ea]">Model</div>
                <div className="text-xs text-muted">Set a capital amount, select companies, system allocates by score</div>
              </button>
            </div>

            <label className="mb-3 block">
              <span className="mb-1 block text-xs text-muted">Name</span>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canCreateManual && createManual()}
                className="input w-full"
                placeholder="e.g. AI Infrastructure"
              />
            </label>
            <label className="mb-5 block">
              <span className="mb-1 block text-xs text-muted">Description (optional)</span>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input w-full"
                placeholder="Short description"
              />
            </label>

            <div className="flex gap-2">
              {portfolioType === "manual" ? (
                <button
                  onClick={createManual}
                  disabled={!canCreateManual || submitting}
                  className="rounded border border-signal bg-signal/20 px-4 py-1.5 text-sm text-signal hover:bg-signal/30 disabled:opacity-40"
                >
                  {submitting ? "Creating…" : "Create portfolio"}
                </button>
              ) : (
                <button
                  onClick={() => setStep("model_config")}
                  disabled={!canAdvanceToModel}
                  className="rounded border border-signal bg-signal/20 px-4 py-1.5 text-sm text-signal hover:bg-signal/30 disabled:opacity-40"
                >
                  Next: configure model →
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded border border-line px-4 py-1.5 text-sm text-muted hover:border-signal"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {/* Step 2: model config */}
        {!createResult && step === "model_config" && (
          <>
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setStep("type")} className="text-xs text-muted hover:text-signal">
                  ← Back
                </button>
                <h2 className="font-display text-lg font-semibold text-[#e7e8ea]">
                  Configure model — {name}
                </h2>
              </div>
              <button onClick={onClose} className="text-xs text-muted hover:text-[#e7e8ea]">✕</button>
            </div>

            {/* Capital amount + quick-select buttons */}
            <div className="mb-4 flex flex-wrap items-end gap-4">
              <label className="block">
                <span className="mb-1 block text-xs text-muted">Total capital ($)</span>
                <input
                  autoFocus
                  type="number"
                  value={capitalAmount}
                  onChange={(e) => setCapitalAmount(e.target.value)}
                  className="input w-44"
                  placeholder="100000"
                />
              </label>
              <div className="flex flex-wrap gap-2 pb-0.5">
                <button
                  onClick={() => selectByConfidence(5)}
                  className="rounded border border-line px-3 py-1 text-xs text-muted hover:border-signal hover:text-signal"
                >
                  5/5 only
                </button>
                <button
                  onClick={() => selectByConfidence(4)}
                  className="rounded border border-line px-3 py-1 text-xs text-muted hover:border-signal hover:text-signal"
                >
                  4/5+
                </button>
                <button
                  onClick={() => selectByConfidence(3)}
                  className="rounded border border-line px-3 py-1 text-xs text-muted hover:border-signal hover:text-signal"
                >
                  3/5+
                </button>
                <button
                  onClick={selectAllFiltered}
                  className="rounded border border-line px-3 py-1 text-xs text-muted hover:border-signal hover:text-signal"
                >
                  Select all
                </button>
                {selectedIds.size > 0 && (
                  <button
                    onClick={clearSelection}
                    className="rounded border border-line px-3 py-1 text-xs text-muted hover:border-fall hover:text-fall"
                  >
                    Clear ({selectedIds.size})
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              {/* Company checklist */}
              <div className="w-64 shrink-0">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input mb-2 w-full text-xs"
                  placeholder="Filter companies…"
                />
                {loadingCompanies ? (
                  <div className="space-y-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-8 animate-pulse rounded bg-panelhi" />
                    ))}
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto rounded border border-line">
                    {filteredCompanies.length === 0 && (
                      <p className="p-3 text-xs text-muted">No companies found.</p>
                    )}
                    {filteredCompanies.map((c) => (
                      <label
                        key={c.company_id}
                        className="flex cursor-pointer items-center gap-2 border-b border-line/50 px-3 py-2 hover:bg-panelhi last:border-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.company_id)}
                          onChange={() => toggleCompany(c.company_id)}
                          className="accent-signal"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-[#e7e8ea]">
                            {c.name}
                          </span>
                          <span className="font-mono text-[10px] text-muted">
                            {c.ticker ?? "—"}
                            {c.composite_score !== null && (
                              <>
                                {" · "}
                                <span className="text-[#cfd1d5]">{c.composite_score}</span>
                                {"  "}
                                <span>{c.confidence_score ?? "—"}/5</span>
                              </>
                            )}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview panel */}
              <div className="min-w-0 flex-1">
                {selectedIds.size === 0 ? (
                  <div className="flex h-full items-center justify-center rounded border border-dashed border-line py-8">
                    <p className="text-xs text-muted">Select companies to see allocation preview</p>
                  </div>
                ) : Number(capitalAmount) <= 0 ? (
                  <div className="flex h-full items-center justify-center rounded border border-dashed border-line py-8">
                    <p className="text-xs text-muted">Enter a capital amount above</p>
                  </div>
                ) : showPreviewTable ? (
                  <div className="overflow-hidden rounded border border-line">
                    {/* Sync header */}
                    <div className="flex items-center justify-between border-b border-line bg-panel px-3 py-2">
                      <span className="text-[10px] uppercase tracking-wide text-muted">
                        Allocation preview
                      </span>
                      <div className="flex items-center gap-2">
                        {lastSyncTime && (
                          <span className="text-[10px] text-muted">Synced {lastSyncTime}</span>
                        )}
                        <button
                          onClick={syncPrices}
                          disabled={syncingPrices}
                          className="flex items-center gap-1 rounded border border-line px-2 py-0.5 text-[10px] text-muted hover:border-signal hover:text-signal disabled:opacity-50"
                        >
                          <span>↻</span>
                          {syncingPrices ? "Syncing…" : "Sync prices"}
                        </button>
                      </div>
                    </div>

                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-line bg-panel text-left text-[10px] uppercase tracking-wide text-muted">
                          <th className="px-3 py-2">Company</th>
                          <th className="px-3 py-2 text-right">Alloc %</th>
                          <th className="px-3 py-2 text-right">$ Amount</th>
                          <th className="px-3 py-2 text-right">Shares</th>
                          <th className="px-3 py-2 text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row) => (
                          <tr key={row.company_id} className={`border-b border-line/50 last:border-0 ${syncingPrices ? "opacity-50" : ""}`}>
                            <td className="px-3 py-2">
                              <span className="font-medium text-[#e7e8ea]">{row.name}</span>{" "}
                              <span className="font-mono text-muted">{row.ticker}</span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-[#e7e8ea]">
                              {(row.allocation_pct * 100).toFixed(1)}%
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-[#e7e8ea]">
                              {fmt$(row.dollar_amount)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {row.price_needed || row.shares === 0 ? (
                                <span className="text-muted">—</span>
                              ) : (
                                <span className="text-[#e7e8ea]">{row.shares}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {row.price_needed ? (
                                <span className="text-[10px] text-signal">price unavailable</span>
                              ) : (
                                <span className="text-muted">${Number(row.current_price).toFixed(2)}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-xs text-muted">
                {positionsCount} positions will be created
                {priceUnavailableCount > 0 && (
                  <span className="ml-2 text-signal">· {priceUnavailableCount} price unavailable</span>
                )}
              </p>
              <button
                onClick={createModel}
                disabled={!canCreateModel || submitting}
                className="rounded bg-signal px-4 py-2 text-sm font-semibold text-ink hover:bg-signal/90 disabled:opacity-40"
              >
                {submitting ? "Creating…" : "Create portfolio"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
