import "dotenv/config";
import OAuth from "oauth-1.0a";
import crypto from "node:crypto";

interface Config {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export function getConfig(): Config {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  const missing: string[] = [];
  if (!apiKey) missing.push("X_API_KEY");
  if (!apiSecret) missing.push("X_API_SECRET");
  if (!accessToken) missing.push("X_ACCESS_TOKEN");
  if (!accessTokenSecret) missing.push("X_ACCESS_TOKEN_SECRET");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `Copy .env.example to .env and fill in your credentials.`
    );
  }

  return {
    apiKey: apiKey!,
    apiSecret: apiSecret!,
    accessToken: accessToken!,
    accessTokenSecret: accessTokenSecret!,
  };
}

export function getAdAccountId(override?: string): string {
  const id = override || process.env.X_AD_ACCOUNT_ID;
  if (!id) {
    throw new Error(
      "No ad account ID provided. Pass --account-id or set X_AD_ACCOUNT_ID in .env."
    );
  }
  return id;
}

export async function xApi(
  method: string,
  path: string,
  params?: Record<string, string>,
  body?: Record<string, string>
): Promise<any> {
  const config = getConfig();

  const cleanPath = path.replace(/^\//, "");
  let fullUrl = `https://ads-api.x.com/12/${cleanPath}`;

  if (params && method.toUpperCase() === "GET") {
    const qs = new URLSearchParams(params).toString();
    if (qs) fullUrl += `?${qs}`;
  }

  const oauth = new OAuth({
    consumer: { key: config.apiKey, secret: config.apiSecret },
    signature_method: "HMAC-SHA1",
    hash_function(baseString: string, key: string) {
      return crypto
        .createHmac("sha1", key)
        .update(baseString)
        .digest("base64");
    },
  });

  const token = { key: config.accessToken, secret: config.accessTokenSecret };

  const requestData: OAuth.RequestOptions = { url: fullUrl, method: method.toUpperCase() };
  if (body && (method.toUpperCase() === "POST" || method.toUpperCase() === "PUT")) {
    requestData.data = body;
  }

  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const fetchOptions: RequestInit = {
    method: method.toUpperCase(),
    headers: {
      ...authHeader,
    },
  };

  if (body && (method.toUpperCase() === "POST" || method.toUpperCase() === "PUT")) {
    (fetchOptions.headers as Record<string, string>)["Content-Type"] =
      "application/x-www-form-urlencoded";
    fetchOptions.body = new URLSearchParams(body).toString();
  }

  const response = await fetch(fullUrl, fetchOptions);
  const json = await response.json();

  if (json.errors) {
    for (const err of json.errors) {
      console.error(`Error: ${err.message} (code: ${err.code})`);
    }
    process.exit(1);
  }

  return json;
}

export async function twitterApi(
  method: string,
  path: string,
  jsonBody?: Record<string, any>
): Promise<any> {
  const config = getConfig();

  const cleanPath = path.replace(/^\//, "");
  const fullUrl = `https://api.x.com/2/${cleanPath}`;

  const oauth = new OAuth({
    consumer: { key: config.apiKey, secret: config.apiSecret },
    signature_method: "HMAC-SHA1",
    hash_function(baseString: string, key: string) {
      return crypto
        .createHmac("sha1", key)
        .update(baseString)
        .digest("base64");
    },
  });

  const token = { key: config.accessToken, secret: config.accessTokenSecret };

  // For JSON POST bodies, only sign URL + method (body params are NOT included in OAuth signature)
  const requestData: OAuth.RequestOptions = { url: fullUrl, method: method.toUpperCase() };
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const fetchOptions: RequestInit = {
    method: method.toUpperCase(),
    headers: {
      ...authHeader,
      "Content-Type": "application/json",
    },
  };

  if (jsonBody && (method.toUpperCase() === "POST" || method.toUpperCase() === "PUT")) {
    fetchOptions.body = JSON.stringify(jsonBody);
  }

  const response = await fetch(fullUrl, fetchOptions);
  const json = await response.json();

  if (json.errors) {
    for (const err of json.errors) {
      console.error(`Error: ${err.message || err.detail} (code: ${err.code || err.type})`);
    }
    process.exit(1);
  }

  return json;
}

export async function xApiFetchAllPages(
  method: string,
  path: string,
  params?: Record<string, string>
): Promise<any[]> {
  const allData: any[] = [];
  let cursor: string | undefined = undefined;

  while (true) {
    const reqParams: Record<string, string> = { ...params };
    if (cursor) {
      reqParams.cursor = cursor;
    }

    const response = await xApi(method, path, reqParams);

    if (response.data) {
      allData.push(...response.data);
    }

    const nextCursor = response.request?.params?.cursor;
    if (!nextCursor || nextCursor === cursor) {
      break;
    }
    cursor = nextCursor;
  }

  return allData;
}
