"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const ORG_ID = process.env.DEFAULT_ORG_ID as string;

function parseTags(formData: FormData): string[] {
  return formData.getAll("sector_tags").map((t) => String(t));
}

export async function createCompany(formData: FormData) {
  const payload = {
    organisation_id: ORG_ID,
    name: String(formData.get("name") || ""),
    ticker: String(formData.get("ticker") || "") || null,
    sector_tags: parseTags(formData),
    ai_category: String(formData.get("ai_category") || "") || null,
    ai_materiality: String(formData.get("ai_materiality") || "") || null,
    circularity_note: String(formData.get("circularity_note") || "") || null,
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

export async function promoteToInvested(companyId: string, formData: FormData) {
  const entryPrice = Number(formData.get("entry_price") || 0);
  const shares = Number(formData.get("shares") || 0);
  const note = String(formData.get("note") || "");
  const today = new Date().toISOString().slice(0, 10);

  const { error: updateError } = await supabase
    .from("companies")
    .update({
      research_status: "invested",
      entry_date: today,
      entry_price: entryPrice,
      shares_held: shares,
      last_reviewed_at: today,
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId);

  if (updateError) throw new Error(updateError.message);

  const { error: logError } = await supabase.from("decision_log").insert({
    company_id: companyId,
    entry_type: "initiated",
    entry_date: today,
    shares_delta: shares,
    price: entryPrice,
    note: note || null,
  });

  if (logError) throw new Error(logError.message);

  revalidatePath("/");
  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}`);
}

export async function logReview(companyId: string, formData: FormData) {
  const note = String(formData.get("note") || "Reviewed, no change");
  const clearsNeedsReview = formData.get("clear_needs_review") === "on";
  const today = new Date().toISOString().slice(0, 10);

  const { error: logError } = await supabase.from("decision_log").insert({
    company_id: companyId,
    entry_type: "reviewed",
    entry_date: today,
    note,
  });
  if (logError) throw new Error(logError.message);

  const updatePayload: Record<string, unknown> = {
    last_reviewed_at: today,
    updated_at: new Date().toISOString(),
  };
  if (clearsNeedsReview) updatePayload.needs_review = false;

  const { error: updateError } = await supabase
    .from("companies")
    .update(updatePayload)
    .eq("id", companyId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath("/");
  revalidatePath(`/companies/${companyId}`);
}

export async function recordTransaction(companyId: string, formData: FormData) {
  const type = String(formData.get("entry_type")) as "added" | "trimmed" | "exited";
  const price = Number(formData.get("price") || 0);
  const shares = Number(formData.get("shares") || 0);
  const note = String(formData.get("note") || "");
  const today = new Date().toISOString().slice(0, 10);

  const { data: company, error: fetchError } = await supabase
    .from("companies")
    .select("shares_held")
    .eq("id", companyId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const currentShares = Number(company?.shares_held || 0);
  const sharesDelta = type === "added" ? shares : -shares;
  const newShares = type === "exited" ? 0 : currentShares + sharesDelta;

  const updatePayload: Record<string, unknown> = {
    shares_held: newShares,
    last_reviewed_at: today,
    updated_at: new Date().toISOString(),
  };
  if (type === "exited") {
    updatePayload.research_status = "exited";
    updatePayload.exit_date = today;
    updatePayload.exit_price = price;
  }

  const { error: updateError } = await supabase
    .from("companies")
    .update(updatePayload)
    .eq("id", companyId);
  if (updateError) throw new Error(updateError.message);

  const { error: logError } = await supabase.from("decision_log").insert({
    company_id: companyId,
    entry_type: type,
    entry_date: today,
    shares_delta: type === "exited" ? -currentShares : sharesDelta,
    price,
    note: note || null,
  });
  if (logError) throw new Error(logError.message);

  revalidatePath("/");
  revalidatePath(`/companies/${companyId}`);
}

export async function updateResearchStatus(companyId: string, formData: FormData) {
  const newStatus = String(formData.get("research_status"));
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("companies")
    .update({ research_status: newStatus, last_reviewed_at: today, updated_at: new Date().toISOString() })
    .eq("id", companyId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath(`/companies/${companyId}`);
}

export async function reevaluateCompany(companyId: string, _formData: FormData) {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("companies")
    .update({
      research_status: "watching",
      last_reviewed_at: today,
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function updateCompany(id: string, formData: FormData) {
  const payload = {
    name: String(formData.get("name") || ""),
    ticker: String(formData.get("ticker") || "") || null,
    sector_tags: parseTags(formData),
    ai_category: String(formData.get("ai_category") || "") || null,
    ai_materiality: String(formData.get("ai_materiality") || "") || null,
    circularity_note: String(formData.get("circularity_note") || "") || null,
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
