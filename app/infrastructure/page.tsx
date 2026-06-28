import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Company = {
  id: string; name: string; ticker: string | null;
  research_status: string; ai_category: string | null;
  sector_tags: string[] | null; description: string | null;
  moat_description: string | null;
  ecosystem_leverage_direction: string | null;
  ecosystem_trajectory: string | null;
};

function mapToNodes(cat: string, tags: string[]): string[] {
  const t = tags.map(x => x.toLowerCase());
  const n: string[] = [];
  switch (cat) {
    case "semiconductors": {
      const optical = t.some(x => ["ai_optical","optical","photonics","transceivers","lasers","interconnect","active_cables","ai_connectivity"].includes(x));
      const net = t.some(x => ["networking","data center networking","connectivity"].includes(x));
      const chip = t.some(x => ["ai_chips","inference"].includes(x));
      const foundry = t.some(x => ["semiconductor_metrology","process_control","advanced_packaging","semiconductor_test"].includes(x));
      const marvell = chip && optical && net;
      if (marvell) n.push("broadcom");
      if (optical || net) n.push("networking");
      if (chip && !marvell) n.push("nvidia");
      if (foundry) n.push("tsmc");
      break;
    }
    case "compute_cloud": n.push("neoclouds"); break;
    case "power_infrastructure": n.push("power"); break;
    case "cybersecurity": n.push("enterprises"); break;
    case "data_layer":
      n.push("devtools");
      if (t.some(x => ["ai training data","model evaluation","data engineering"].includes(x))) n.push("ailabs");
      break;
    case "mlops_tooling": n.push("devtools"); break;
    case "applications":
      n.push("enterprises");
      if (t.some(x => ["agentic ai orchestration","enterprise automation"].includes(x))) n.push("devtools");
      break;
    case "robotics_physical": n.push("enterprises"); break;
    case "foundation_models": n.push("frontier"); break;
  }
  return [...new Set(n)];
}

function fitSummary(c: Company): string {
  const parts: string[] = [];
  if (c.description) parts.push(c.description.trim());
  if (c.moat_description) parts.push(c.moat_description.trim());
  const lev = c.ecosystem_leverage_direction === "hard_to_replace" ? "hard to replace within its layer" : c.ecosystem_leverage_direction === "commoditized" ? "operating in a commoditized layer" : null;
  const traj = c.ecosystem_trajectory === "strengthening" ? "with a strengthening ecosystem position" : c.ecosystem_trajectory === "weakening" ? "with a weakening ecosystem position" : c.ecosystem_trajectory === "stable" ? "with a stable ecosystem position" : null;
  const extras = [lev, traj].filter(Boolean);
  if (extras.length) parts.push(extras.join(", ") + ".");
  return parts.join(" ") || c.name + " operates in the AI infrastructure stack.";
}

export default async function InfrastructurePage() {
  const { data } = await supabase
    .from("companies")
    .select("id,name,ticker,ai_category,sector_tags,research_status,description,moat_description,ecosystem_leverage_direction,ecosystem_trajectory")
    .in("research_status", ["holding", "watched"])
    .order("name", { ascending: true });

  const companies = (data ?? []).map((c: Company) => ({
    id: c.id, name: c.name, ticker: c.ticker,
    research_status: c.research_status,
    nodes: mapToNodes(c.ai_category ?? "", c.sector_tags ?? []),
    fit_summary: fitSummary(c),
  }));

  return (
    <div className="-mx-6 -my-8">
      <script
        dangerouslySetInnerHTML={{ __html: 'window.__stackCompanies=' + JSON.stringify(companies) + ';' }}
      />
      <iframe
        src="/ai-infrastructure-stack.html"
        title="AI Infrastructure Stack"
        className="w-full border-none block"
        style={{ height: "calc(100vh - 57px)" }}
      />
    </div>
  );
}
