# Plan 05: Line Item CRUD

## Goal
Implement full CRUD for line items. Line items are X's equivalent of Meta's ad sets — they hold the objective, targeting parameters, bid amount, placements, and schedule. Each line item belongs to a campaign.

## Context
- X Ads API: `GET /12/accounts/:account_id/line_items` — list
- X Ads API: `POST /12/accounts/:account_id/line_items` — create
- X Ads API: `PUT /12/accounts/:account_id/line_items/:line_item_id` — update
- X Ads API: `DELETE /12/accounts/:account_id/line_items/:line_item_id` — delete
- Line item fields for create/update (form-encoded body):
  - `campaign_id` (required for create) — parent campaign
  - `name` (required) — line item name
  - `objective` (required for create) — the campaign objective lives HERE, not on the campaign. Values: `AWARENESS`, `TWEET_ENGAGEMENTS`, `VIDEO_VIEWS`, `WEBSITE_CLICKS`, `WEBSITE_CONVERSIONS`, `FOLLOWERS`, `APP_INSTALLS`, `APP_ENGAGEMENTS`, `REACH`, `PREROLL_VIEWS`
  - `product_type` (required for create) — `PROMOTED_TWEETS` is the most common
  - `placements` (required for create) — comma-separated list: `ALL_ON_TWITTER`, `TWITTER_TIMELINE`, `TWITTER_PROFILE`, `TWITTER_SEARCH`, `PUBLISHER_NETWORK`
  - `bid_amount_local_micro` — bid in micro-currency (e.g., 2_000_000 = $2.00 bid). Required for most objectives.
  - `bid_type` — `AUTO` (let X optimize), `MAX` (max bid), `TARGET` (target cost). Default varies by objective.
  - `entity_status` — `ACTIVE`, `PAUSED`, or `DRAFT`
  - `start_time` / `end_time` — ISO 8601 datetime
  - `total_budget_amount_local_micro` — line-item-level budget cap (optional)
  - `automatically_select_bid` — `true`/`false`, use auto-bidding
- Line item read fields include all of the above plus: `id`, `created_at`, `updated_at`, `deleted`, `servable`, `reasons_not_servable`, `target_cpa_local_micro`
- Targeting is NOT set on the line item directly — it's managed via separate targeting criteria (see plan 08). The line item just holds the objective, bid, and placements.

## Steps

1. Create `src/commands/line-items.ts`:

   - `listLineItems(campaignId?: string, accountId?: string)`:
     - Get account ID from argument or `getAdAccountId()`
     - Call `xApiFetchAllPages("GET", "accounts/${accountId}/line_items", params)` where params includes `with_deleted=false` and optionally `campaign_ids=${campaignId}` if filtering
     - Print a formatted table:
       ```
       ID                    Name                  Campaign ID           Objective          Bid       Status    Servable
       ────────────────────  ────────────────────  ────────────────────  ─────────────────  ────────  ────────  ────────
       li_abc123             Men 25-45 Timeline    camp_xyz789           WEBSITE_CLICKS     $2.00     ACTIVE    true
       li_def456             Broad Awareness       camp_xyz789           AWARENESS          AUTO      PAUSED    false
       ```
     - Format micro bid amounts to dollars. If `automatically_select_bid` is true or bid is null, show "AUTO"
     - If no line items found, print: `No line items found.`

   - `createLineItem(opts, accountId?: string)`:
     - Required: `campaignId`, `name`, `objective`, `productType`, `placements`
     - Optional: `bid` (USD, converted to micros), `bidType` (AUTO/MAX/TARGET), `status` (default `PAUSED`), `totalBudget` (USD), `startTime`, `endTime`, `autoBid` (boolean)
     - Build form body:
       ```
       campaign_id=camp_xyz789
       name=Men+25-45+Timeline
       objective=WEBSITE_CLICKS
       product_type=PROMOTED_TWEETS
       placements=ALL_ON_TWITTER
       bid_amount_local_micro=2000000
       entity_status=PAUSED
       ```
     - If `autoBid` is true, set `automatically_select_bid=true` and omit `bid_amount_local_micro`
     - Call `xApi("POST", "accounts/${accountId}/line_items", undefined, body)`
     - Print created line item ID and settings with `✅`

   - `updateLineItem(lineItemId, opts, accountId?)`:
     - Optional fields: `name`, `status` (→ `entity_status`), `bid` (→ `bid_amount_local_micro`), `totalBudget`, `autoBid`
     - Build form body with only changed fields
     - Call `xApi("PUT", "accounts/${accountId}/line_items/${lineItemId}", undefined, body)`
     - Print confirmation with `✅`

   - `pauseLineItem(lineItemId, accountId?)`: updateLineItem with `status: "PAUSED"`

   - `removeLineItem(lineItemId, accountId?)`:
     - Call `xApi("DELETE", "accounts/${accountId}/line_items/${lineItemId}")`
     - Print confirmation

2. Wire up in `src/cli.ts`:
   - `x-ads line-items list [--campaign <id>] [--account <id>]`
   - `x-ads line-items create --campaign <id> --name <name> --objective <obj> [--product-type <type>] [--placements <p1,p2>] [--bid <usd>] [--bid-type <type>] [--auto-bid] [--total-budget <usd>] [--status <status>] [--start-time <date>] [--end-time <date>] [--account <id>]`
     - `--product-type` defaults to `PROMOTED_TWEETS`
     - `--placements` defaults to `ALL_ON_TWITTER`
   - `x-ads line-items update --id <id> [--name <n>] [--status <s>] [--bid <usd>] [--auto-bid] [--total-budget <usd>] [--account <id>]`
   - `x-ads line-items pause --id <id> [--account <id>]`
   - `x-ads line-items remove --id <id> [--account <id>]`

## Important Notes
- **Objective is on the line item**, not the campaign. This is the biggest structural difference from Meta/Google. A single campaign can have line items with different objectives (though in practice most advertisers use one objective per campaign).
- **Placements**: `ALL_ON_TWITTER` is the simplest option. For more control, pass a comma-separated list like `TWITTER_TIMELINE,TWITTER_SEARCH`.
- **Bid in micros**: `$2.00 bid = 2_000_000 micros`. CLI accepts dollars.
- **Auto-bidding**: Set `automatically_select_bid=true` to let X optimize the bid. In this case, don't send `bid_amount_local_micro`.
- **Targeting is separate**: Creating a line item does NOT set targeting. Targeting criteria are managed via a separate endpoint (plan 08). A freshly created line item with no targeting will target broadly.
- **`campaign_ids` param** (for filtering): Note the plural — this is a comma-separated list of campaign IDs, even when filtering by a single one.

## Files Created/Modified
- `src/commands/line-items.ts` (new)
- `src/cli.ts` (modified)

## Verification
```bash
npx tsc --noEmit                                       # exits 0
npx tsx src/cli.ts line-items --help                   # prints help
npx tsx src/cli.ts line-items create --help            # shows --campaign, --name, --objective, --placements flags
npx tsx src/cli.ts line-items list --help              # shows --campaign flag
```

If a valid `.env` is configured:
```bash
npx tsx src/cli.ts line-items list                     # lists line items or prints "No line items found"
```

## Commit
```bash
git add -A
git commit -m "line-items: CRUD for line items (targeting containers with objectives)"
```
