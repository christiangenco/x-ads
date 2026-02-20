# Plan 11: README, Polish & npm link

## Goal
Write the full README.md, make the CLI globally installable via `npm link`, verify the entire tool works end-to-end, and update `~/tools/AGENTS.md` and `~/tools/sync.sh` with the new tool entry.

## Steps

1. Write `README.md` with the following structure (matching the meta-ads README style):

   - **Title**: `# X Ads CLI (\`x-ads\`)`
   - **One-liner**: "A command-line tool for managing X (Twitter) ad campaigns, line items, promoted tweets, and targeting."

   - **Setup** section:
     - Prerequisites: Node.js 22+, an X (Twitter) account, X Ads API access
     - Step 1: Apply for X Developer access
       - Go to [developer.x.com](https://developer.x.com)
       - Create a project and app
       - Apply for **Ads API access** (this requires a separate application — basic developer access is NOT sufficient). Link: [developer.x.com/en/docs/twitter-ads-api/getting-started](https://developer.x.com/en/docs/twitter-ads-api/getting-started)
       - Copy the API Key (Consumer Key) and API Secret (Consumer Secret) from the app settings
     - Step 2: Set up an X Ads account
       - Go to [ads.x.com](https://ads.x.com)
       - Create an ad account and add a payment method (funding instrument)
       - Note the Ad Account ID (visible in the URL or account settings)
     - Step 3: Configure callback URL
       - In the X Developer Portal, go to your app → Authentication Settings
       - Add `http://localhost:3456/callback` as a callback URL
       - Ensure the app has "Read and Write" permissions
     - Step 4: Configure `.env` → copy from `.env.example`, fill in values
     - Step 5: Run `x-ads auth` for OAuth flow
     - Step 6: Verify with `x-ads auth status`

   - **Usage** section with all commands and examples:
     - Auth: `x-ads auth`, `x-ads auth status`
     - Accounts: `x-ads accounts`
     - Funding: `x-ads funding`
     - Campaigns: list, create (with --funding and --budget), update, pause, remove
     - Line Items: list, create (with --objective, --placements, --bid), update, pause, remove
     - Promoted Tweets: list, promote, create-tweet, remove
     - Cards: list, create, update, remove
     - Media: upload
     - Targeting: locations, interests, conversations, platforms, show, add, remove
     - Audiences: list, create, remove
     - Analytics: default, per entity type, custom date range, specific IDs

   - **X Ads Hierarchy** diagram (from AGENTS.md)

   - **Comparison with Meta/Google** table:
     | Aspect | Meta Ads | Google Ads | X Ads |
     |--------|----------|------------|-------|
     | Auth | OAuth 2.0 (60-day tokens) | OAuth 2.0 (refresh tokens) | OAuth 1.0a (permanent) |
     | Structure | Campaign → Ad Set → Ad | Campaign → Ad Group → Ad | Campaign → Line Item → Promoted Tweet |
     | Objective | On Campaign | On Campaign (channel type) | On Line Item |
     | Targeting | JSON spec on Ad Set | Keywords on Ad Group | Separate criteria objects on Line Item |
     | Creative | Reusable AdCreative object | Ad text in Ad | Tweet (organic or created) + optional Card |
     | Budget unit | Cents | Micros | Micros |

   - **Development** section: dev commands, type-checking, building

   - **Gotchas** section:
     - Ads API access requires separate approval from X (not just a developer account)
     - OAuth 1.0a tokens are permanent — no need to refresh (unlike Meta's 60-day tokens)
     - Campaigns don't have objectives — objectives are on line items
     - Targeting is separate from line items (additive criteria model)
     - Promoted tweets can be organic tweets from your timeline
     - Media must be uploaded separately before creating cards
     - Budget in micros: $1 = 1,000,000 micros
     - Stats endpoint requires explicit entity IDs — can't query "all campaigns" without listing them first
     - Rate limits: 100 requests per 15-minute window for most endpoints

2. Verify `bin/x-ads.js` has correct shebang and import path:
   ```js
   #!/usr/bin/env node
   import "../dist/cli.js";
   ```

3. Run `npm run build` → verify `dist/` is populated with no errors

4. Run `npm link` so `x-ads` command works globally

5. Run all `--help` commands to verify everything is wired up:
   ```bash
   x-ads --help
   x-ads auth --help
   x-ads accounts --help
   x-ads funding --help
   x-ads campaigns --help
   x-ads campaigns list --help
   x-ads campaigns create --help
   x-ads line-items --help
   x-ads line-items create --help
   x-ads promoted-tweets --help
   x-ads promoted-tweets promote --help
   x-ads cards --help
   x-ads cards create --help
   x-ads media --help
   x-ads targeting --help
   x-ads targeting add --help
   x-ads audiences --help
   x-ads analytics --help
   ```

6. Update `~/tools/AGENTS.md`:
   - Add `x-ads` to the **Repos** table:
     ```
     | x-ads | [christiangenco/x-ads](https://github.com/christiangenco/x-ads) | main |
     ```
   - Add to the **Credential Layout** table:
     ```
     | `x-ads/.env` | x-ads | `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`, `X_AD_ACCOUNT_ID` |
     ```
   - Add a `### x-ads` section under **Tools**:
     ```markdown
     ### x-ads
     X (Twitter) ad campaign management (Node/TypeScript). See [README](https://github.com/christiangenco/x-ads).
     \`\`\`bash
     cd ~/tools/x-ads
     x-ads accounts                              # List ad accounts
     x-ads campaigns list                        # List campaigns
     x-ads campaigns create --name "Sale" --funding <ID> --budget 50
     x-ads line-items list --campaign <ID>        # List line items
     x-ads line-items create --campaign <ID> --name "Broad" --objective WEBSITE_CLICKS --bid 2
     x-ads promoted-tweets list --line-item <ID>  # List promoted tweets
     x-ads targeting show --line-item <ID>        # Show targeting
     x-ads analytics                              # Campaign performance (last 7 days)
     \`\`\`
     Credentials: `.env` (see `.env.example`).
     ```

7. Update `~/tools/sync.sh`:
   - Check the file for the repo list and add `x-ads` with repo `christiangenco/x-ads` and branch `main`

8. Initialize the git repo if not done already, add all files, and create the initial commit:
   ```bash
   cd ~/tools/x-ads
   git init
   git add -A
   git commit -m "x-ads: complete CLI for X (Twitter) ad campaign management"
   ```

## Files Created/Modified
- `README.md` (new)
- `bin/x-ads.js` (verified/fixed)
- `~/tools/AGENTS.md` (modified — add x-ads entry)
- `~/tools/sync.sh` (modified — add x-ads repo)

## Verification
```bash
cd ~/tools/x-ads
npx tsc --noEmit                    # exits 0
npm run build                       # exits 0, dist/ exists
npx tsx src/cli.ts --help           # lists all subcommands
# Count: should have 9+ top-level subcommands (auth, accounts, funding, campaigns, line-items, promoted-tweets, cards, media, targeting, audiences, analytics)
npx tsx src/cli.ts --help 2>&1 | grep -cE "^\s+\S+" | head -1   # at least 9 commands listed
```

## Commit
```bash
git add -A
git commit -m "README, polish, npm link, add to ~/tools/AGENTS.md"
```

## Post-Completion
- Create GitHub repo: `christiangenco/x-ads`
- Push: `git remote add origin git@github.com:christiangenco/x-ads.git && git push -u origin main`
- Run `x-ads auth` with real X Developer credentials to test the OAuth flow
- Run `x-ads accounts` to verify API access
- Create a test campaign → line item → promoted tweet to verify the full flow
