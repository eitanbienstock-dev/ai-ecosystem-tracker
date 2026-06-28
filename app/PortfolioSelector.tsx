"use client";

import { useState, useEffect } from "react";
import NewPortfolioModal, { Portfolio } from "./NewPortfolioModal";

type Props = {
  onSelect: (id: string | null) => void;
  onPortfoliosChange: (portfolios: Portfolio[]) => void;
  onManualCreated: (portfolio: Portfolio) => void;
};

function EditPortfolioModal({
  portfolio,
  onSaved,
  onClose,
}: {
  portfolio: Portfolio;
  onSaved: (portfolio: Portfolio) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(portfolio.name);
  const [description, setDescription] = useState(portfolio.description ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/portfolios/${portfolio.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });
      const { portfolio: updated } = await res.json();
      onSaved(updated);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-24">
      <div className="w-full max-w-lg rounded border border-line bg-panel p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-[#e7e8ea]">Edit portfolio</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-[#e7e8ea]">✕</button>
        </div>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-muted">Name</span>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="input w-full"
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
          <button
            onClick={save}
            disabled={!name.trim() || submitting}
            className="rounded border border-signal bg-signal/20 px-4 py-1.5 text-sm text-signal hover:bg-signal/30 disabled:opacity-40"
          >
            {submitting ? "Saving…" : "Save"}
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

function DeletePortfolioModal({
  portfolio,
  onDeleted,
  onClose,
}: {
  portfolio: Portfolio;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const [txCount, setTxCount] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/portfolios/${portfolio.id}/transactions`)
      .then((r) => r.json())
      .then(({ transactions }) => setTxCount((transactions ?? []).length))
      .catch(() => setTxCount(0));
  }, [portfolio.id]);

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await fetch(`/api/portfolios/${portfolio.id}`, { method: "DELETE" });
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-24">
      <div className="w-full max-w-md rounded border border-line bg-panel p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-[#e7e8ea]">Delete portfolio</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-[#e7e8ea]">✕</button>
        </div>
        <p className="mb-5 text-sm text-[#cfd1d5]">
          Delete <span className="font-medium text-[#e7e8ea]">{portfolio.name}</span>? This will
          permanently delete all {txCount ?? "…"} transaction{txCount === 1 ? "" : "s"} in this
          portfolio. This cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={confirmDelete}
            disabled={deleting}
            className="rounded border border-fall/50 bg-fall/15 px-4 py-1.5 text-sm text-fall hover:bg-fall/25 disabled:opacity-40"
          >
            {deleting ? "Deleting…" : "Delete portfolio"}
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

export default function PortfolioSelector({ onSelect, onPortfoliosChange, onManualCreated }: Props) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Portfolio | null>(null);
  const [deleting, setDeleting] = useState<Portfolio | null>(null);

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
    // A freshly created manual portfolio jumps straight to position entry.
    if (portfolio.portfolio_type === "manual") onManualCreated(portfolio);
  }

  function handleSaved(updated: Portfolio) {
    const list = portfolios.map((p) => (p.id === updated.id ? updated : p));
    setPortfolios(list);
    onPortfoliosChange(list);
    setEditing(null);
  }

  function handleDeleted(deletedId: string) {
    const list = portfolios.filter((p) => p.id !== deletedId);
    setPortfolios(list);
    onPortfoliosChange(list);
    if (selectedId === deletedId) {
      const nextId = list.length > 0 ? list[0].id : null;
      setSelectedId(nextId);
      onSelect(nextId);
    }
    setDeleting(null);
  }

  if (loading) {
    return <div className="mb-4 h-8 w-48 animate-pulse rounded-full bg-panelhi" />;
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {portfolios.map((p) => {
          const active = selectedId === p.id;
          return (
            <div
              key={p.id}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition-colors ${
                active
                  ? "bg-signal font-medium text-black"
                  : "border border-line text-muted hover:border-signal hover:text-[#e7e8ea]"
              }`}
            >
              <button onClick={() => select(p.id)} className="flex items-center">
                {p.name}
                {p.portfolio_type === "model" && (
                  <span className="ml-1.5 font-mono text-[10px] opacity-60">model</span>
                )}
              </button>
              {active && (
                <>
                  <button
                    onClick={() => setEditing(p)}
                    title="Edit portfolio"
                    className="text-black/60 hover:text-black"
                  >
                    {/* pencil */}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleting(p)}
                    title="Delete portfolio"
                    className="text-black/60 hover:text-black"
                  >
                    {/* trash */}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          );
        })}
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
      {editing && (
        <EditPortfolioModal
          portfolio={editing}
          onSaved={handleSaved}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <DeletePortfolioModal
          portfolio={deleting}
          onDeleted={() => handleDeleted(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
