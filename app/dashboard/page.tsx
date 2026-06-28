import { supabase, Company, Partnership } from "@/lib/supabase";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/taxonomy";
import { getLivePrice } from "@/lib/marketData";

export const dynamic = "force-dynamic";

function statusColor(status: string) {
  if (status === "holding") return "bg-rise/15 text-rise";
  return "bg-panelhi text-muted";
}

export default async function DashboardPage() {
  const { data: companies, error } = await supabase
    .from("companies")
    .select("*")
    .in("research_status", ["watched", "holding", "exited"]);

  if (error) {
    return (
      <div className="rounded border border-fall/40 bg-fall/10 p-4 text-sm text-fall">
        Could not load companies: {error.message}
      </div>
    );
  }

  const list = (companies ?? []) as Company[];
  const invested = list.filter((c) => c.research_status === "holding");

  const valueByCompany = new Map<string, number>();
  await Promise.all(
    invested.map(async (c) => {
      const live = c.ticker ? await getLivePrice(c.ticker) : null;
      const price = live?.price ?? c.entry_price ?? 0;
      valueByCompany.set(c.id, (c.shares_held ?? 0) * price);
    })
  );
  const totalInvestedValue = Array.from(valueByCompany.values()).reduce((a, b) => a + b, 0);

  const { data: partnerships } = invested.length
    ? await supabase
        .from("partnerships")
        .select("*")
        .in(
          "company_id",
          invested.map((c) => c.id)
        )
    : { data: [] };

  const valueByCategory = new Map<string, number>();
  for (const c of invested) {
    const key = c.ai_category ?? "other";
    valueByCategory.set(key, (valueByCategory.get(key) ?? 0) + (valueByCompany.get(c.id) ?? 0));
  }
  const categoryConcentration = Array.from(valueByCategory.entries())
    .map(([cat, value]) => ({ cat, value, pct: totalInvestedValue > 0 ? (value / totalInvestedValue) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);

  const valueByPartner = new Map<string, { value: number; companies: Set<string> }>();
  for (const p of (partnerships ?? []) as Partnership[]) {
    const value = valueByCompany.get(p.company_id) ?? 0;
    const entry = valueByPartner.get(p.partner_name) ?? { value: 0, companies: new Set<string>() };
    entry.value += value;
    entry.companies.add(p.company_id);
    valueByPartner.set(p.partner_name, entry);
  }
  const partnerConcentration = Array.from(valueByPartner.entries())
    .map(([partner, { value, companies: companyIds }]) => ({
      partner,
      value,
      pct: totalInvestedValue > 0 ? (value / totalInvestedValue) * 100 : 0,
      companyCount: companyIds.size,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

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
          Two different questions. Capital concentration below is about real money: where invested capital
          is actually exposed, by category and by named partner. Research coverage further down is about
          completeness: which parts of the taxonomy have been looked at at all, regardless of whether
          anything there was ever funded.
        </p>
      </div>

      <div className="mb-10">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Capital concentration by AI category
        </h2>
        {invested.length === 0 ? (
          <p className="text-sm text-muted">No invested holdings yet.</p>
        ) : (
          <div className="rounded border border-line bg-panel p-4">
            {categoryConcentration.map((row) => (
              <div key={row.cat} className="mb-2 flex items-center gap-3">
                <span className="w-48 shrink-0 text-sm text-[#e7e8ea]">{CATEGORY_LABELS[row.cat] ?? row.cat}</span>
                <div className="relative h-2 flex-1 rounded bg-panelhi">
                  <div
                    className="absolute left-0 top-0 h-2 rounded bg-rise/60"
                    style={{ width: `${Math.min(row.pct, 100)}%` }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-xs text-muted">{row.pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-10">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Capital concentration by named partner
        </h2>
        <p className="mb-3 text-xs text-muted">
          What share of invested capital sits in a holding with at least one disclosed relationship to this
          partner. A holding with five partners contributes its full value to each, since the position is
          genuinely exposed via every one of those relationships, not divided across them.
        </p>
        {partnerConcentration.length === 0 ? (
          <p className="text-sm text-muted">No partnership data on invested holdings yet.</p>
        ) : (
          <div className="rounded border border-line bg-panel p-4">
            {partnerConcentration.map((row) => (
              <div key={row.partner} className="mb-2 flex items-center gap-3">
                <span className="w-48 shrink-0 text-sm text-[#e7e8ea]">
                  {row.partner}
                  {row.companyCount > 1 && (
                    <span className="ml-1 text-xs text-signal">({row.companyCount} holdings)</span>
                  )}
                </span>
                <div className="relative h-2 flex-1 rounded bg-panelhi">
                  <div
                    className="absolute left-0 top-0 h-2 rounded bg-signal/60"
                    style={{ width: `${Math.min(row.pct, 100)}%` }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-xs text-muted">{row.pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-10">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Research coverage by AI category</h2>
        <div className="grid grid-cols-2 gap-4">
          {CATEGORY_ORDER.map((cat) => {
            const companies = byCategory[cat] ?? [];
            if (companies.length === 0) {
              return (
                <div key={cat} className="rounded border border-dashed border-line bg-panel/40 p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium text-muted">{CATEGORY_LABELS[cat] ?? cat}</span>
                    <span className="font-mono text-xs text-muted">0</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">No companies currently researched in this category.</p>
                </div>
              );
            }
            return (
              <div key={cat} className="rounded border border-line bg-panel p-4">
                <div className="mb-3 flex items-baseline justify-between">
                  <span className="text-sm font-medium text-[#e7e8ea]">{CATEGORY_LABELS[cat] ?? cat}</span>
                  <span className="font-mono text-xs text-muted">{companies.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {companies.map((c) => (
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
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Research coverage by sector tag</h2>
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
