"use client";

import { useState, useEffect } from "react";

type Portfolio = {
  id: string;
  name: string;
  description: string | null;
};

type Props = {
  onSelect: (id: string | null) => void;
  onPortfoliosChange: (portfolios: Portfolio[]) => void;
};

export default function PortfolioSelector({ onSelect, onPortfoliosChange }: Props) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/portfolios")
      .then((r) => r.json())
      .then(({ portfolios: data }) => {
        const list: Portfolio[] = data ?? [];
        setPortfolios(list);
        onPortfoliosChange(list);
        if (list.length > 0) {
          setSelectedId(list[0].id);
          onSelect(list[0].id);
        } else {
          onSelect(null);
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function select(id: string) {
    setSelectedId(id);
    onSelect(id);
  }

  async function createPortfolio() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });
      const { portfolio } = await res.json();
      const updated = [...portfolios, portfolio];
      setPortfolios(updated);
      onPortfoliosChange(updated);
      setSelectedId(portfolio.id);
      onSelect(portfolio.id);
      setModalOpen(false);
      setName("");
      setDescription("");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="mb-4 h-8 w-48 animate-pulse rounded-full bg-panelhi" />;
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {portfolios.map((p) => (
          <button
            key={p.id}
            onClick={() => select(p.id)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              selectedId === p.id
                ? "bg-signal font-medium text-black"
                : "border border-line text-muted hover:border-signal hover:text-[#e7e8ea]"
            }`}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-full border border-dashed border-line px-3 py-1 text-sm text-muted hover:border-signal hover:text-signal"
        >
          + New portfolio
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded border border-line bg-panel p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-[#e7e8ea]">New portfolio</h2>
            <label className="mb-3 block">
              <span className="mb-1 block text-xs text-muted">Name</span>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createPortfolio()}
                className="input w-full"
                placeholder="e.g. AI Infrastructure"
              />
            </label>
            <label className="mb-4 block">
              <span className="mb-1 block text-xs text-muted">Description (optional)</span>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createPortfolio()}
                className="input w-full"
                placeholder="Short description"
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={createPortfolio}
                disabled={!name.trim() || submitting}
                className="rounded border border-signal bg-signal/20 px-4 py-1.5 text-sm text-signal hover:bg-signal/30 disabled:opacity-40"
              >
                {submitting ? "Creating…" : "Create"}
              </button>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setName("");
                  setDescription("");
                }}
                className="rounded border border-line px-4 py-1.5 text-sm text-muted hover:border-signal"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
