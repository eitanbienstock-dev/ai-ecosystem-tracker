import { updateCompany } from "@/lib/actions";
import CompanyFormFields from "@/app/companies/CompanyFormFields";
import { supabase, Company } from "@/lib/supabase";
import { notFound } from "next/navigation";

export default async function EditCompanyPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!company) notFound();

  const boundUpdate = async (formData: FormData) => {
    "use server";
    await updateCompany(params.id, formData);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display mb-6 text-2xl font-bold text-[#e7e8ea]">
        Edit {(company as Company).name}
      </h1>
      <form action={boundUpdate} className="rounded border border-line bg-panel p-6">
        <CompanyFormFields company={company as Company} />
        <button
          type="submit"
          className="mt-6 rounded bg-signal px-4 py-2 text-sm font-semibold text-ink hover:bg-signal/90"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
