"use client";

import { useState } from "react";
import { archiveCompany } from "@/lib/actions";

export default function ArchiveControl({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-line px-3 py-1 text-xs text-muted hover:border-fall hover:text-fall"
      >
        Archive
      </button>
    );
  }

  return (
    <div className="absolute right-4 z-10 mt-1 w-72 rounded border border-line bg-panelhi p-3 shadow-lg">
      <p className="mb-1.5 text-xs font-medium text-[#e7e8ea]">Why is this being archived?</p>
      <textarea
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        className="input mb-2 w-full text-xs"
        placeholder="Required, shows up on the archive list"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setReason("");
          }}
          className="rounded border border-line px-3 py-1 text-xs hover:border-signal"
        >
          Cancel
        </button>
        <form action={archiveCompany.bind(null, companyId)}>
          <input type="hidden" name="archive_reason" value={reason} />
          <button
            type="submit"
            disabled={!reason.trim()}
            className="rounded border border-fall bg-fall/20 px-3 py-1 text-xs text-fall hover:bg-fall/30 disabled:opacity-40"
          >
            Confirm archive
          </button>
        </form>
      </div>
    </div>
  );
}
