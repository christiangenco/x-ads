import { getAdAccountId, xApi, xApiFetchAllPages, twitterApi } from "../config.js";

export async function listPromotedTweets(lineItemId?: string, accountId?: string): Promise<void> {
  const id = getAdAccountId(accountId);

  const params: Record<string, string> = {
    with_deleted: "false",
  };

  if (lineItemId) {
    params.line_item_ids = lineItemId;
  }

  const promotedTweets = await xApiFetchAllPages("GET", `accounts/${id}/promoted_tweets`, params);

  if (promotedTweets.length === 0) {
    console.log("No promoted tweets found.");
    return;
  }

  const header = [
    "ID".padEnd(22),
    "Line Item ID".padEnd(22),
    "Tweet ID".padEnd(22),
    "Status".padEnd(10),
    "Approval",
  ].join("  ");

  const separator = [
    "─".repeat(22),
    "─".repeat(22),
    "─".repeat(22),
    "─".repeat(10),
    "─".repeat(12),
  ].join("  ");

  console.log(header);
  console.log(separator);

  for (const pt of promotedTweets) {
    const row = [
      (pt.id || "").padEnd(22),
      (pt.line_item_id || "").padEnd(22),
      (pt.tweet_id || "").padEnd(22),
      (pt.entity_status || "").padEnd(10),
      pt.approval_status || "",
    ].join("  ");
    console.log(row);
  }
}

export async function promoteTweet(lineItemId: string, tweetIds: string[], accountId?: string): Promise<void> {
  const id = getAdAccountId(accountId);

  const response = await xApi("POST", `accounts/${id}/promoted_tweets`, undefined, {
    line_item_id: lineItemId,
    tweet_ids: tweetIds.join(","),
  });

  const data = Array.isArray(response.data) ? response.data : [response.data];

  console.log("✅ Promoted tweet(s):");
  for (const pt of data) {
    console.log(`  ${pt.id} → tweet ${pt.tweet_id}`);
  }
}

export async function createTweet(text: string, opts?: { cardId?: string; mediaIds?: string[] }): Promise<void> {
  const body: Record<string, any> = { text };

  if (opts?.cardId) {
    body.card_uri = `card://${opts.cardId}`;
  }

  if (opts?.mediaIds && opts.mediaIds.length > 0) {
    body.media = { media_ids: opts.mediaIds };
  }

  const response = await twitterApi("POST", "tweets", body);
  const tweetId = response.data.id;

  console.log(`✅ Created tweet: ${tweetId}`);
  console.log(`Promote it with: x-ads promoted-tweets promote --line-item <LINE_ITEM_ID> --tweet ${tweetId}`);
}

export async function removePromotedTweet(promotedTweetId: string, accountId?: string): Promise<void> {
  const id = getAdAccountId(accountId);

  await xApi("DELETE", `accounts/${id}/promoted_tweets/${promotedTweetId}`);

  console.log(`✅ Removed promoted tweet ${promotedTweetId}`);
}
