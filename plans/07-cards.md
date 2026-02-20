# Plan 07: Website Cards & Media Upload

## Goal
Implement website card management and the media upload helper. Cards are rich ad formats (image + title + URL + CTA) that can be attached to tweets to create more engaging ads. Media upload is required for creating cards with images.

## Context
- X Ads API: `GET /12/accounts/:account_id/cards/website` — list website cards
- X Ads API: `POST /12/accounts/:account_id/cards/website` — create a website card
- X Ads API: `PUT /12/accounts/:account_id/cards/website/:card_id` — update
- X Ads API: `DELETE /12/accounts/:account_id/cards/website/:card_id` — delete
- Media Upload API: `POST https://upload.twitter.com/1.1/media/upload.json` — upload images/videos
- Website card fields:
  - `name` (required) — card name (internal label)
  - `website_title` (required) — title displayed on the card (max 70 chars)
  - `website_url` (required) — destination URL
  - `media_key` (required) — reference to uploaded media (from media upload)
  - `media_url` — read-only URL to the media
  - `id`, `card_uri`, `created_at`, `updated_at`, `deleted`
- The `card_uri` returned after creation (like `card://1234567890`) is what you pass to the tweet creation endpoint to attach the card.
- Media upload is a multi-step chunked upload process:
  1. `INIT` — declare the upload (total bytes, media type)
  2. `APPEND` — upload chunks (up to 5MB each)
  3. `FINALIZE` — signal upload complete
  4. (Optional) `STATUS` — poll for processing status (videos only)

## Steps

1. Add a media upload helper to `src/config.ts` (or create `src/media.ts`):

   - `uploadMedia(filePath: string): Promise<string>` — returns the `media_key` (prefixed form like `13_1234567890`)
     1. Read the file from disk, get its size and determine MIME type from extension:
        - `.jpg`/`.jpeg` → `image/jpeg`
        - `.png` → `image/png`
        - `.gif` → `image/gif`
        - `.mp4` → `video/mp4`
        - `.webp` → `image/webp`
     2. **INIT**: POST to `https://upload.twitter.com/1.1/media/upload.json` with form body:
        ```
        command=INIT
        total_bytes=<file_size>
        media_type=image/jpeg
        media_category=tweet_image
        ```
        - For ads, use `media_category=tweet_image` (images) or `tweet_video` (videos)
        - Response: `{ "media_id": 1234567890, "media_id_string": "1234567890", ... }`
        - Save `media_id_string`
     3. **APPEND**: POST chunks to the same endpoint. For images under 5MB, one chunk is fine:
        ```
        command=APPEND
        media_id=1234567890
        segment_index=0
        media_data=<base64_encoded_chunk>
        ```
        - Or use multipart form data with the raw binary in a `media` field
        - For files > 5MB, split into 5MB chunks and increment `segment_index`
     4. **FINALIZE**: POST:
        ```
        command=FINALIZE
        media_id=1234567890
        ```
        - Response includes `processing_info` for videos (with `state`: `pending`, `in_progress`, `succeeded`, `failed`)
        - For images, processing is usually instant
     5. If video and `processing_info.state` is not `succeeded`, poll `STATUS`:
        ```
        command=STATUS
        media_id=1234567890
        ```
        - Wait `processing_info.check_after_secs` seconds between polls
        - Continue until `state` is `succeeded` or `failed`
     6. Return the `media_key` — this is typically `"13_" + media_id_string` for images or `"7_" + media_id_string` for videos. However, the exact format can vary. The safest approach is to return `media_id_string` and let the card creation endpoint handle it. Actually, the website card endpoint uses `media_key` which comes from the upload response or can be constructed. Check the finalize response for a `media_key` field; if not present, use `media_id_string` directly in the card creation.
   
   - Note: The upload endpoint at `upload.twitter.com` uses the SAME OAuth 1.0a credentials. Sign requests the same way as the Ads API calls but with a different base URL.

2. Create `src/commands/cards.ts`:

   - `listCards(accountId?: string)`:
     - Call `xApiFetchAllPages("GET", "accounts/${accountId}/cards/website", { with_deleted: "false" })`
     - Print a formatted table:
       ```
       ID                    Name                  Title                 URL                             Card URI
       ────────────────────  ────────────────────  ────────────────────  ──────────────────────────────  ──────────────────────
       abc123                Summer Sale Card      50% Off Everything    https://example.com/sale        card://1234567890
       ```
     - If none found, print: `No website cards found.`

   - `createWebsiteCard(opts, accountId?: string)`:
     - Required: `name`, `title` (→ `website_title`), `url` (→ `website_url`), `imagePath`
     - Steps:
       1. Upload the image using `uploadMedia(imagePath)` → get `media_key`
       2. POST to `accounts/${accountId}/cards/website` with form body:
          ```
          name=Summer+Sale+Card
          website_title=50%25+Off+Everything
          website_url=https://example.com/sale
          media_key=13_1234567890
          ```
     - Print created card ID and `card_uri`:
       ```
       ✅ Created website card: abc123
          Card URI: card://1234567890
          Attach to a tweet with: x-ads promoted-tweets create-tweet --text "Check it out!" --card card://1234567890
       ```

   - `updateCard(cardId, opts, accountId?)`:
     - Optional: `name`, `title`, `url`
     - Call `xApi("PUT", "accounts/${accountId}/cards/website/${cardId}", undefined, body)`
     - Print confirmation

   - `removeCard(cardId, accountId?)`:
     - Call `xApi("DELETE", "accounts/${accountId}/cards/website/${cardId}")`
     - Print confirmation

3. Add a standalone media upload command:
   - `uploadMediaCommand(filePath: string)`:
     - Calls `uploadMedia(filePath)`
     - Prints: `✅ Uploaded media: media_key=13_1234567890`

4. Wire up in `src/cli.ts`:
   - `x-ads cards list [--account <id>]`
   - `x-ads cards create --name <name> --title <title> --url <url> --image <path> [--account <id>]`
   - `x-ads cards update --id <id> [--name <n>] [--title <t>] [--url <u>] [--account <id>]`
   - `x-ads cards remove --id <id> [--account <id>]`
   - `x-ads media upload <path>` — standalone media upload, prints the media_key/media_id

## Important Notes
- **Media upload uses a different base URL**: `https://upload.twitter.com/1.1/media/upload.json` — NOT the Ads API. Use the same OAuth signing but different URL.
- **Media upload uses form-encoded bodies** (or multipart for the APPEND step with binary data). The INIT and FINALIZE steps can use regular form encoding. The APPEND step should use multipart/form-data with the file chunk as binary or base64 via `media_data`.
- **`media_key` vs `media_id`**: The website card endpoint expects `media_key`. After uploading, you may need to try the `media_id_string` directly. The X API documentation is inconsistent here — some endpoints accept `media_id`, others want `media_key`. If `media_key` doesn't work with just the ID, try prefixing with `13_` (for images) or `7_` (for videos).
- **Image size limits**: Images should be < 5MB for tweet cards. Supported formats: JPEG, PNG, GIF, WEBP.
- **Card URI**: The `card_uri` field returned after card creation is what you pass to the tweet creation to attach the card.

## Files Created/Modified
- `src/commands/cards.ts` (new)
- `src/config.ts` (modified — add `uploadMedia` helper, or create `src/media.ts`)
- `src/cli.ts` (modified — add cards and media commands)

## Verification
```bash
npx tsc --noEmit                                  # exits 0
npx tsx src/cli.ts cards --help                   # prints help
npx tsx src/cli.ts cards create --help            # shows --name, --title, --url, --image flags
npx tsx src/cli.ts media --help                   # shows upload subcommand
```

If a valid `.env` is configured:
```bash
npx tsx src/cli.ts cards list                     # lists cards or prints "No website cards found"
```

## Commit
```bash
git add -A
git commit -m "cards: website card CRUD with media upload"
```
