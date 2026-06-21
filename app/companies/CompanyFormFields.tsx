import { Company } from "@/lib/supabase";
import { STATUS_DEFINITIONS } from "@/lib/statusDefinitions";
import { SECTOR_TAGS } from "@/lib/tags";

const AI_CATEGORIES = [
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

const AI_MATERIALITY = ["core_to_thesis", "significant", "moderate", "peripheral"];

const MATERIALITY_HINTS: Record<string, string> = {
  core_to_thesis: "AI is the reason this company exists, not a feature layered on",
  significant: "A real, material pivot underway, but a substantial non-AI business remains",
  moderate: "AI features layered onto an existing, pre-AI business",
  peripheral: "AI is one input among many, not central to the investment case",
};

const RESEARCH_STATUSES = [
  "watching",
  "researching",
  "active_watch",
  "invested",
  "passed",
  "exited",
];

export default function CompanyFormFields({ company }: { company?: Company }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Company name" required>
          <input
            name="name"
            required
            defaultValue={company?.name}
            className="input"
            placeholder="e.g. Datadog"
          />
        </Field>
        <Field label="Ticker">
          <input
            name="ticker"
            defaultValue={company?.ticker ?? ""}
            className="input font-mono"
            placeholder="e.g. DDOG"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="AI category">
          <select
            name="ai_category"
            defaultValue={company?.ai_category ?? ""}
            className="input"
          >
            <option value="">Select category</option>
            {AI_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="AI materiality">
          <select
            name="ai_materiality"
            defaultValue={company?.ai_materiality ?? ""}
            className="input"
          >
            <option value="">Select materiality</option>
            {AI_MATERIALITY.map((m) => (
              <option key={m} value={m}>
                {m.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          {company?.ai_materiality && (
            <p className="mt-1 text-xs text-muted">{MATERIALITY_HINTS[company.ai_materiality]}</p>
          )}
        </Field>
      </div>

      <Field label="Research status">
        <select
          name="research_status"
          defaultValue={company?.research_status ?? "watching"}
          className="input"
        >
          {RESEARCH_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted">
          {RESEARCH_STATUSES.filter((s) => STATUS_DEFINITIONS[s])
            .map((s) => `${s.replace("_", " ")}: ${STATUS_DEFINITIONS[s]}`)
            .slice(0, 3)
            .join(" — ")}
        </p>
      </Field>

      <Field label="Sector tags">
        <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 rounded border border-line bg-panelhi p-3">
          {SECTOR_TAGS.map((tag) => (
            <label key={tag} className="flex items-center gap-1.5 text-xs text-[#cfd1d5]">
              <input
                type="checkbox"
                name="sector_tags"
                value={tag}
                defaultChecked={(company?.sector_tags ?? []).includes(tag)}
              />
              {tag}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Market cap (USD)" hint="Plain number, e.g. 4200000000 for $4.2B">
        <input
          name="market_cap"
          type="number"
          defaultValue={company?.market_cap ?? ""}
          className="input font-mono"
        />
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          defaultValue={company?.description ?? ""}
          rows={4}
          className="input"
          placeholder="What does this company actually do, in one or two sentences"
        />
      </Field>

      <Field
        label="Circularity note"
        hint="Optional. Related-party structures, e.g. a chip supplier that is also an investor and whose largest customers buy from it"
      >
        <textarea
          name="circularity_note"
          defaultValue={company?.circularity_note ?? ""}
          rows={3}
          className="input"
        />
      </Field>

      <p className="text-xs text-muted">
        Deeper layers, financials, management signals, AI moat, partnerships, and
        catalysts, are populated through research entries rather than this form.
        This covers identity and classification only.
      </p>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
        {label} {required && <span className="text-signal">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
