import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type DigestEntry = {
  id: string;
  source: string;
  report_title: string;
  report_url: string | null;
  published_date: string | null;
  scanned_at: string;
  summary: string | null;
  key_takeaways: string | null;
  relevant_tickers: string[] | null;
};

export default async function ResearchDigestPage() {
  const { data, error } = await supabase
    .from("research_digest")
    .select("*")
    .order("published_date", { ascending: false });

  if (error) {
    return (
      <div className="rounded border border-fall/40 bg-fall/10 p-4 text-sm text-fall">
        Could not load research digest: {error.message}
      </div>
    );
  }

  const entries = (data ?? []) as DigestEntry[];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-[#e7e8ea]">Research digest</h1>
        <p className="text-sm text-muted">
          Findings from periodic scans of major bank and institutional AI research. Scans run on request,
          not on a fixed schedule.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="rounded border border-dashed border-line py-10 text-center">
          <p className="text-sm text-muted">No scans logged yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {entries.map((e) => (
            <div key={e.id} className="rounded border border-line bg-panel p-5">
              <div className="mb-2 flex items-baseline justify-between">
                <div>
                  <span className="badge bg-panelhi text-[#e7e8ea]">{e.source}</span>
                  <span className="ml-2 font-medium text-[#e7e8ea]">{e.report_title}</span>
                </div>
                <span className="font-mono text-xs text-muted">
                  {e.published_date ?? "date unknown"} &middot; scanned {e.scanned_at}
                </span>
              </div>
              {e.summary && <p className="text-sm text-[#cfd1d5]">{e.summary}</p>}
              {e.key_takeaways && (
                <p className="mt-2 text-sm text-signal">Relevant to us: {e.key_takeaways}</p>
              )}
              {(e.relevant_tickers ?? []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(e.relevant_tickers ?? []).map((t) => (
                    <span key={t} className="badge border border-line bg-panelhi text-muted">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {e.report_url && (
                <a
                  href={e.report_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs text-signal hover:underline"
                >
                  Source →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
