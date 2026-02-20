# Plan 02: OAuth 1.0a Auth Flow

## Goal
Implement `x-ads auth` — a 3-legged OAuth 1.0a flow that opens the browser, lets the user authorize the app, captures the verifier via a local callback server, exchanges it for permanent access tokens, and saves them to `.env`. Also implement `x-ads auth status` to verify tokens work.

## Context
- X uses OAuth 1.0a (not OAuth 2.0 like Meta/Google)
- 3-legged flow: request token → browser authorization → access token
- Once obtained, OAuth 1.0a access tokens do NOT expire (unlike Meta's 60-day tokens)
- Endpoints:
  - `POST https://api.x.com/oauth/request_token` — get a temporary request token
  - Browser: `https://api.x.com/oauth/authorize?oauth_token=REQUEST_TOKEN` — user authorizes
  - `POST https://api.x.com/oauth/access_token` — exchange verifier for permanent tokens
- The request_token and access_token endpoints require OAuth 1.0a signing with just the consumer key/secret (no user token yet for request_token)

## Steps

1. Create `src/auth.ts`:

   - `runAuth()`:
     1. Read `X_API_KEY` and `X_API_SECRET` from env (exit with error if missing)
     2. Start a local HTTP server on port 3456
     3. Request a temporary token:
        - Sign a POST request to `https://api.x.com/oauth/request_token` with OAuth 1.0a using ONLY the consumer key/secret (no user token). Include `oauth_callback=http://localhost:3456/callback` in the OAuth parameters.
        - The `oauth-1.0a` package can sign this: create the OAuth instance with consumer credentials, call `oauth.authorize({ url, method: "POST", data: { oauth_callback: REDIRECT_URI } })` without a token parameter, then build the Authorization header with `oauth.toHeader(...)`.
        - Parse the response body (it's form-encoded: `oauth_token=XXX&oauth_token_secret=YYY&oauth_callback_confirmed=true`)
        - Save the `oauth_token_secret` temporarily (needed for the access_token exchange)
     4. Open browser to `https://api.x.com/oauth/authorize?oauth_token=REQUEST_TOKEN`
     5. On `/callback`, extract `oauth_token` and `oauth_verifier` from query params
     6. Exchange for permanent tokens:
        - Sign a POST request to `https://api.x.com/oauth/access_token` with the consumer key/secret AND the request token (from step 3). Include `oauth_verifier` in the request body.
        - Parse response body (form-encoded: `oauth_token=XXX&oauth_token_secret=YYY&user_id=ZZZ&screen_name=NAME`)
     7. Update `.env` file:
        - Read existing `.env` content
        - Replace or append `X_ACCESS_TOKEN=...` and `X_ACCESS_TOKEN_SECRET=...`
        - Write back to disk
     8. Print success message: `✅ Authenticated as @screen_name. Tokens saved to .env.`
     9. Respond to browser with "Success! You can close this tab."
     10. Close server

   - `authStatus()`:
     1. Call `xApi("GET", "accounts")` (from config.ts) — this is the simplest Ads API call to verify tokens work
     2. If successful, print:
        - `✅ Authenticated`
        - `Accounts: N ad accounts accessible`
        - List each account ID and name
     3. If it fails with a 401, print: `❌ Authentication failed. Run \`x-ads auth\` to re-authenticate.`
     4. Note: Unlike Meta tokens, X OAuth 1.0a tokens don't expire, so there's no expiry date to show

2. Wire up in `src/cli.ts`:
   - Add an `auth` command group:
     - `x-ads auth` (default subcommand: login) → calls `runAuth()`
     - `x-ads auth login` → calls `runAuth()`
     - `x-ads auth status` → calls `authStatus()`
   - Use dynamic imports (matching meta-ads pattern):
     ```ts
     auth.command("login", { isDefault: true })
       .action(async () => {
         const { runAuth } = await import("./auth.js");
         await runAuth();
       });
     ```

## Important Notes
- OAuth 1.0a signing for the request_token step does NOT include a user token — only the consumer key/secret. The `oauth-1.0a` package handles this when you omit the token parameter from `oauth.authorize()`.
- The `oauth_callback` parameter must be included in the request_token call, otherwise X returns an error. It must match a callback URL configured in the X Developer Portal app settings.
- Response bodies from the OAuth endpoints are `application/x-www-form-urlencoded`, NOT JSON. Parse with `new URLSearchParams(responseText)`.
- The access tokens obtained are permanent — they won't expire unless the user revokes them. This is simpler than Meta's 60-day tokens.
- The X Developer Portal app must have "Read and Write" permissions and have the callback URL `http://localhost:3456/callback` configured in the app settings (under "Authentication settings" → "Callback URI").

## Files Created/Modified
- `src/auth.ts` (new)
- `src/cli.ts` (modified — add auth command)

## Verification
```bash
npx tsc --noEmit                          # exits 0
npx tsx src/cli.ts auth --help            # prints auth help
npx tsx src/cli.ts auth status            # runs without crash (will fail gracefully if no tokens — should print a clear error)
```

## Commit
```bash
git add -A
git commit -m "auth: OAuth 1.0a 3-legged flow + status check"
```
