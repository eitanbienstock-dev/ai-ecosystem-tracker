"use client";

import { useState } from "react";
import { deleteCompany } from "@/lib/actions";

export default function DeleteCompanyButton({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="mt-2 inline-block rounded border border-line px-3 py-1.5 text-sm text-muted hover:border-fall hover:text-fall"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="mt-2 rounded border border-fall/40 bg-fall/10 p-3 text-right">
      <p className="mb-2 text-xs text-fall">
        Permanently delete {companyName} and all of its research, scores, partnerships, and catalysts. This
        cannot be undone.
      </p>
      <div className="flex justify-end gap-2">
        <form action={deleteCompany.bind(null, companyId)}>
          <button
            type="submit"
            className="rounded border border-fall bg-fall/20 px-3 py-1 text-xs text-fall hover:bg-fall/30"
          >
            Yes, delete permanently
          </button>
        </form>
        <button
          onClick={() => setConfirming(false)}
          className="rounded border border-line px-3 py-1 text-xs hover:border-signal"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
