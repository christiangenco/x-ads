# Plan 10: Analytics / Reporting

## Goal
Implement `x-ads analytics` for pulling performance data at account, campaign, line item, and promoted tweet levels.

## Context
- X Ads API: `GET /12/stats/accounts/:account_id` — the unified stats endpoint
- Required parameters:
  - `entity` — entity type: `CAMPAIGN`, `LINE_ITEM`, `PROMOTED_TWEET`, or `ORGANIC_TWEET`
  - `entity_ids` — comma-separated list of entity IDs to get stats for (max 20 per request)
  - `start_time` — ISO 8601 datetime (required)
  - `end_time` — ISO 8601 datetime (required)
  - `granularity` — `HOUR`, `DAY`, or `TOTAL` (default `TOTAL` for summary)
  - `metric_groups` — comma-separated list of metric groups to retrieve. Common groups:
    - `ENGAGEMENT` — impressions, clicks, likes, retweets, replies, follows, url_clicks, card_engagements, qualified_impressions
    - `BILLING` — billed_charge_local_micro, billed_engagements
    - `VIDEO` — video_total_views, video_views_25, video_views_50, video_views_75, video_views_100, video_content_starts, video_mrc_views
    - `WEB_CONVERSION` — conversion_purchases, conversion_sign_ups, conversion_site_visits, conversion_downloads, conversion_custom
    - `MEDIA` — media_views, media_engagements
- Response format:
  ```json
  {
    "data": [
      {
        "id": "campaign_id",
        "id_data": [
          {
            "metrics": {
              "impressions": [12345],
              "clicks": [678],
              "billed_charge_local_micro": [50000000],
              "url_clicks": [500],
              ...
            },
            "segment": null
          }
        ]
      }
    ]
  }
  ```
  - Each metric is an ARRAY (one element per granularity period). For `TOTAL` granularity, it's a single-element array.
  - `billed_charge_local_micro` is in micro-currency.
- To get stats for ALL campaigns/line items (not just specific IDs), you must first list the entities, then pass their IDs to the stats endpoint. The stats endpoint does NOT support "all entities" — you must provide specific IDs.

## Steps

1. Create `src/commands/analytics.ts`:

   - `getAnalytics(opts)`:
     - Parameters:
       - `entity`: `CAMPAIGN` | `LINE_ITEM` | `PROMOTED_TWEET` (default `CAMPAIGN`)
       - `entityIds`: optional array of specific IDs. If not provided, fetch all entity IDs first (list campaigns, line items, or promoted tweets).
       - `dateRange`: default `last_7d`. Accept presets (`last_7d`, `last_14d`, `last_30d`, `today`, `yesterday`, `this_month`, `last_month`) or custom range `YYYY-MM-DD..YYYY-MM-DD`.
       - `granularity`: `TOTAL` | `DAY` | `HOUR` (default `TOTAL`)
       - `accountId`: optional override
     - Steps:
       1. Parse date range:
          - For presets, calculate start_time and end_time from the current date. E.g., `last_7d` = 7 days ago to now.
          - For custom ranges, parse `YYYY-MM-DD..YYYY-MM-DD`.
          - Format as ISO 8601 with timezone (e.g., `2026-02-12T00:00:00Z`).
       2. If no entity IDs provided, fetch them:
          - For `CAMPAIGN`: call `xApiFetchAllPages("GET", "accounts/${accountId}/campaigns", { with_deleted: "false" })` and extract IDs
          - For `LINE_ITEM`: call `xApiFetchAllPages("GET", "accounts/${accountId}/line_items", { with_deleted: "false" })` and extract IDs
          - For `PROMOTED_TWEET`: call `xApiFetchAllPages("GET", "accounts/${accountId}/promoted_tweets", { with_deleted: "false" })` and extract IDs
       3. Batch entity IDs in groups of 20 (API limit) and call the stats endpoint for each batch:
          ```
          GET /12/stats/accounts/${accountId}
            ?entity=CAMPAIGN
            &entity_ids=id1,id2,...
            &start_time=2026-02-12T00:00:00Z
            &end_time=2026-02-19T00:00:00Z
            &granularity=TOTAL
            &metric_groups=ENGAGEMENT,BILLING
          ```
       4. Also fetch entity names (from the list call in step 2, or a separate call) so the table shows names instead of just IDs.
       5. Aggregate results and print a formatted table:
          ```
          Campaign              Impressions    Clicks    URL Clicks    Spend        Engagements    Follows
          ────────────────────  ─────────────  ────────  ──────────    ───────────  ─────────────  ───────
          Summer Sale 2026      45,678         1,234     890           $125.50      2,345          67
          Brand Awareness Q1    12,345         456       210           $45.00       890            23
          ─────────────────────────────────────────────────────────────────────────────────────────────────
          TOTAL                 58,023         1,690     1,100         $170.50      3,235          90
          ```
       6. Format:
          - Numbers with commas
          - `billed_charge_local_micro` → dollars (`/ 1_000_000`)
          - Calculate CTR: `clicks / impressions * 100` (show as percentage)
          - Calculate CPC: `spend / clicks` (show as dollars)

     - For `DAY` granularity, print one row per day per entity (or a date-grouped table).

2. Wire up in `src/cli.ts`:
   - `x-ads analytics [--entity <type>] [--ids <id1,id2,...>] [--date-range <preset|range>] [--granularity <gran>] [--account <id>]`
     - `--entity` defaults to `CAMPAIGN`
     - `--ids` optional — if omitted, fetches all entities of that type
     - `--date-range` defaults to `last_7d`
     - `--granularity` defaults to `TOTAL`
   - Shortcuts:
     - `x-ads analytics --campaign <id>` → sets entity=CAMPAIGN, ids=[id]
     - `x-ads analytics --line-item <id>` → sets entity=LINE_ITEM, ids=[id]

## Important Notes
- **Stats endpoint requires specific entity IDs** — there's no "give me all campaign stats" mode. You must list the entities first, then pass their IDs. This means two API calls minimum.
- **Max 20 entity IDs per request**: For accounts with many campaigns, batch the IDs.
- **Metrics are arrays**: Even for `TOTAL` granularity, each metric is a single-element array. Extract `[0]` for the value.
- **`billed_charge_local_micro`** is the actual spend, in micro-currency. This is the X equivalent of Meta's `spend` field.
- **Metric groups must be requested explicitly**: Unlike Meta's insights endpoint which returns common metrics by default, X requires you to specify which metric groups you want. Default to `ENGAGEMENT,BILLING` for the most useful output.
- **Date range parsing**: The X stats endpoint requires explicit ISO 8601 timestamps, not presets. We need to convert preset names to actual dates. All times should be in UTC.
- **Null metrics**: If an entity had no activity in the date range, some metrics may be `null` or `[null]`. Handle gracefully — display as `0` or `—`.

## Files Created/Modified
- `src/commands/analytics.ts` (new)
- `src/cli.ts` (modified)

## Verification
```bash
npx tsc --noEmit                                    # exits 0
npx tsx src/cli.ts analytics --help                 # prints help with all flags
```

If a valid `.env` is configured:
```bash
npx tsx src/cli.ts analytics                        # prints campaign-level last 7d stats (or "No data")
npx tsx src/cli.ts analytics --entity LINE_ITEM     # prints per-line-item breakdown
```

## Commit
```bash
git add -A
git commit -m "analytics: performance reporting at campaign, line item, and promoted tweet levels"
```
