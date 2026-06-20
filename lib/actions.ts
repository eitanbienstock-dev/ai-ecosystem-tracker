"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const ORG_ID = process.env.DEFAULT_ORG_ID as string;

function parseTags(raw: FormDataEntryValue | null): string[] {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createCompany(formData: FormData) {
  const payload = {
    organisation_id: ORG_ID,
    name: String(formData.get("name") || ""),
    ticker: String(formData.get("ticker") || "") || null,
    sector_tags: parseTags(formData.get("sector_tags")),
    ai_category: String(formData.get("ai_category") || "") || null,
    market_cap: formData.get("market_cap")
      ? Number(formData.get("market_cap"))
      : null,
    market_cap_updated_at: formData.get("market_cap")
      ? new Date().toISOString().slice(0, 10)
      : null,
    research_status: String(formData.get("research_status") || "watching"),
    description: String(formData.get("description") || "") || null,
  };

  const { data, error } = await supabase
    .from("companies")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  redirect(`/companies/${data.id}`);
}

export async function updateCompany(id: string, formData: FormData) {
  const payload = {
    name: String(formData.get("name") || ""),
    ticker: String(formData.get("ticker") || "") || null,
    sector_tags: parseTags(formData.get("sector_tags")),
    ai_category: String(formData.get("ai_category") || "") || null,
    market_cap: formData.get("market_cap")
      ? Number(formData.get("market_cap"))
      : null,
    market_cap_updated_at: formData.get("market_cap")
      ? new Date().toISOString().slice(0, 10)
      : null,
    research_status: String(formData.get("research_status") || "watching"),
    description: String(formData.get("description") || "") || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("companies").update(payload).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath(`/companies/${id}`);
  redirect(`/companies/${id}`);
}
