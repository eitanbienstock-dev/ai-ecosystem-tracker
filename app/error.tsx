"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl rounded border border-fall/40 bg-fall/10 p-5">
      <p className="mb-2 text-sm font-medium text-fall">Something went wrong</p>
      <p className="mb-4 text-sm text-[#cfd1d5]">{error.message || "An unexpected error occurred."}</p>
      <button
        onClick={reset}
        className="rounded border border-line px-3 py-1.5 text-sm hover:border-signal"
      >
        Try again
      </button>
    </div>
  );
}
