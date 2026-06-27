"use client";

import { useState, useEffect } from "react";

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
  current_price: number | null;
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
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [createResult, setCreateResult] = useState<CreateResult | null>(null);

  // Fetch company list when entering model config step
  useEffect(() => {
    if (step !== "model_config") return;
    setLoadingCompanies(true);
    fetch("/api/portfolios/model-preview")
      .then((r) => r.json())
      .then(({ companies }) => setAvailableCompanies(companies ?? []))
      .finally(() => setLoadingCompanies(false));
  }, [step]);

  // Recompute preview whenever selection or capital changes
  useEffect(() => {
    const capital = Number(capitalAmount);
    if (selectedIds.size === 0 || capital <= 0) {
      setPreviewRows([]);
      return;
    }
    setLoadingPreview(true);
    fetch("/api/portfolios/model-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_ids: Array.from(selectedIds), capital_amount: capital }),
    })
      .then((r) => r.json())
      .then(({ allocations }) => setPreviewRows(allocations ?? []))
      .finally(() => setLoadingPreview(false));
  }, [selectedIds, capitalAmount]);

  const filteredCompanies = availableCompanies.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.ticker ?? "").toLowerCase().includes(q);
  });

  function toggleCompany(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const c of filteredCompanies) next.add(c.company_id);
      return next;
    });
  }

  function selectHighConfidence() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const c of availableCompanies) {
        if ((c.confidence_score ?? 0) >= 4) next.add(c.company_id);
      }
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
      // Create the portfolio
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

      // Insert initial allocation transactions
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
      // Notify parent after a brief moment so user sees success screen
      setTimeout(() => onCreated(portfolio), 1800);
    } finally {
      setSubmitting(false);
    }
  }

  const canAdvanceToModel = portfolioType === "model" && name.trim().length > 0;
  const canCreateManual = portfolioType === "manual" && name.trim().length > 0;
  const canCreateModel =
    name.trim().length > 0 &&
    Number(capitalAmount) > 0 &&
    previewRows.filter((r) => r.shares !== null && r.shares > 0).length > 0;

  const modalWidth =
    createResult
      ? "max-w-sm"
      : step === "model_config"
      ? "max-w-5xl"
      : "max-w-lg";

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
                  portfolioType === "manual"
                    ? "border-signal bg-signal/10"
                    : "border-line hover:border-signal"
                }`}
              >
                <div className="mb-1 font-medium text-[#e7e8ea]">Manual</div>
                <div className="text-xs text-muted">
                  Build position by position, your own sizing and timing
                </div>
              </button>
              <button
                onClick={() => setPortfolioType("model")}
                className={`rounded border p-4 text-left transition-colors ${
                  portfolioType === "model"
                    ? "border-signal bg-signal/10"
                    : "border-line hover:border-signal"
                }`}
              >
                <div className="mb-1 font-medium text-[#e7e8ea]">Model</div>
                <div className="text-xs text-muted">
                  Set a capital amount, select companies, system allocates by score
                </div>
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
                  onClick={selectHighConfidence}
                  className="rounded border border-line px-3 py-1 text-xs text-muted hover:border-signal hover:text-signal"
                >
                  Select 4/5+ confidence
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
                            {c.ticker}
                            {c.composite_score !== null && ` · ${c.composite_score}`}
                            {c.confidence_score !== null && `/${c.confidence_score}`}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview table */}
              <div className="min-w-0 flex-1">
                {selectedIds.size === 0 ? (
                  <div className="flex h-full items-center justify-center rounded border border-dashed border-line py-8">
                    <p className="text-xs text-muted">Select companies to see allocation preview</p>
                  </div>
                ) : loadingPreview ? (
                  <div className="space-y-1">
                    {Array.from(selectedIds).map((_, i) => (
                      <div key={i} className="h-8 animate-pulse rounded bg-panelhi" />
                    ))}
                  </div>
                ) : previewRows.length === 0 ? (
                  <div className="flex items-center justify-center rounded border border-dashed border-line py-8">
                    <p className="text-xs text-muted">
                      {Number(capitalAmount) <= 0
                        ? "Enter a capital amount above"
                        : "No allocation data available"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded border border-line">
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
                          <tr key={row.company_id} className="border-b border-line/50 last:border-0">
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
                              {row.price_needed ? (
                                <span className="text-signal">price needed</span>
                              ) : row.shares === 0 ? (
                                <span className="text-muted">—</span>
                              ) : (
                                <span className="text-[#e7e8ea]">{row.shares}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-muted">
                              {row.current_price != null
                                ? `$${Number(row.current_price).toLocaleString()}`
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-xs text-muted">
                {previewRows.filter((r) => r.shares !== null && r.shares > 0).length} positions will be
                created
                {previewRows.some((r) => r.price_needed) && (
                  <span className="ml-2 text-signal">
                    · {previewRows.filter((r) => r.price_needed).length} need live price
                  </span>
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
