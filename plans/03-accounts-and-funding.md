# Plan 03: Accounts & Funding Instruments

## Goal
Implement `x-ads accounts` and `x-ads funding` to list ad accounts and their funding instruments. This validates that auth + config + the API client are all working end-to-end.

## Context
- X Ads API: `GET /12/accounts` — list all ad accounts the authenticated user has access to
- X Ads API: `GET /12/accounts/:account_id/funding_instruments` — list funding instruments (payment methods) for an account
- Account fields: `id`, `name`, `approval_status` (ACCEPTED, REJECTED, PENDING, UNDER_REVIEW, CANCELED), `business_name`, `currency`, `timezone`, `created_at`, `updated_at`, `deleted` (boolean)
- Funding instrument fields: `id`, `type` (CREDIT_CARD, INSERTION_ORDER, etc.), `currency`, `credit_limit_local_micro`, `funded_amount_local_micro`, `credit_remaining_local_micro`, `start_time`, `end_time`, `deleted`
- The account ID is used in nearly every subsequent API call as a path parameter

## Steps

1. Create `src/commands/accounts.ts`:

   - `listAccounts()`:
     - Call `xApi("GET", "accounts", { with_deleted: "false" })`
     - The response shape is `{ data: [{ id, name, approval_status, business_name, currency, timezone, created_at, ... }], total_count: N }`
     - Handle pagination with `xApiFetchAllPages` (though most users will have only a few accounts)
     - Print a formatted table:
       ```
       ID                    Name                  Status      Currency  Timezone
       ────────────────────  ────────────────────  ──────────  ────────  ────────────────────
       abc123def             My Business           ACCEPTED    USD       America/Chicago
       ```
     - If no accounts found, print: `No ad accounts found. Set up an ad account at ads.x.com`

2. Create `src/commands/funding.ts`:

   - `listFunding(accountId?: string)`:
     - Get account ID from argument or `getAdAccountId()`
     - Call `xApi("GET", "accounts/${accountId}/funding_instruments", { with_deleted: "false" })`
     - Print a formatted table:
       ```
       ID                    Type          Currency  Credit Limit    Funded          Remaining
       ────────────────────  ────────────  ────────  ──────────────  ──────────────  ──────────────
       xyz789                CREDIT_CARD   USD       $10,000.00      $5,000.00       $5,000.00
       ```
     - Format micro amounts to dollars: `amount / 1_000_000`
     - If no funding instruments found, print: `No funding instruments found. Add a payment method at ads.x.com`

3. Wire up in `src/cli.ts`:
   - `x-ads accounts` → `listAccounts()`
   - `x-ads funding [list]` → `listFunding(opts.account)`
     - Default subcommand is `list`
     - Accept `--account <id>` to override `X_AD_ACCOUNT_ID`

## Important Notes
- Account IDs on X are alphanumeric strings (like `18ce54d4x5t`), NOT numeric like Meta/Google.
- Micro amounts: `1_000_000 micros = $1.00`. Use the same formatting pattern as google-ads.
- The `with_deleted` parameter defaults to `true` in the API (shows deleted entities). Always pass `false` unless the user wants to see deleted items.
- Funding instrument IDs are needed when creating campaigns — the user must specify which funding instrument to charge.

## Files Created/Modified
- `src/commands/accounts.ts` (new)
- `src/commands/funding.ts` (new)
- `src/cli.ts` (modified — add accounts and funding commands)

## Verification
```bash
npx tsc --noEmit                            # exits 0
npx tsx src/cli.ts accounts --help          # prints help
npx tsx src/cli.ts funding --help           # prints help
npx tsx src/cli.ts --help                   # shows accounts and funding in command list
```

If a valid `.env` is configured:
```bash
npx tsx src/cli.ts accounts                 # lists ad accounts or prints "No ad accounts found"
npx tsx src/cli.ts funding                  # lists funding instruments
```

## Commit
```bash
git add -A
git commit -m "accounts + funding: list ad accounts and payment methods"
```
