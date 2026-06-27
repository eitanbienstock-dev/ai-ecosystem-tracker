import { createCompany } from "@/lib/actions";
import CompanyFormFields from "@/app/companies/CompanyFormFields";

export default function NewCompanyPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display mb-6 text-2xl font-bold text-[#e7e8ea]">
        Add company
      </h1>
      <form action={createCompany} className="rounded border border-line bg-panel p-6">
        <CompanyFormFields />
        <button
          type="submit"
          className="mt-6 rounded bg-signal px-4 py-2 text-sm font-semibold text-ink hover:bg-signal/90"
        >
          Save company
        </button>
      </form>
    </div>
  );
}
