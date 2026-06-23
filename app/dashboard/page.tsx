import { supabase, Company } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  semiconductors: "Semiconductors",
  power_infrastructure: "Power & Data Center Infrastructure",
  compute_cloud: "Compute Infrastructure / Cloud",
  data_layer: "Data Layer",
  foundation_models: "Foundation Models / AI Labs",
  mlops_tooling: "MLOps, Observability & Tooling",
  applications: "Enterprise Software & Applications",
  cybersecurity: "Cybersecurity",
  robotics_physical: "Robotics & Autonomous Systems",
  other: "Other",
};

const CATEGORY_ORDER = [
  "semiconductors",
  "power_infrastructure",
  "compute_cloud",
  "data_layer",
  "foundation_models",
  "mlops_tooling",
  "applications",
  "cybersecurity",
  "robotics_physical",
  "other",
];

function statusColor(status: string) {
  if (status === "invested") return "bg-rise/15 text-rise";
  return "bg-panelhi text-muted";
}

export default async function DashboardPage() {
  const { data: companies, error } = await supabase
    .from("companies")
    .select("*")
    .in("research_status", ["pipeline", "invested"]);

  if (error) {
    return (
      <div className="rounded border border-fall/40 bg-fall/10 p-4 text-sm text-fall">
        Could not load companies: {error.message}
      </div>
    );
  }

  const list = (companies ?? []) as Company[];

  const byCategory: Record<string, Company[]> = {};
  for (const c of list) {
    const key = c.ai_category ?? "other";
    (byCategory[key] ??= []).push(c);
  }

  const tagMap: Record<string, Company[]> = {};
  for (const c of list) {
    for (const t of c.sector_tags ?? []) {
      (tagMap[t] ??= []).push(c);
    }
  }
  const sortedTags = Object.keys(tagMap).sort((a, b) => a.localeCompare(b));

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-[#e7e8ea]">Coverage map</h1>
        <p className="text-sm text-muted">
          Where {list.length} currently tracked companies (portfolio and pipeline) actually sit across AI
          categories and sector tags. Archive excluded, this is current exposure, not history.
        </p>
      </div>

      <div className="mb-10">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">By AI category</h2>
        <div className="grid grid-cols-2 gap-4">
          {CATEGORY_ORDER.filter((cat) => byCategory[cat]?.length).map((cat) => (
            <div key={cat} className="rounded border border-line bg-panel p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-sm font-medium text-[#e7e8ea]">{CATEGORY_LABELS[cat] ?? cat}</span>
                <span className="font-mono text-xs text-muted">{byCategory[cat].length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {byCategory[cat].map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-sm text-[#e7e8ea]">{c.name}</span>{" "}
                      <span className="font-mono text-xs text-muted">{c.ticker}</span>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {(c.sector_tags ?? []).map((t) => (
                          <span key={t} className="text-[10px] text-muted">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`badge ${statusColor(c.research_status)}`}>
                        {c.research_status.replace("_", " ")}
                      </span>
                      {c.ai_materiality && (
                        <span className="text-[10px] text-muted">{c.ai_materiality.replace(/_/g, " ")}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">By sector tag</h2>
        <div className="grid grid-cols-3 gap-3">
          {sortedTags.map((tag) => (
            <div key={tag} className="rounded border border-line bg-panel p-3">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-xs font-medium text-[#e7e8ea]">{tag}</span>
                <span className="font-mono text-xs text-muted">{tagMap[tag].length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tagMap[tag].map((c) => (
                  <span key={c.id} className={`badge ${statusColor(c.research_status)}`}>
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
