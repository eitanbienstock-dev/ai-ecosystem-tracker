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
- Never leave financial fields null (revenue_growth_pct, gross_margin_pct, cash_flow_status, valuation_metric/multiple, insider_ownership_pct, institutional_ownership_pct, cash_and_equivalents, non_current_debt, capex_actual) without first reading the company's actual 10-Q/10-K on EDGAR. Retail aggregators are not substitutes. If null after checking the filing, note it was checked but not found.
- cash_and_equivalents, non_current_debt, and capex_actual are point-in-time balance sheet figures with their own balance_sheet_period date, not the YoY financial_data_period used for revenue/margin. capex_actual is the latest disclosed actual, never a forward guidance range, guidance stays as prose in balance_sheet_note.
- leadership_track_record: proxy statements and AGM filings carry officer bios and count as the primary source for this field, same standing as a 10-Q for revenue. Company site bios and reputable business press are fallback only. CEO by default; only add another named executive when their specific prior history is material to the thesis, not for completeness.
- Every new score must include price_at_scoring, price_at_scoring_date, and price_source. Use Finnhub's live quote endpoint (free tier). The historical candle endpoint returns no data on free tier — treat as paid-only.
- When a data error is fixed on one company, check all active companies for the same issue before considering it done.
- When a new feature depends on a database field, verify real data populates that field for existing records. A passing build is not sufficient.

## METHODOLOGY PAGE -- MANDATORY ON EVERY CHANGE
This is non-negotiable and applies to every single prompt without exception.
Before running next build on any prompt, check whether the changes made affect any of the following: scoring weights, portfolio mechanics, pipeline status model, transaction logic, UI workflows, data sources, or any feature visible to the user.
If yes: update app/methodology/page.tsx to accurately reflect the change before building.
If no mechanic changed: add a one-line comment in your response confirming you checked and no methodology update was needed.
Never skip this step. Never defer it to a later prompt. The build should not run until methodology is current.

## Scoring weights in use
Weight version c5c7fe8a: ecosystem 25 / financial 20 / ai_moat 15 / management 15 / catalyst 15 / valuation 10

## Market cap ceiling
$100B ceiling governs new intake only, not forced exits. Marvell is explicitly excluded from the ceiling-crossing flag.
