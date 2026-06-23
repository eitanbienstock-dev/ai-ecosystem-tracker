"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const ORG_ID = process.env.DEFAULT_ORG_ID as string;

function parseTags(formData: FormData): string[] {
  return formData.getAll("sector_tags").map((t) => String(t));
}

export async function createCompany(formData: FormData) {
  const status = String(formData.get("research_status") || "pipeline");
  const archiveReason = String(formData.get("archive_reason") || "").trim();
  if (status === "archived" && !archiveReason) {
    throw new Error("An archive reason is required when adding a company directly as archived.");
  }

  let pipelineOrder: number | null = null;
  if (status === "pipeline") {
    const { data: maxRow } = await supabase
      .from("companies")
      .select("pipeline_order")
      .in("research_status", ["pipeline", "invested"])
      .order("pipeline_order", { ascending: false })
      .limit(1)
      .single();
    pipelineOrder = (maxRow?.pipeline_order ?? 0) + 1;
  }

  const payload = {
    organisation_id: ORG_ID,
    name: String(formData.get("name") || ""),
    ticker: String(formData.get("ticker") || "") || null,
    sector_tags: parseTags(formData),
    ai_category: String(formData.get("ai_category") || "") || null,
    ai_materiality: String(formData.get("ai_materiality") || "") || null,
    circularity_note: String(formData.get("circularity_note") || "") || null,
    next_review_date: String(formData.get("next_review_date") || "") || null,
    financial_data_period: String(formData.get("financial_data_period") || "") || null,
    market_cap: formData.get("market_cap")
      ? Number(formData.get("market_cap"))
      : null,
    market_cap_updated_at: formData.get("market_cap")
      ? new Date().toISOString().slice(0, 10)
      : null,
    research_status: status,
    pipeline_order: pipelineOrder,
    archive_reason: status === "archived" ? archiveReason : null,
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
    const exitReason = String(formData.get("archive_reason") || "").trim();
    if (!exitReason) throw new Error("An archive reason is required when exiting a position.");
    updatePayload.research_status = "archived";
    updatePayload.pipeline_order = null;
    updatePayload.archive_reason = exitReason;
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

export async function movePipelineRank(companyId: string, direction: "up" | "down") {
  const { data: rows, error: fetchError } = await supabase
    .from("companies")
    .select("id, pipeline_order")
    .in("research_status", ["pipeline", "invested"])
    .order("pipeline_order", { ascending: true });
  if (fetchError) throw new Error(fetchError.message);

  const ordered = (rows ?? []) as { id: string; pipeline_order: number }[];
  const idx = ordered.findIndex((r) => r.id === companyId);
  if (idx === -1) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= ordered.length) return; // already at an edge, no-op

  const a = ordered[idx];
  const b = ordered[swapIdx];

  const { error: errA } = await supabase
    .from("companies")
    .update({ pipeline_order: b.pipeline_order })
    .eq("id", a.id);
  if (errA) throw new Error(errA.message);

  const { error: errB } = await supabase
    .from("companies")
    .update({ pipeline_order: a.pipeline_order })
    .eq("id", b.id);
  if (errB) throw new Error(errB.message);

  revalidatePath("/");
}

export async function archiveCompany(companyId: string, formData: FormData) {
  const reason = String(formData.get("archive_reason") || "").trim();
  if (!reason) throw new Error("An archive reason is required.");
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("companies")
    .update({
      research_status: "archived",
      pipeline_order: null,
      archive_reason: reason,
      last_reviewed_at: today,
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function restoreToPipeline(companyId: string, _formData: FormData) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: maxRow } = await supabase
    .from("companies")
    .select("pipeline_order")
    .in("research_status", ["pipeline", "invested"])
    .order("pipeline_order", { ascending: false })
    .limit(1)
    .single();
  const nextOrder = (maxRow?.pipeline_order ?? 0) + 1;

  const { error } = await supabase
    .from("companies")
    .update({
      research_status: "pipeline",
      pipeline_order: nextOrder,
      archive_reason: null,
      last_reviewed_at: today,
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function resolveCatalyst(catalystId: string, formData: FormData) {
  const status = String(formData.get("status")); // "realized" or "missed"
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("catalysts")
    .update({ status, resolved_at: today })
    .eq("id", catalystId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function markReviewed(companyId: string, formData: FormData) {
  const nextDate = String(formData.get("next_review_date") || "") || null;
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("companies")
    .update({ next_review_date: nextDate, last_reviewed_at: today, updated_at: new Date().toISOString() })
    .eq("id", companyId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath(`/companies/${companyId}`);
}

export async function deleteCompany(companyId: string, _formData: FormData) {
  // Delete child rows explicitly rather than relying on cascade behavior,
  // safe either way: a no-op if cascade already exists, required if it doesn't.
  await supabase.from("decision_log").delete().eq("company_id", companyId);
  await supabase.from("catalysts").delete().eq("company_id", companyId);
  await supabase.from("partnerships").delete().eq("company_id", companyId);
  await supabase.from("scores").delete().eq("company_id", companyId);

  const { error } = await supabase.from("companies").delete().eq("id", companyId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  redirect("/");
}

export async function updateCompany(id: string, formData: FormData) {
  const newStatus = String(formData.get("research_status") || "pipeline");
  const archiveReasonInput = String(formData.get("archive_reason") || "").trim();

  const { data: current } = await supabase
    .from("companies")
    .select("research_status, pipeline_order, archive_reason")
    .eq("id", id)
    .single();

  let pipelineOrder: number | null = current?.pipeline_order ?? null;
  let archiveReason: string | null = current?.archive_reason ?? null;

  if (newStatus === "pipeline" && current?.research_status !== "pipeline") {
    const { data: maxRow } = await supabase
      .from("companies")
      .select("pipeline_order")
      .in("research_status", ["pipeline", "invested"])
      .order("pipeline_order", { ascending: false })
      .limit(1)
      .single();
    pipelineOrder = (maxRow?.pipeline_order ?? 0) + 1;
    archiveReason = null;
  } else if (newStatus === "archived") {
    pipelineOrder = null;
    if (!archiveReasonInput && current?.research_status !== "archived") {
      throw new Error("An archive reason is required when archiving a company.");
    }
    archiveReason = archiveReasonInput || archiveReason;
  }
  // newStatus === "invested" falls through here deliberately: pipelineOrder
  // and archiveReason both keep their current values, since an invested
  // company stays ranked in the combined pipeline/invested list.

  const payload = {
    name: String(formData.get("name") || ""),
    ticker: String(formData.get("ticker") || "") || null,
    sector_tags: parseTags(formData),
    ai_category: String(formData.get("ai_category") || "") || null,
    ai_materiality: String(formData.get("ai_materiality") || "") || null,
    circularity_note: String(formData.get("circularity_note") || "") || null,
    next_review_date: String(formData.get("next_review_date") || "") || null,
    financial_data_period: String(formData.get("financial_data_period") || "") || null,
    market_cap: formData.get("market_cap")
      ? Number(formData.get("market_cap"))
      : null,
    market_cap_updated_at: formData.get("market_cap")
      ? new Date().toISOString().slice(0, 10)
      : null,
    research_status: newStatus,
    pipeline_order: pipelineOrder,
    archive_reason: archiveReason,
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

export async function dismissDigestFlag(companyId: string, digestId: string, _formData: FormData) {
  const { data: current } = await supabase
    .from("companies")
    .select("pending_digest_flags")
    .eq("id", companyId)
    .single();

  const remaining = (current?.pending_digest_flags ?? []).filter((id: string) => id !== digestId);

  const { error } = await supabase
    .from("companies")
    .update({ pending_digest_flags: remaining })
    .eq("id", companyId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath(`/companies/${companyId}`);
}
