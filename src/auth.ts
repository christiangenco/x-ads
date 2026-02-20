import "dotenv/config";
import OAuth from "oauth-1.0a";
import crypto from "node:crypto";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import open from "open";
import { xApi } from "./config.js";

const REDIRECT_URI = "http://localhost:3456/callback";

export async function runAuth(): Promise<void> {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;

  if (!apiKey || !apiSecret) {
    const missing: string[] = [];
    if (!apiKey) missing.push("X_API_KEY");
    if (!apiSecret) missing.push("X_API_SECRET");
    console.error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `Copy .env.example to .env and fill in your consumer credentials.`
    );
    process.exit(1);
  }

  const oauth = new OAuth({
    consumer: { key: apiKey, secret: apiSecret },
    signature_method: "HMAC-SHA1",
    hash_function(baseString: string, key: string) {
      return crypto
        .createHmac("sha1", key)
        .update(baseString)
        .digest("base64");
    },
  });

  // Step 1: Get a request token
  const requestTokenUrl = "https://api.x.com/oauth/request_token";
  const requestData: OAuth.RequestOptions = {
    url: requestTokenUrl,
    method: "POST",
    data: { oauth_callback: REDIRECT_URI },
  };
  const authHeader = oauth.toHeader(oauth.authorize(requestData));

  const rtResponse = await fetch(requestTokenUrl, {
    method: "POST",
    headers: {
      ...authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ oauth_callback: REDIRECT_URI }).toString(),
  });

  if (!rtResponse.ok) {
    const text = await rtResponse.text();
    console.error(`Failed to get request token: ${rtResponse.status} ${text}`);
    process.exit(1);
  }

  const rtBody = new URLSearchParams(await rtResponse.text());
  const requestToken = rtBody.get("oauth_token");
  const requestTokenSecret = rtBody.get("oauth_token_secret");

  if (!requestToken || !requestTokenSecret) {
    console.error("Failed to parse request token response.");
    process.exit(1);
  }

  // Step 2: Start local callback server and open browser
  await new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url || "/", "http://localhost:3456");
      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const oauthToken = url.searchParams.get("oauth_token");
      const oauthVerifier = url.searchParams.get("oauth_verifier");

      if (!oauthToken || !oauthVerifier) {
        res.writeHead(400);
        res.end("Missing oauth_token or oauth_verifier.");
        server.close();
        reject(new Error("Missing oauth_token or oauth_verifier in callback."));
        return;
      }

      // Step 3: Exchange for permanent access tokens
      try {
        const accessTokenUrl = "https://api.x.com/oauth/access_token";
        const token = { key: requestToken!, secret: requestTokenSecret! };
        const atRequestData: OAuth.RequestOptions = {
          url: accessTokenUrl,
          method: "POST",
          data: { oauth_verifier: oauthVerifier },
        };
        const atAuthHeader = oauth.toHeader(
          oauth.authorize(atRequestData, token)
        );

        const atResponse = await fetch(accessTokenUrl, {
          method: "POST",
          headers: {
            ...atAuthHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            oauth_verifier: oauthVerifier,
          }).toString(),
        });

        if (!atResponse.ok) {
          const text = await atResponse.text();
          console.error(
            `Failed to exchange tokens: ${atResponse.status} ${text}`
          );
          res.writeHead(500);
          res.end("Failed to exchange tokens.");
          server.close();
          reject(new Error("Token exchange failed."));
          return;
        }

        const atBody = new URLSearchParams(await atResponse.text());
        const accessToken = atBody.get("oauth_token");
        const accessTokenSecret = atBody.get("oauth_token_secret");
        const screenName = atBody.get("screen_name");

        if (!accessToken || !accessTokenSecret) {
          console.error("Failed to parse access token response.");
          res.writeHead(500);
          res.end("Failed to parse access token response.");
          server.close();
          reject(new Error("Failed to parse access token response."));
          return;
        }

        // Step 4: Update .env file
        const envPath = path.resolve(process.cwd(), ".env");
        let envContent = "";
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, "utf-8");
        }

        envContent = upsertEnvVar(envContent, "X_ACCESS_TOKEN", accessToken);
        envContent = upsertEnvVar(
          envContent,
          "X_ACCESS_TOKEN_SECRET",
          accessTokenSecret
        );

        fs.writeFileSync(envPath, envContent);

        console.log(
          `✅ Authenticated as @${screenName || "unknown"}. Tokens saved to .env.`
        );

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("Success! You can close this tab.");
        server.close();
        resolve();
      } catch (err) {
        res.writeHead(500);
        res.end("Internal error.");
        server.close();
        reject(err);
      }
    });

    server.listen(3456, () => {
      const authorizeUrl = `https://api.x.com/oauth/authorize?oauth_token=${requestToken}`;
      console.log(`Opening browser to authorize...`);
      console.log(authorizeUrl);
      open(authorizeUrl);
    });
  });
}

export async function authStatus(): Promise<void> {
  try {
    const response = await xApi("GET", "accounts");
    const accounts = response.data || [];
    console.log("✅ Authenticated");
    console.log(`Accounts: ${accounts.length} ad accounts accessible`);
    for (const account of accounts) {
      const id = (account.id || "").padEnd(24);
      const name = account.name || "";
      console.log(`  ${id} ${name}`);
    }
  } catch {
    console.error(
      "❌ Authentication failed. Run `x-ads auth` to re-authenticate."
    );
    process.exit(1);
  }
}

function upsertEnvVar(content: string, key: string, value: string): string {
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  }
  // Append with a newline if content doesn't end with one
  const separator = content.length > 0 && !content.endsWith("\n") ? "\n" : "";
  return content + separator + `${key}=${value}\n`;
}
