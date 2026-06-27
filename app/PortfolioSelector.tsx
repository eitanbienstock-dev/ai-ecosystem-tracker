"use client";

import { useState, useEffect } from "react";
import NewPortfolioModal, { Portfolio } from "./NewPortfolioModal";

type Props = {
  onSelect: (id: string | null) => void;
  onPortfoliosChange: (portfolios: Portfolio[]) => void;
};

export default function PortfolioSelector({ onSelect, onPortfoliosChange }: Props) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

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

  function handleCreated(portfolio: Portfolio) {
    const updated = [...portfolios, portfolio];
    setPortfolios(updated);
    onPortfoliosChange(updated);
    setSelectedId(portfolio.id);
    onSelect(portfolio.id);
    setModalOpen(false);
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
            {p.portfolio_type === "model" && (
              <span className="ml-1.5 font-mono text-[10px] opacity-60">model</span>
            )}
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
        <NewPortfolioModal onCreated={handleCreated} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
