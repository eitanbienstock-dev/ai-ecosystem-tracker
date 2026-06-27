"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Portfolio = {
  id: string;
  name: string;
  description: string | null;
};

type Props = {
  companyId: string;
  companyName: string;
  initialPortfolios: Portfolio[];
};

type Step = "portfolio" | "entry";

export default function PromoteClientForm({ companyId, companyName, initialPortfolios }: Props) {
  const router = useRouter();

  const [portfolios, setPortfolios] = useState<Portfolio[]>(initialPortfolios);
  const [step, setStep] = useState<Step>("portfolio");
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creatingPortfolio, setCreatingPortfolio] = useState(false);

  const [entryPrice, setEntryPrice] = useState("");
  const [shares, setShares] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedPortfolio = portfolios.find((p) => p.id === selectedPortfolioId);

  async function createPortfolio() {
    if (!newName.trim() || creatingPortfolio) return;
    setCreatingPortfolio(true);
    try {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || null,
        }),
      });
      const { portfolio } = await res.json();
      setPortfolios([...portfolios, portfolio]);
      setSelectedPortfolioId(portfolio.id);
      setShowNewForm(false);
      setNewName("");
      setNewDescription("");
    } finally {
      setCreatingPortfolio(false);
    }
  }

  async function submitEntry() {
    if (!selectedPortfolioId || !entryPrice || !shares || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`/api/portfolios/${selectedPortfolioId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          transaction_type: "buy",
          shares: Number(shares),
          price_per_share: Number(entryPrice),
          note: note.trim() || null,
          transacted_at: today,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSubmitError(body.error ?? "Failed to record transaction");
        return;
      }
      router.push(`/companies/${companyId}`);
      router.refresh();
    } catch {
      setSubmitError("Network error, please try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "portfolio") {
    return (
      <div className="rounded border border-line bg-panel p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-[#e7e8ea]">
          Add to which portfolio?
        </h2>

        {portfolios.length === 0 && !showNewForm && (
          <p className="mb-4 text-sm text-muted">No portfolios yet. Create one to continue.</p>
        )}

        <div className="mb-4 grid gap-2">
          {portfolios.map((p) => (
            <button
              key={p.id}
              onClick={() =>
                setSelectedPortfolioId(selectedPortfolioId === p.id ? null : p.id)
              }
              className={`rounded border px-4 py-3 text-left text-sm transition-colors ${
                selectedPortfolioId === p.id
                  ? "border-signal bg-signal/10 text-[#e7e8ea]"
                  : "border-line text-[#e7e8ea] hover:border-signal"
              }`}
            >
              <span className="font-medium">{p.name}</span>
              {p.description && (
                <span className="ml-2 text-xs text-muted">{p.description}</span>
              )}
            </button>
          ))}

          {!showNewForm ? (
            <button
              onClick={() => setShowNewForm(true)}
              className="rounded border border-dashed border-line px-4 py-3 text-left text-sm text-muted hover:border-signal hover:text-signal"
            >
              + Create new portfolio
            </button>
          ) : (
            <div className="rounded border border-line p-4">
              <label className="mb-2 block">
                <span className="mb-1 block text-xs text-muted">Portfolio name</span>
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createPortfolio()}
                  className="input w-full"
                  placeholder="e.g. AI Infrastructure"
                />
              </label>
              <label className="mb-3 block">
                <span className="mb-1 block text-xs text-muted">Description (optional)</span>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createPortfolio()}
                  className="input w-full"
                />
              </label>
              <div className="flex gap-2">
                <button
                  onClick={createPortfolio}
                  disabled={!newName.trim() || creatingPortfolio}
                  className="rounded border border-signal bg-signal/20 px-3 py-1 text-xs text-signal hover:bg-signal/30 disabled:opacity-40"
                >
                  {creatingPortfolio ? "Creating…" : "Create"}
                </button>
                <button
                  onClick={() => {
                    setShowNewForm(false);
                    setNewName("");
                    setNewDescription("");
                  }}
                  className="rounded border border-line px-3 py-1 text-xs text-muted hover:border-signal"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setStep("entry")}
          disabled={!selectedPortfolioId}
          className="rounded bg-signal px-4 py-2 text-sm font-semibold text-ink hover:bg-signal/90 disabled:opacity-40"
        >
          Next: enter position details →
        </button>
      </div>
    );
  }

  return (
    <div className="rounded border border-line bg-panel p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-[#e7e8ea]">
          Adding to: {selectedPortfolio?.name}
        </h2>
        <button
          onClick={() => setStep("portfolio")}
          className="text-xs text-muted hover:text-signal"
        >
          ← Change portfolio
        </button>
      </div>

      <label className="mb-4 block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
          Entry price ($)
        </span>
        <input
          autoFocus
          type="number"
          step="0.01"
          value={entryPrice}
          onChange={(e) => setEntryPrice(e.target.value)}
          className="input"
          required
        />
      </label>
      <label className="mb-4 block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
          Shares
        </span>
        <input
          type="number"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          className="input"
          required
        />
      </label>
      <label className="mb-4 block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
          Note (optional, becomes the first decision log entry)
        </span>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="input"
          placeholder="Why now, why this size"
        />
      </label>

      {submitError && <p className="mb-3 text-sm text-fall">{submitError}</p>}

      <button
        onClick={submitEntry}
        disabled={!entryPrice || !shares || submitting}
        className="rounded bg-signal px-4 py-2 text-sm font-semibold text-ink hover:bg-signal/90 disabled:opacity-40"
      >
        {submitting ? "Recording…" : "Confirm initiate position"}
      </button>
    </div>
  );
}
