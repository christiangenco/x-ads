# Plan 04: Campaign CRUD

## Goal
Implement full CRUD for campaigns: list, create, update, pause, remove.

## Context
- X Ads API: `GET /12/accounts/:account_id/campaigns` — list
- X Ads API: `POST /12/accounts/:account_id/campaigns` — create
- X Ads API: `PUT /12/accounts/:account_id/campaigns/:campaign_id` — update
- X Ads API: `DELETE /12/accounts/:account_id/campaigns/:campaign_id` — delete (soft delete, sets `deleted` to true)
- Campaign fields for create/update (sent as form-encoded body):
  - `name` (required) — campaign name
  - `funding_instrument_id` (required for create) — which payment method to use
  - `daily_budget_amount_local_micro` — daily budget in micro-currency (optional)
  - `total_budget_amount_local_micro` — total/lifetime budget in micro-currency (optional, but at least one budget is required)
  - `entity_status` — `ACTIVE`, `PAUSED`, or `DRAFT` (default PAUSED)
  - `start_time` — ISO 8601 datetime (optional)
  - `end_time` — ISO 8601 datetime (optional)
- Campaign read fields include all of the above plus: `id`, `currency`, `created_at`, `updated_at`, `deleted`, `reasons_not_servable`, `servable`
- Note: Unlike Meta, campaign objectives are set on the **line item**, not the campaign. X campaigns are primarily budget/schedule containers.

## Steps

1. Create `src/commands/campaigns.ts`:

   - `listCampaigns(accountId?: string)`:
     - Get account ID from argument or `getAdAccountId()`
     - Call `xApiFetchAllPages("GET", "accounts/${accountId}/campaigns", { with_deleted: "false" })`
     - Print a formatted table:
       ```
       ID                    Name                           Status    Daily Budget    Total Budget    Servable
       ────────────────────  ─────────────────────────────  ────────  ──────────────  ──────────────  ────────
       abc123                Summer Sale 2026               ACTIVE    $50.00          $500.00         true
       def456                Brand Awareness Q1             PAUSED    $25.00          —               false
       ```
     - Format micro amounts to dollars: `amount / 1_000_000`
     - Show `reasons_not_servable` if present (as a comma-separated list after the table row, or as a note)
     - If no campaigns found, print: `No campaigns found.`

   - `createCampaign(opts, accountId?: string)`:
     - Required: `name`, `fundingInstrumentId`
     - Optional: `dailyBudget` (USD, converted to micros), `totalBudget` (USD, converted to micros), `status` (default `PAUSED`), `startTime`, `endTime`
     - Build form body:
       ```
       name=Campaign+Name
       funding_instrument_id=xyz789
       daily_budget_amount_local_micro=50000000
       entity_status=PAUSED
       ```
     - Call `xApi("POST", "accounts/${accountId}/campaigns", undefined, body)`
     - Print created campaign ID and settings with `✅`

   - `updateCampaign(campaignId: string, opts, accountId?: string)`:
     - Optional fields: `name`, `status` (→ `entity_status`), `dailyBudget`, `totalBudget`
     - Build form body with only the fields being updated
     - Call `xApi("PUT", "accounts/${accountId}/campaigns/${campaignId}", undefined, body)`
     - Print confirmation with `✅`

   - `pauseCampaign(campaignId, accountId?)`: calls updateCampaign with `status: "PAUSED"`

   - `removeCampaign(campaignId, accountId?)`:
     - Call `xApi("DELETE", "accounts/${accountId}/campaigns/${campaignId}")`
     - Print confirmation

2. Wire up in `src/cli.ts`:
   - `x-ads campaigns list [--account <id>]`
   - `x-ads campaigns create --name <name> --funding <id> [--budget <usd>] [--total-budget <usd>] [--status <status>] [--start-time <date>] [--end-time <date>] [--account <id>]`
   - `x-ads campaigns update --id <id> [--name <name>] [--status <status>] [--budget <usd>] [--total-budget <usd>] [--account <id>]`
   - `x-ads campaigns pause --id <id> [--account <id>]`
   - `x-ads campaigns remove --id <id> [--account <id>]`

## Important Notes
- **Budget in micros**: 1 USD = 1,000,000 micros. `$50/day = 50_000_000`. CLI accepts dollars, converts internally.
- **Objectives are NOT on campaigns**: Unlike Meta (where campaign has an objective) or Google (where campaign has a channel type), X campaigns are just budget containers. The objective is set on the line item.
- **`entity_status`** is the field name (not just `status`). Values: `ACTIVE`, `PAUSED`, `DRAFT`.
- **Funding instrument is required**: Every campaign must reference a funding instrument. List them with `x-ads funding` first.
- **Delete is soft**: `DELETE` sets `deleted=true` but the campaign still exists. It's not the same as Meta's `DELETED` status.
- **`reasons_not_servable`**: Array of strings explaining why a campaign can't serve (e.g., `PAUSED_BY_ADVERTISER`, `EXPIRED`, `BUDGET_EXHAUSTED`). Useful for debugging.

## Files Created/Modified
- `src/commands/campaigns.ts` (new)
- `src/cli.ts` (modified)

## Verification
```bash
npx tsc --noEmit                                    # exits 0
npx tsx src/cli.ts campaigns --help                 # prints help
npx tsx src/cli.ts campaigns list --help             # prints help
npx tsx src/cli.ts campaigns create --help           # shows --name, --funding, --budget flags
```

If a valid `.env` is configured:
```bash
npx tsx src/cli.ts campaigns list                   # lists campaigns or prints "No campaigns found"
```

## Commit
```bash
git add -A
git commit -m "campaigns: CRUD for X ad campaigns"
```
