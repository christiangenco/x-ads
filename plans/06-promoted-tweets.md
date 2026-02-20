# Plan 06: Promoted Tweets

## Goal
Implement promoted tweet management — promoting existing tweets and creating ads-only tweets for promotion. A promoted tweet ties a tweet to a line item, making it the actual ad unit that users see.

## Context
- X Ads API: `GET /12/accounts/:account_id/promoted_tweets` — list promoted tweets
- X Ads API: `POST /12/accounts/:account_id/promoted_tweets` — promote a tweet (tie it to a line item)
- X Ads API: `DELETE /12/accounts/:account_id/promoted_tweets/:promoted_tweet_id` — un-promote a tweet
- X API v2: `POST https://api.x.com/2/tweets` — create a new tweet (for ads-only tweets)
- Promoted tweet fields: `id`, `line_item_id`, `tweet_id`, `entity_status` (ACTIVE, PAUSED), `created_at`, `deleted`, `approval_status` (ACCEPTED, REJECTED, UNDER_REVIEW)
- Two approaches to creating ads:
  1. **Promote an existing tweet**: The tweet already exists on the user's timeline. Just link it to a line item.
  2. **Create an ads-only tweet**: Create a tweet via the API with `nullcast=true` (won't appear on timeline) and then promote it. Note: In the v2 API, this is done by creating a tweet normally, then it only appears in ads.
- The promoted_tweets endpoint accepts `tweet_ids` (comma-separated) to promote multiple tweets at once to a single line item.

## Steps

1. Create `src/commands/promoted-tweets.ts`:

   - `listPromotedTweets(lineItemId?: string, accountId?: string)`:
     - Get account ID from argument or `getAdAccountId()`
     - Call `xApiFetchAllPages("GET", "accounts/${accountId}/promoted_tweets", params)` with `with_deleted=false` and optionally `line_item_ids=${lineItemId}`
     - Print a formatted table:
       ```
       ID                    Line Item ID          Tweet ID              Status    Approval
       ────────────────────  ────────────────────  ────────────────────  ────────  ──────────
       pt_abc123             li_xyz789             1234567890123456789   ACTIVE    ACCEPTED
       pt_def456             li_xyz789             9876543210987654321   PAUSED    UNDER_REVIEW
       ```
     - If no promoted tweets found, print: `No promoted tweets found.`

   - `promoteTweet(lineItemId: string, tweetIds: string[], accountId?: string)`:
     - Call `xApi("POST", "accounts/${accountId}/promoted_tweets", undefined, { line_item_id: lineItemId, tweet_ids: tweetIds.join(",") })`
     - Print each created promoted tweet ID with `✅`:
       ```
       ✅ Promoted tweet(s):
         pt_abc123 → tweet 1234567890123456789
         pt_def456 → tweet 9876543210987654321
       ```

   - `createTweet(text: string, opts?: { cardId?: string, mediaIds?: string[], asUserId?: string })`:
     - This creates a tweet via the X API v2 (`POST https://api.x.com/2/tweets`)
     - Note: This endpoint uses JSON body (NOT form-encoded like the Ads API). Set `Content-Type: application/json`.
     - Build the request body:
       ```json
       {
         "text": "Check out our summer sale! https://example.com",
         "card_uri": "card://1234567890"  // optional, if cardId provided
       }
       ```
     - If `mediaIds` provided, include `"media": { "media_ids": ["id1", "id2"] }`
     - The OAuth 1.0a signing still applies — sign the request with the same consumer + user tokens. For JSON POST bodies, the body params are NOT included in the OAuth signature (only form-encoded params are). Just sign the URL + method.
     - Print the created tweet ID: `✅ Created tweet: 1234567890123456789`
     - Note: The tweet will appear on the user's timeline. To make it ads-only, the user should promote it and then delete the organic tweet, OR use the promoted-only tweet feature if available on their account.

   - `removePromotedTweet(promotedTweetId: string, accountId?: string)`:
     - Call `xApi("DELETE", "accounts/${accountId}/promoted_tweets/${promotedTweetId}")`
     - Print confirmation: `✅ Removed promoted tweet pt_abc123`

2. Wire up in `src/cli.ts`:
   - `x-ads promoted-tweets list [--line-item <id>] [--account <id>]`
   - `x-ads promoted-tweets promote --line-item <id> --tweet <tweet_id> [--account <id>]`
     - `--tweet` can be specified multiple times or comma-separated: `--tweet 123,456` or `--tweet 123 --tweet 456`
   - `x-ads promoted-tweets create-tweet --text "..." [--card <card_id>] [--media <media_id,...>] [--account <id>]`
     - This creates a tweet but does NOT promote it. The user must then run `promote` separately. Print a hint: `Promote it with: x-ads promoted-tweets promote --line-item <LINE_ITEM_ID> --tweet <TWEET_ID>`
   - `x-ads promoted-tweets remove --id <id> [--account <id>]`

## Important Notes
- **Two-step process**: Creating an ad on X is (1) have a tweet, (2) promote it to a line item. This is different from Meta (where the creative is a separate reusable object) and Google (where ad text is part of the ad object).
- **Tweet IDs are numeric strings** (large integers like `1234567890123456789`), NOT the same format as X Ads entity IDs.
- **The X API v2 tweets endpoint** (`https://api.x.com/2/tweets`) is separate from the Ads API (`https://ads-api.x.com/12/`). It uses JSON bodies, not form-encoded. The `xApi` helper from config.ts should NOT be used for this — create a separate `twitterApi` helper or handle it inline, signing with the same OAuth credentials but using JSON content type.
- **Approval**: After promoting a tweet, X reviews it. The `approval_status` will be `UNDER_REVIEW` initially, then `ACCEPTED` or `REJECTED`. Ads won't serve until accepted.
- **`tweet_ids` plural**: The create promoted tweet endpoint accepts multiple tweet IDs at once, all assigned to the same line item.

## Files Created/Modified
- `src/commands/promoted-tweets.ts` (new)
- `src/cli.ts` (modified)
- `src/config.ts` (modified — add a `twitterApi` helper for v2 tweet endpoints that uses JSON body and the base URL `https://api.x.com/2/`, or handle the signing difference inline in the command)

## Verification
```bash
npx tsc --noEmit                                              # exits 0
npx tsx src/cli.ts promoted-tweets --help                     # prints help
npx tsx src/cli.ts promoted-tweets promote --help             # shows --line-item and --tweet flags
npx tsx src/cli.ts promoted-tweets create-tweet --help        # shows --text flag
npx tsx src/cli.ts promoted-tweets list --help                # shows --line-item flag
```

If a valid `.env` is configured:
```bash
npx tsx src/cli.ts promoted-tweets list                       # lists promoted tweets or prints "No promoted tweets found"
```

## Commit
```bash
git add -A
git commit -m "promoted-tweets: promote existing tweets and create new ones for ads"
```
