import { Company } from "@/lib/supabase";
import { STATUS_DEFINITIONS } from "@/lib/statusDefinitions";

const AI_CATEGORIES = [
  "infrastructure",
  "software",
  "semiconductors",
  "robotics_automation",
  "cybersecurity",
  "data_layer",
  "other",
];

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
      </div>

      <Field label="Sector tags" hint="Comma-separated, e.g. observability, cloud infra">
        <input
          name="sector_tags"
          defaultValue={(company?.sector_tags ?? []).join(", ")}
          className="input"
        />
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
