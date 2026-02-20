# Plan 08: Targeting Criteria

## Goal
Implement targeting criteria management for line items. Unlike Meta (where targeting is a JSON blob on the ad set) or Google (where keywords are on the ad group), X uses a separate targeting criteria endpoint. Each criterion is its own object linked to a line item.

## Context
- X Ads API: `GET /12/accounts/:account_id/targeting_criteria` — list targeting criteria (filter by `line_item_ids`)
- X Ads API: `POST /12/accounts/:account_id/targeting_criteria` — add targeting criteria to a line item
- X Ads API: `DELETE /12/accounts/:account_id/targeting_criteria/:targeting_criteria_id` — remove a targeting criterion
- X Ads API: `GET /12/targeting_criteria/locations` — browse/search location targeting options
- X Ads API: `GET /12/targeting_criteria/interests` — browse interest categories
- X Ads API: `GET /12/targeting_criteria/platforms` — list platform options
- X Ads API: `GET /12/targeting_criteria/devices` — list device options
- X Ads API: `GET /12/targeting_criteria/conversations` — search conversation topics
- X Ads API: `GET /12/targeting_criteria/events` — search events
- X Ads API: `GET /12/targeting_criteria/behaviors` — browse behaviors (via partner audiences)
- Targeting criteria fields for create:
  - `line_item_id` (required) — which line item to target
  - `targeting_type` (required) — one of: `LOCATION`, `FOLLOWERS_OF_USER`, `SIMILAR_TO_FOLLOWERS_OF_USER`, `INTEREST`, `PLATFORM`, `PLATFORM_VERSION`, `DEVICE`, `WIFI_ONLY`, `GENDER`, `AGE`, `BEHAVIOR`, `NEGATIVE_BEHAVIOR`, `LANGUAGE`, `NETWORK_ACTIVATION_DURATION`, `CONVERSATION`, `EVENT`, `BROAD_KEYWORD`, `UNORDERED_KEYWORD`, `PHRASE_KEYWORD`, `EXACT_KEYWORD`, `NEGATIVE_PHRASE_KEYWORD`, `NEGATIVE_UNORDERED_KEYWORD`, `NEGATIVE_EXACT_KEYWORD`, `TAILORED_AUDIENCE`, `TAILORED_AUDIENCE_EXPANDED`, `TAILORED_AUDIENCE_LOOKALIKE`
  - `targeting_value` (required) — the value for the targeting type (e.g., location key, interest ID, keyword text, user handle, age range like `AGE_25_TO_34`)
- Multiple criteria of the same type are OR'd together (e.g., two locations = target either location). Different types are AND'd (e.g., location AND interest = must match both).
- Batch create: The POST endpoint can accept `params` as a JSON array to create multiple criteria at once (instead of one at a time).

## Steps

1. Create `src/commands/targeting.ts`:

   - **Browse/Search helpers** — these query the targeting option discovery endpoints:

   - `searchLocations(query: string)`:
     - Call `xApi("GET", "targeting_criteria/locations", { q: query, location_type: "CITY,STATE,COUNTRY,POSTAL_CODE" })`
     - Print table: Key, Name, Type, Country Code
     - Print usage example: `Add to line item: x-ads targeting add --line-item <ID> --type LOCATION --value <KEY>`

   - `listInterests()`:
     - Call `xApi("GET", "targeting_criteria/interests")`
     - These are hierarchical categories. Print a tree-like list: ID, Name, Parent
     - Print usage example: `Add to line item: x-ads targeting add --line-item <ID> --type INTEREST --value <ID>`

   - `searchConversations(query: string)`:
     - Call `xApi("GET", "targeting_criteria/conversations", { q: query })`
     - Print table: ID, Name, Topic
     - Print usage example

   - `listPlatforms()`:
     - Call `xApi("GET", "targeting_criteria/platforms")`
     - Print table: ID, Name (e.g., 0=iOS, 1=Android, 4=Desktop)

   - **Targeting criteria on line items**:

   - `showTargeting(lineItemId: string, accountId?: string)`:
     - Call `xApiFetchAllPages("GET", "accounts/${accountId}/targeting_criteria", { line_item_ids: lineItemId, with_deleted: "false" })`
     - Group by `targeting_type` and print:
       ```
       Targeting for line item li_abc123:
       
       LOCATION:
         - United States (us_country)
         - Texas (us_state_tx)
       
       INTEREST:
         - Technology (interest_123)
         - Business (interest_456)
       
       AGE:
         - AGE_25_TO_34
         - AGE_35_TO_49
       
       GENDER:
         - MALE
       ```

   - `addTargeting(lineItemId: string, type: string, values: string[], accountId?: string)`:
     - If multiple values, batch create by sending a JSON array in the `params` field (actually, the Ads API batch endpoint may differ — the simplest approach is to loop and create one at a time, or use the batch params approach if the endpoint supports it).
     - For each value, POST to `accounts/${accountId}/targeting_criteria` with:
       ```
       line_item_id=li_abc123
       targeting_type=LOCATION
       targeting_value=us_country
       ```
     - Print each added criterion with `✅`
     - Print the updated targeting summary

   - `removeTargeting(targetingCriteriaId: string, accountId?: string)`:
     - Call `xApi("DELETE", "accounts/${accountId}/targeting_criteria/${targetingCriteriaId}")`
     - Print confirmation

2. Wire up in `src/cli.ts`:
   - **Browse/Search commands**:
     - `x-ads targeting locations <query>` → `searchLocations(query)`
     - `x-ads targeting interests` → `listInterests()`
     - `x-ads targeting conversations <query>` → `searchConversations(query)`
     - `x-ads targeting platforms` → `listPlatforms()`
   - **Line item targeting management**:
     - `x-ads targeting show --line-item <id> [--account <id>]` → `showTargeting(lineItemId, accountId)`
     - `x-ads targeting add --line-item <id> --type <type> --value <value> [--account <id>]`
       - `--value` can be specified multiple times: `--value us_country --value ca_country`
       - → `addTargeting(lineItemId, type, values, accountId)`
     - `x-ads targeting remove --id <targeting_criteria_id> [--account <id>]` → `removeTargeting(id, accountId)`

## Important Notes
- **Targeting is additive**: Each criterion added is a separate entity. Same-type criteria are OR'd (location A OR location B). Different types are AND'd (location AND interest).
- **No bulk update**: You can't "replace" targeting — you must delete old criteria and add new ones.
- **Age ranges**: Values are like `AGE_13_TO_24`, `AGE_25_TO_34`, `AGE_35_TO_49`, `AGE_50_TO_54`, `AGE_55_TO_64`, `AGE_65_AND_ABOVE`. Add multiple for a broader range.
- **Gender**: Values are `MALE` or `FEMALE`. Omit to target all genders.
- **Keywords**: Use `BROAD_KEYWORD`, `PHRASE_KEYWORD`, or `EXACT_KEYWORD` types with the keyword text as the value. Negative keywords use the `NEGATIVE_*` types.
- **Follower lookalikes**: `SIMILAR_TO_FOLLOWERS_OF_USER` with a Twitter handle (without @) as the value — targets users similar to another account's followers.
- **Discovery endpoints** (`targeting_criteria/locations`, etc.) are at the API root level (not under an account), but still require authentication.

## Files Created/Modified
- `src/commands/targeting.ts` (new)
- `src/cli.ts` (modified)

## Verification
```bash
npx tsc --noEmit                                              # exits 0
npx tsx src/cli.ts targeting --help                           # prints help with subcommands
npx tsx src/cli.ts targeting locations --help                  # prints help
npx tsx src/cli.ts targeting show --help                       # shows --line-item flag
npx tsx src/cli.ts targeting add --help                        # shows --line-item, --type, --value flags
```

If a valid `.env` is configured:
```bash
npx tsx src/cli.ts targeting platforms                        # lists platform options
npx tsx src/cli.ts targeting locations "Dallas"                # returns location keys
```

## Commit
```bash
git add -A
git commit -m "targeting: browse targeting options and manage criteria on line items"
```
