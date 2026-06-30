"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { Portfolio } from "./NewPortfolioModal";

type CompanyOption = {
  company_id: string;
  name: string;
  ticker: string | null;
  ai_category: string | null;
  research_status: string;
  composite_score: number | null;
  confidence_score: number | null;
};

type PartnershipRow = { company_id: string; partner_name: string };

type AddResult = { positions: number; deployed: number };

type Props = {
  portfolio: Portfolio;
  onClose: () => void;
  onDone: () => void;
};

function fmt$(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export default function ManualPositionsModal({ portfolio, onClose, onDone }: Props) {
  const [availableCompanies, setAvailableCompanies] = useState<CompanyOption[]>([]);
  const [partnerships, setPartnerships] = useState<PartnershipRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  // dollarAmounts: company_id → raw input string the user typed
  const [dollarAmounts, setDollarAmounts] = useState<Map<string, string>>(new Map());
  // priceMap: company_id → live share price (null = fetch failed for this ticker)
  const [priceMap, setPriceMap] = useState<Map<string, number | null>>(new Map());
  const [syncingPrices, setSyncingPrices] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [addResult, setAddResult] = useState<AddResult | null>(null);
  const hasAutoSynced = useRef(false);

  // Fetch the company universe (watched / holding) once on open
  useEffect(() => {
    setLoadingCompanies(true);
    fetch("/api/portfolios/model-preview")
      .then((r) => r.json())
      .then(({ companies, partnerships }) => {
        setAvailableCompanies(companies ?? []);
        setPartnerships(partnerships ?? []);
      })
      .finally(() => setLoadingCompanies(false));
  }, []);

  // Auto-sync prices once a selection exists
  useEffect(() => {
    if (hasAutoSynced.current) return;
    if (selectedIds.size > 0) {
      hasAutoSynced.current = true;
      void syncPrices();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

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

  function setAmount(id: string, value: string) {
    setDollarAmounts((prev) => {
      const next = new Map(prev);
      next.set(id, value);
      return next;
    });
  }

  // Selected rows, sorted the same way as the checklist for a stable order
  const selectedRows = filteredCompanies.filter((c) => selectedIds.has(c.company_id));

  // Current holdings (across all portfolios) and their disclosed partners, used
  // to flag category and partner overlap before capital is committed.
  const holdings = availableCompanies.filter((c) => c.research_status === "holding");
  const partnersByCompany = new Map<string, string[]>();
  for (const p of partnerships) {
    const list = partnersByCompany.get(p.company_id) ?? [];
    list.push(p.partner_name);
    partnersByCompany.set(p.company_id, list);
  }

  type Flags = {
    lowConfidence: boolean;
    categoryOverlap: string[];
    partnerOverlap: { partner: string; holdings: string[] }[];
  };

  function flagsFor(c: CompanyOption): Flags {
    const lowConfidence = c.confidence_score !== null && c.confidence_score < 3;

    const categoryOverlap = c.ai_category
      ? holdings.filter((h) => h.company_id !== c.company_id && h.ai_category === c.ai_category).map((h) => h.name)
      : [];

    const candidatePartners = new Set(partnersByCompany.get(c.company_id) ?? []);
    const byPartner = new Map<string, Set<string>>();
    if (candidatePartners.size > 0) {
      for (const h of holdings) {
        if (h.company_id === c.company_id) continue;
        for (const partner of partnersByCompany.get(h.company_id) ?? []) {
          if (!candidatePartners.has(partner)) continue;
          (byPartner.get(partner) ?? byPartner.set(partner, new Set()).get(partner)!).add(h.name);
        }
      }
    }
    const partnerOverlap = Array.from(byPartner.entries()).map(([partner, names]) => ({
      partner,
      holdings: Array.from(names),
    }));

    return { lowConfidence, categoryOverlap, partnerOverlap };
  }

  function sharesFor(id: string): number | null {
    const price = priceMap.get(id);
    const amount = Number(dollarAmounts.get(id) ?? "");
    if (!price || price <= 0 || !amount || amount <= 0) return null;
    return Math.floor(amount / price);
  }

  // Positions that will actually be created: amount entered, price available, shares >= 1
  const validRows = selectedRows.filter((c) => {
    const shares = sharesFor(c.company_id);
    return shares !== null && shares > 0;
  });
  const positionsCount = validRows.length;

  async function addPositions() {
    if (positionsCount === 0 || submitting) return;
    setSubmitting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      let deployed = 0;
      for (const c of validRows) {
        const price = priceMap.get(c.company_id)!;
        const shares = sharesFor(c.company_id)!;
        await fetch(`/api/portfolios/${portfolio.id}/transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_id: c.company_id,
            transaction_type: "buy",
            shares,
            price_per_share: price,
            allocation_override_pct: null,
            note: "Manual position entry",
            transacted_at: today,
          }),
        });
        deployed += shares * price;
      }
      setAddResult({ positions: positionsCount, deployed });
      setTimeout(onDone, 1500);
    } finally {
      setSubmitting(false);
    }
  }

  const modalWidth = addResult ? "max-w-sm" : "max-w-5xl";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-16">
      <div className={`w-full ${modalWidth} rounded border border-line bg-panel p-6`}>
        {/* Success screen */}
        {addResult && (
          <div className="text-center">
            <div className="mb-2 text-2xl">✓</div>
            <h2 className="mb-1 font-display text-lg font-semibold text-[#e7e8ea]">Positions added</h2>
            <p className="text-sm text-muted">
              {addResult.positions} positions · {fmt$(addResult.deployed)} deployed
            </p>
          </div>
        )}

        {!addResult && (
          <>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-[#e7e8ea]">
                Add positions — {portfolio.name}
              </h2>
              <button onClick={onClose} className="text-xs text-muted hover:text-[#e7e8ea]">✕</button>
            </div>

            {/* Select all / Clear */}
            <div className="mb-4 flex flex-wrap gap-2">
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
                    <p className="text-xs text-muted">Select companies, then enter a dollar amount for each</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded border border-line">
                    {/* Sync header */}
                    <div className="flex items-center justify-between border-b border-line bg-panel px-3 py-2">
                      <span className="text-[10px] uppercase tracking-wide text-muted">
                        Position entry
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
                          <th className="px-3 py-2 text-right">$ Amount</th>
                          <th className="px-3 py-2 text-right">Shares</th>
                          <th className="px-3 py-2 text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRows.map((c) => {
                          const price = priceMap.get(c.company_id);
                          const priceNeeded = price === null || price === undefined || price <= 0;
                          const shares = sharesFor(c.company_id);
                          const flags = flagsFor(c);
                          const hasFlags =
                            flags.lowConfidence || flags.categoryOverlap.length > 0 || flags.partnerOverlap.length > 0;
                          return (
                            <Fragment key={c.company_id}>
                              <tr
                                className={`${hasFlags ? "" : "border-b"} border-line/50 last:border-0 ${syncingPrices ? "opacity-50" : ""}`}
                              >
                                <td className="px-3 py-2">
                                  <span className="font-medium text-[#e7e8ea]">{c.name}</span>
                                  <br />
                                  <span className="font-mono text-[10px] text-muted">
                                    {c.ticker ?? "—"}
                                    {c.composite_score != null && (
                                      <>
                                        {" · "}
                                        <span className="text-[#cfd1d5]">{c.composite_score}</span>
                                        {"  "}
                                        <span>{c.confidence_score ?? "—"}/5</span>
                                      </>
                                    )}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <span className="text-muted">$</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={dollarAmounts.get(c.company_id) ?? ""}
                                      onChange={(e) => setAmount(c.company_id, e.target.value)}
                                      className="input w-24 text-right text-xs"
                                      placeholder="0"
                                    />
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-right font-mono">
                                  {shares === null ? (
                                    <span className="text-muted">—</span>
                                  ) : (
                                    <span className="text-[#e7e8ea]">{shares}</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right font-mono">
                                  {priceNeeded ? (
                                    <span className="text-[10px] text-signal">price unavailable</span>
                                  ) : (
                                    <span className="text-muted">${Number(price).toFixed(2)}</span>
                                  )}
                                </td>
                              </tr>
                              {hasFlags && (
                                <tr className="border-b border-line/50 last:border-0">
                                  <td colSpan={4} className="px-3 pb-2">
                                    <div className="space-y-1 rounded bg-signal/10 p-2 text-[10px] leading-relaxed text-signal">
                                      {flags.lowConfidence && (
                                        <p>
                                          Confidence is {c.confidence_score}/5, below the usual 3/5 floor for
                                          committing capital. Not blocked, just worth confirming the underlying
                                          data is solid before sizing this position.
                                        </p>
                                      )}
                                      {flags.categoryOverlap.length > 0 && (
                                        <p>
                                          Same AI category as {flags.categoryOverlap.join(", ")}, already held.
                                          Not blocked, just a concentration flag worth weighing.
                                        </p>
                                      )}
                                      {flags.partnerOverlap.map((row) => (
                                        <p key={row.partner}>
                                          Shares disclosed partner {row.partner} with {row.holdings.join(", ")},
                                          already held.
                                        </p>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>

                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-xs text-muted">
                {positionsCount} position{positionsCount === 1 ? "" : "s"} will be added
              </p>
              <button
                onClick={addPositions}
                disabled={positionsCount === 0 || submitting}
                className="rounded bg-signal px-4 py-2 text-sm font-semibold text-ink hover:bg-signal/90 disabled:opacity-40"
              >
                {submitting ? "Adding…" : "Add positions"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
