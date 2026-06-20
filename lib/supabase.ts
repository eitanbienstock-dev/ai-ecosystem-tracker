import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

export type Company = {
  id: string;
  organisation_id: string;
  name: string;
  ticker: string | null;
  sector_tags: string[] | null;
  ai_category: string | null;
  market_cap: number | null;
  market_cap_updated_at: string | null;
  research_status: string;
  description: string | null;
  key_people: { name: string; role: string }[] | null;
  revenue_growth_pct: number | null;
  gross_margin_pct: number | null;
  ai_revenue_mix_pct: number | null;
  cash_flow_status: string | null;
  valuation_metric: string | null;
  valuation_multiple: number | null;
  insider_ownership_pct: number | null;
  insider_ownership_trend: string | null;
  institutional_ownership_pct: number | null;
  institutional_ownership_trend: string | null;
  capital_allocation_assessment: string | null;
  ai_claims_credibility: string | null;
  compensation_tied_to_ai: boolean | null;
  moat_description: string | null;
  customer_concentration_risk: string | null;
  ecosystem_leverage_direction: string | null;
  ecosystem_trajectory: string | null;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Partnership = {
  id: string;
  company_id: string;
  anchor_partner_id: string | null;
  partner_name: string;
  partner_tier: string | null;
  deal_type: string | null;
  deal_date: string | null;
  exclusivity: string | null;
  disclosed_revenue: number | null;
  notes: string | null;
};

export type Catalyst = {
  id: string;
  company_id: string;
  description: string;
  expected_date: string | null;
  status: string;
};

export type Score = {
  id: string;
  company_id: string;
  weight_version_id: string;
  ecosystem_position_score: number | null;
  financial_quality_score: number | null;
  ai_moat_score: number | null;
  management_ownership_score: number | null;
  catalyst_clarity_score: number | null;
  valuation_score: number | null;
  composite_score: number | null;
  conviction_score: number | null;
  thesis: string | null;
  biggest_risk: string | null;
  scored_at: string;
};
