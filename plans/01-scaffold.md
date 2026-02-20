# Plan 01: Project Scaffold

## Goal
Set up the project skeleton: package.json, tsconfig, .gitignore, .env.example, bin entry point, and empty CLI that prints help. Establish the OAuth 1.0a API client that all commands will use.

## Steps

1. Initialize git repo: `git init`

2. Create `package.json`:
   ```json
   {
     "name": "x-ads-cli",
     "version": "0.1.0",
     "type": "module",
     "bin": {
       "x-ads": "./bin/x-ads.js"
     },
     "scripts": {
       "build": "tsc",
       "dev": "tsx src/cli.ts",
       "auth": "tsx src/auth.ts"
     },
     "dependencies": {
       "commander": "^13.1.0",
       "dotenv": "^16.4.7",
       "oauth-1.0a": "^2.2.6",
       "open": "^10.1.0"
     },
     "devDependencies": {
       "@types/node": "^22.13.4",
       "tsx": "^4.19.3",
       "typescript": "^5.7.3"
     }
   }
   ```

3. Create `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "Node16",
       "moduleResolution": "Node16",
       "outDir": "dist",
       "rootDir": "src",
       "strict": true,
       "esModuleInterop": true
     },
     "include": ["src"]
   }
   ```

4. Create `.gitignore`:
   ```
   node_modules
   dist
   .env
   ```

5. Create `.env.example`:
   ```
   X_API_KEY=
   X_API_SECRET=
   X_ACCESS_TOKEN=
   X_ACCESS_TOKEN_SECRET=
   X_AD_ACCOUNT_ID=
   ```

6. Create `bin/x-ads.js`:
   ```js
   #!/usr/bin/env node
   import "../dist/cli.js";
   ```

7. Create `src/cli.ts`:
   - Import Commander, set name to `x-ads`, description to "CLI tool for managing X (Twitter) ad campaigns", version "0.1.0"
   - No subcommands yet — just the shell
   - Call `program.parse()`

8. Create `src/config.ts`:
   - Load dotenv
   - Export `getConfig()` that reads and validates `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET` from env. Throw with a clear error message if any are missing.
   - Export `getAdAccountId(override?: string): string` that returns the ad account ID from the argument or `X_AD_ACCOUNT_ID` env var. Throw if neither is set.
   - Export `xApi(method: string, path: string, params?: Record<string, string>, body?: Record<string, string>): Promise<any>`:
     - This is the core API client. It:
       1. Reads config via `getConfig()`
       2. Builds the full URL: `https://ads-api.x.com/12/${path}` (strip leading slash from path if present)
       3. For GET requests, appends `params` as query string parameters
       4. Creates an OAuth 1.0a signature using the `oauth-1.0a` package with HMAC-SHA1:
          ```ts
          import OAuth from "oauth-1.0a";
          import crypto from "node:crypto";

          const oauth = new OAuth({
            consumer: { key: config.apiKey, secret: config.apiSecret },
            signature_method: "HMAC-SHA1",
            hash_function(baseString, key) {
              return crypto.createHmac("sha1", key).update(baseString).digest("base64");
            },
          });

          const token = { key: config.accessToken, secret: config.accessTokenSecret };
          const requestData = { url: fullUrl, method };
          const authHeader = oauth.toHeader(oauth.authorize(requestData, token));
          ```
       5. Makes the fetch request with the `Authorization` header from step 4
       6. For POST/PUT requests with a body, sends as `application/x-www-form-urlencoded` (NOT JSON — the X Ads API uses form encoding for write operations). Include the body params in the OAuth signature by passing them in `requestData.data`.
       7. Parses JSON response
       8. If the response contains `errors`, prints them and calls `process.exit(1)`
       9. Returns the parsed response (typically `{ data: [...], total_count: N, request: { params: { cursor: ... } } }`)
     - Also export `xApiFetchAllPages(method: string, path: string, params?: Record<string, string>): Promise<any[]>`:
       - Calls `xApi` in a loop, following `next_cursor` from `response.request.params.cursor` until there is no more cursor
       - Collects all `data` arrays and returns the combined result
       - The cursor parameter name is `cursor` in the query string

9. Run `npm install`

10. Verify: `npx tsx src/cli.ts --help` prints help text with no errors

11. Verify: `npx tsc --noEmit` passes with no type errors

## Important Notes
- The `oauth-1.0a` package is a pure JS implementation — no native dependencies. It handles the OAuth signature generation but does NOT make HTTP requests. We use `fetch()` for that.
- The X Ads API uses form-encoded bodies for POST/PUT, NOT JSON. The `Content-Type` header should be `application/x-www-form-urlencoded` for write operations.
- For OAuth 1.0a signing of POST requests, the body parameters MUST be included in the signature base string. The `oauth-1.0a` package handles this when you pass `data` in the request object.
- The X Ads API version is `12` (path prefix `/12/`). This is separate from the X API v2 used for tweets.
- Pagination uses `cursor` as a query parameter. The cursor value comes from `response.request.params.cursor`. When there's no next page, this field is absent or null.

## Files Created
- `package.json`
- `tsconfig.json`
- `.gitignore`
- `.env.example`
- `bin/x-ads.js`
- `src/cli.ts`
- `src/config.ts`

## Verification
```bash
npx tsx src/cli.ts --help        # exits 0, prints "x-ads" in output
npx tsc --noEmit                 # exits 0
```

## Commit
```bash
git add -A
git commit -m "scaffold: package.json, tsconfig, CLI shell, config with OAuth 1.0a client"
```
