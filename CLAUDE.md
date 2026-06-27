# AI Ecosystem Tracker — Claude Code Rules

## Deployment workflow
When given files to apply: overwrite the target paths exactly as provided, make no logic changes unless explicitly instructed, then run `next build` to verify the build is clean before reporting done.

## Stack
Next.js 14 (App Router) + Supabase + Tailwind + Vercel

## Database (Supabase project: kxptnquxhcafucyipuwk)
- Use `apply_migration` for DDL (ALTER TABLE, CREATE TABLE)
- Use `execute_sql` for DML (INSERT, UPDATE, DELETE)
- Apostrophes in SQL string literals use doubled single quotes (word''s), not backslashes
- Delete child rows before parent rows
- Multi-statement batches with UNION ALL SELECT across tables require explicit type casts on date columns ('2026-06-25'::date, NULL::date) or Postgres silently rolls back
- Reliable pattern: run score INSERT, company UPDATE, partnership INSERT, and catalyst INSERT as separate execute_sql calls rather than batching
- For array columns (e.g. sector_tags), use SELECT DISTINCT unnest(column) to flatten

## UI and copy rules
- All UI copy and database-stored research text must read as written for someone encountering the system cold. Forbidden patterns: "correction:", "prior score", "earlier pass", "this pass", "was wrong", "research error", or any sentence narrating how a fix was made.
- When fixing a data error, clean surrounding note text of process narrative in the same pass.

## Research and data discipline
- Never leave financial fields null (revenue_growth_pct, gross_margin_pct, cash_flow_status, valuation_metric/multiple, insider_ownership_pct, institutional_ownership_pct) without first reading the company's actual 10-Q/10-K on EDGAR. Retail aggregators are not substitutes. If null after checking the filing, note it was checked but not found.
- Every new score must include price_at_scoring, price_at_scoring_date, and price_source. Use Finnhub's live quote endpoint (free tier). The historical candle endpoint returns no data on free tier — treat as paid-only.
- When a data error is fixed on one company, check all active companies for the same issue before considering it done.
- When a new feature depends on a database field, verify real data populates that field for existing records. A passing build is not sufficient.

## Methodology page
/methodology documents scoring weights, thresholds, formulas, workflow states, and validation rules. Whenever any of these change, update /methodology in the same change. Only document what is actually built.

## Scoring weights in use
Weight version c5c7fe8a: ecosystem 25 / financial 20 / ai_moat 15 / management 15 / catalyst 15 / valuation 10

## Market cap ceiling
$100B ceiling governs new intake only, not forced exits. Marvell is explicitly excluded from the ceiling-crossing flag.
