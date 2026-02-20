# Plan 09: Tailored Audiences

## Goal
Implement tailored audience management — X's equivalent of Meta's custom audiences. These let you target specific groups of users (from email lists, website visitors, app users, etc.) and create lookalike audiences from them.

## Context
- X Ads API: `GET /12/accounts/:account_id/tailored_audiences` — list
- X Ads API: `POST /12/accounts/:account_id/tailored_audiences` — create an audience container
- X Ads API: `DELETE /12/accounts/:account_id/tailored_audiences/:audience_id` — delete
- Tailored audience fields:
  - `name` (required for create)
  - `list_type` (required for create) — `EMAIL`, `DEVICE_ID`, `TWITTER_ID`, `HANDLE`, `PHONE_NUMBER`
  - `id`, `audience_size`, `audience_type` (WEB, CRM, MOBILE, FLEXIBLE), `reasons_not_targetable`, `targetable`, `targetable_types`, `created_at`, `updated_at`, `deleted`
- To target an audience: add a targeting criterion with type `TAILORED_AUDIENCE` and the audience ID as the value
- Audience population: After creating the container, you must populate it by uploading user data. This is complex (requires hashing, batching, etc.) and is typically done via the UI or a separate upload process. This plan creates the container only.
- X also supports `TAILORED_AUDIENCE_LOOKALIKE` targeting type — once an audience is populated, you can target users similar to it without creating a separate lookalike audience object.

## Steps

1. Create `src/commands/audiences.ts`:

   - `listAudiences(accountId?: string)`:
     - Get account ID from argument or `getAdAccountId()`
     - Call `xApiFetchAllPages("GET", "accounts/${accountId}/tailored_audiences", { with_deleted: "false" })`
     - Print a formatted table:
       ```
       ID                    Name                           Type      Size        Targetable  Created
       ────────────────────  ─────────────────────────────  ────────  ──────────  ──────────  ──────────
       abc123                Newsletter Subscribers         CRM       125,000     true        2026-01-15
       def456                Website Visitors               WEB       50,000      true        2026-01-10
       ghi789                App Users                      MOBILE    0           false       2026-02-01
       ```
     - Format `audience_size` with commas
     - If `targetable` is false and `reasons_not_targetable` is present, print the reasons as a note
     - If no audiences found, print: `No tailored audiences found.`

   - `createAudience(name: string, listType: string, accountId?: string)`:
     - Call `xApi("POST", "accounts/${accountId}/tailored_audiences", undefined, { name, list_type: listType })`
     - Print created audience:
       ```
       ✅ Created tailored audience: abc123
          Name: Newsletter Subscribers
          List Type: EMAIL
          
          Next steps:
          1. Populate this audience via the X Ads UI or API upload
          2. Target it with: x-ads targeting add --line-item <ID> --type TAILORED_AUDIENCE --value abc123
          3. Or target similar users: x-ads targeting add --line-item <ID> --type TAILORED_AUDIENCE_LOOKALIKE --value abc123
       ```

   - `removeAudience(audienceId: string, accountId?: string)`:
     - Call `xApi("DELETE", "accounts/${accountId}/tailored_audiences/${audienceId}")`
     - Print confirmation: `✅ Removed tailored audience abc123`

2. Wire up in `src/cli.ts`:
   - `x-ads audiences list [--account <id>]`
   - `x-ads audiences create --name <name> --list-type <type> [--account <id>]`
     - `--list-type` choices: EMAIL, DEVICE_ID, TWITTER_ID, HANDLE, PHONE_NUMBER
   - `x-ads audiences remove --id <id> [--account <id>]`

## Important Notes
- **Audience population is out of scope**: Creating the container is simple, but populating it with user data (hashing emails, batching uploads, etc.) is complex. This plan only creates the container. Population can be done via the X Ads UI or a future enhancement.
- **Minimum audience size**: Audiences must have at least 100 users to be targetable. Until then, `targetable` will be false.
- **Lookalike targeting**: X doesn't create a separate lookalike audience object like Meta does. Instead, you use the `TAILORED_AUDIENCE_LOOKALIKE` targeting type with the original audience ID. X automatically finds similar users.
- **`list_type`**: This tells X what kind of user data the audience will contain, so it knows how to match users.
- **To use in targeting**: After the audience is populated and targetable, add a targeting criterion on a line item:
  - `x-ads targeting add --line-item <ID> --type TAILORED_AUDIENCE --value <AUDIENCE_ID>`
  - For lookalike: `x-ads targeting add --line-item <ID> --type TAILORED_AUDIENCE_LOOKALIKE --value <AUDIENCE_ID>`

## Files Created/Modified
- `src/commands/audiences.ts` (new)
- `src/cli.ts` (modified)

## Verification
```bash
npx tsc --noEmit                                    # exits 0
npx tsx src/cli.ts audiences --help                 # prints help
npx tsx src/cli.ts audiences create --help          # shows --name, --list-type flags
```

If a valid `.env` is configured:
```bash
npx tsx src/cli.ts audiences list                   # lists audiences or prints "No tailored audiences found"
```

## Commit
```bash
git add -A
git commit -m "audiences: tailored audience management"
```
