import { Command } from "commander";

const program = new Command();

program
  .name("x-ads")
  .description("CLI tool for managing X (Twitter) ad campaigns")
  .version("0.1.0");

const auth = program
  .command("auth")
  .description("Authenticate with X (OAuth 1.0a)");

auth
  .command("login", { isDefault: true })
  .description("Run OAuth 1.0a 3-legged flow to obtain access tokens")
  .action(async () => {
    const { runAuth } = await import("./auth.js");
    await runAuth();
  });

auth
  .command("status")
  .description("Verify tokens work and list accessible ad accounts")
  .action(async () => {
    const { authStatus } = await import("./auth.js");
    await authStatus();
  });

program
  .command("accounts")
  .description("List accessible ad accounts")
  .action(async () => {
    const { listAccounts } = await import("./commands/accounts.js");
    await listAccounts();
  });

const funding = program
  .command("funding")
  .description("Manage funding instruments (payment methods)");

funding
  .command("list", { isDefault: true })
  .description("List funding instruments for an ad account")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { listFunding } = await import("./commands/funding.js");
    await listFunding(opts.account);
  });

const campaigns = program
  .command("campaigns")
  .description("Manage campaigns");

campaigns
  .command("list", { isDefault: true })
  .description("List campaigns for an ad account")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { listCampaigns } = await import("./commands/campaigns.js");
    await listCampaigns(opts.account);
  });

campaigns
  .command("create")
  .description("Create a new campaign")
  .requiredOption("--name <name>", "Campaign name")
  .requiredOption("--funding <id>", "Funding instrument ID")
  .option("--budget <usd>", "Daily budget in USD")
  .option("--total-budget <usd>", "Total/lifetime budget in USD")
  .option("--status <status>", "Entity status: ACTIVE, PAUSED, or DRAFT", "PAUSED")
  .option("--start-time <date>", "Start time (ISO 8601)")
  .option("--end-time <date>", "End time (ISO 8601)")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { createCampaign } = await import("./commands/campaigns.js");
    await createCampaign(opts, opts.account);
  });

campaigns
  .command("update")
  .description("Update an existing campaign")
  .requiredOption("--id <id>", "Campaign ID")
  .option("--name <name>", "New campaign name")
  .option("--status <status>", "Entity status: ACTIVE, PAUSED, or DRAFT")
  .option("--budget <usd>", "Daily budget in USD")
  .option("--total-budget <usd>", "Total/lifetime budget in USD")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { updateCampaign } = await import("./commands/campaigns.js");
    await updateCampaign(opts, opts.account);
  });

campaigns
  .command("pause")
  .description("Pause a campaign")
  .requiredOption("--id <id>", "Campaign ID")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { pauseCampaign } = await import("./commands/campaigns.js");
    await pauseCampaign(opts.id, opts.account);
  });

campaigns
  .command("remove")
  .description("Remove (soft-delete) a campaign")
  .requiredOption("--id <id>", "Campaign ID")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { removeCampaign } = await import("./commands/campaigns.js");
    await removeCampaign(opts.id, opts.account);
  });

const lineItems = program
  .command("line-items")
  .description("Manage line items (targeting containers with objectives)");

lineItems
  .command("list", { isDefault: true })
  .description("List line items for an ad account")
  .option("--campaign <id>", "Filter by campaign ID")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { listLineItems } = await import("./commands/line-items.js");
    await listLineItems(opts.campaign, opts.account);
  });

lineItems
  .command("create")
  .description("Create a new line item")
  .requiredOption("--campaign <id>", "Parent campaign ID")
  .requiredOption("--name <name>", "Line item name")
  .requiredOption("--objective <obj>", "Objective: AWARENESS, TWEET_ENGAGEMENTS, VIDEO_VIEWS, WEBSITE_CLICKS, etc.")
  .option("--product-type <type>", "Product type", "PROMOTED_TWEETS")
  .option("--placements <p1,p2>", "Placements (comma-separated)", "ALL_ON_TWITTER")
  .option("--bid <usd>", "Bid amount in USD")
  .option("--bid-type <type>", "Bid type: AUTO, MAX, or TARGET")
  .option("--auto-bid", "Use automatic bidding")
  .option("--total-budget <usd>", "Total budget in USD")
  .option("--status <status>", "Entity status: ACTIVE, PAUSED, or DRAFT", "PAUSED")
  .option("--start-time <date>", "Start time (ISO 8601)")
  .option("--end-time <date>", "End time (ISO 8601)")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { createLineItem } = await import("./commands/line-items.js");
    await createLineItem(opts, opts.account);
  });

lineItems
  .command("update")
  .description("Update an existing line item")
  .requiredOption("--id <id>", "Line item ID")
  .option("--name <name>", "New line item name")
  .option("--status <status>", "Entity status: ACTIVE, PAUSED, or DRAFT")
  .option("--bid <usd>", "Bid amount in USD")
  .option("--auto-bid", "Use automatic bidding")
  .option("--total-budget <usd>", "Total budget in USD")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { updateLineItem } = await import("./commands/line-items.js");
    await updateLineItem(opts, opts.account);
  });

lineItems
  .command("pause")
  .description("Pause a line item")
  .requiredOption("--id <id>", "Line item ID")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { pauseLineItem } = await import("./commands/line-items.js");
    await pauseLineItem(opts.id, opts.account);
  });

lineItems
  .command("remove")
  .description("Remove (soft-delete) a line item")
  .requiredOption("--id <id>", "Line item ID")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { removeLineItem } = await import("./commands/line-items.js");
    await removeLineItem(opts.id, opts.account);
  });

const promotedTweets = program
  .command("promoted-tweets")
  .description("Manage promoted tweets (ads)");

promotedTweets
  .command("list", { isDefault: true })
  .description("List promoted tweets for an ad account")
  .option("--line-item <id>", "Filter by line item ID")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { listPromotedTweets } = await import("./commands/promoted-tweets.js");
    await listPromotedTweets(opts.lineItem, opts.account);
  });

promotedTweets
  .command("promote")
  .description("Promote tweet(s) to a line item")
  .requiredOption("--line-item <id>", "Line item ID")
  .requiredOption("--tweet <ids...>", "Tweet ID(s) — repeat or comma-separate")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { promoteTweet } = await import("./commands/promoted-tweets.js");
    // Flatten comma-separated values: --tweet 123,456 --tweet 789 → ["123","456","789"]
    const tweetIds = (opts.tweet as string[]).flatMap((t: string) => t.split(",")).map((t: string) => t.trim()).filter(Boolean);
    await promoteTweet(opts.lineItem, tweetIds, opts.account);
  });

promotedTweets
  .command("create-tweet")
  .description("Create a new tweet (does NOT promote it)")
  .requiredOption("--text <text>", "Tweet text")
  .option("--card <card_id>", "Card ID to attach")
  .option("--media <media_ids>", "Media ID(s), comma-separated")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { createTweet } = await import("./commands/promoted-tweets.js");
    const mediaIds = opts.media ? (opts.media as string).split(",").map((m: string) => m.trim()).filter(Boolean) : undefined;
    await createTweet(opts.text, { cardId: opts.card, mediaIds });
  });

promotedTweets
  .command("remove")
  .description("Remove (un-promote) a promoted tweet")
  .requiredOption("--id <id>", "Promoted tweet ID")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { removePromotedTweet } = await import("./commands/promoted-tweets.js");
    await removePromotedTweet(opts.id, opts.account);
  });

const cards = program
  .command("cards")
  .description("Manage website cards");

cards
  .command("list", { isDefault: true })
  .description("List website cards for an ad account")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { listCards } = await import("./commands/cards.js");
    await listCards(opts.account);
  });

cards
  .command("create")
  .description("Create a new website card")
  .requiredOption("--name <name>", "Card name (internal label)")
  .requiredOption("--title <title>", "Website title displayed on the card (max 70 chars)")
  .requiredOption("--url <url>", "Destination URL")
  .requiredOption("--image <path>", "Path to image file (.jpg, .png, .gif, .webp)")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { createWebsiteCard } = await import("./commands/cards.js");
    await createWebsiteCard(opts, opts.account);
  });

cards
  .command("update")
  .description("Update an existing website card")
  .requiredOption("--id <id>", "Card ID")
  .option("--name <name>", "New card name")
  .option("--title <title>", "New website title")
  .option("--url <url>", "New destination URL")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { updateCard } = await import("./commands/cards.js");
    await updateCard(opts, opts.account);
  });

cards
  .command("remove")
  .description("Remove (delete) a website card")
  .requiredOption("--id <id>", "Card ID")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { removeCard } = await import("./commands/cards.js");
    await removeCard(opts.id, opts.account);
  });

const targeting = program
  .command("targeting")
  .description("Browse targeting options and manage criteria on line items");

targeting
  .command("locations <query>")
  .description("Search for location targeting options")
  .action(async (query: string) => {
    const { searchLocations } = await import("./commands/targeting.js");
    await searchLocations(query);
  });

targeting
  .command("interests")
  .description("List interest targeting categories")
  .action(async () => {
    const { listInterests } = await import("./commands/targeting.js");
    await listInterests();
  });

targeting
  .command("conversations <query>")
  .description("Search for conversation topic targeting options")
  .action(async (query: string) => {
    const { searchConversations } = await import("./commands/targeting.js");
    await searchConversations(query);
  });

targeting
  .command("platforms")
  .description("List platform targeting options")
  .action(async () => {
    const { listPlatforms } = await import("./commands/targeting.js");
    await listPlatforms();
  });

targeting
  .command("show")
  .description("Show targeting criteria for a line item")
  .requiredOption("--line-item <id>", "Line item ID")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { showTargeting } = await import("./commands/targeting.js");
    await showTargeting(opts.lineItem, opts.account);
  });

targeting
  .command("add")
  .description("Add targeting criteria to a line item")
  .requiredOption("--line-item <id>", "Line item ID")
  .requiredOption("--type <type>", "Targeting type (LOCATION, INTEREST, AGE, GENDER, etc.)")
  .requiredOption("--value <values...>", "Targeting value(s) — repeat for multiple")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { addTargeting } = await import("./commands/targeting.js");
    await addTargeting(opts.lineItem, opts.type, opts.value, opts.account);
  });

targeting
  .command("remove")
  .description("Remove a targeting criterion")
  .requiredOption("--id <id>", "Targeting criteria ID")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { removeTargeting } = await import("./commands/targeting.js");
    await removeTargeting(opts.id, opts.account);
  });

const audiences = program
  .command("audiences")
  .description("Manage tailored audiences (custom audience lists)");

audiences
  .command("list", { isDefault: true })
  .description("List tailored audiences for an ad account")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { listAudiences } = await import("./commands/audiences.js");
    await listAudiences(opts.account);
  });

audiences
  .command("create")
  .description("Create a new tailored audience container")
  .requiredOption("--name <name>", "Audience name")
  .requiredOption("--list-type <type>", "List type: EMAIL, DEVICE_ID, TWITTER_ID, HANDLE, PHONE_NUMBER")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { createAudience } = await import("./commands/audiences.js");
    await createAudience(opts.name, opts.listType, opts.account);
  });

audiences
  .command("remove")
  .description("Remove a tailored audience")
  .requiredOption("--id <id>", "Tailored audience ID")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { removeAudience } = await import("./commands/audiences.js");
    await removeAudience(opts.id, opts.account);
  });

const media = program
  .command("media")
  .description("Media upload utilities");

media
  .command("upload")
  .description("Upload a media file and print the media_key")
  .argument("<path>", "Path to media file (.jpg, .png, .gif, .webp, .mp4)")
  .action(async (filePath: string) => {
    const { uploadMediaCommand } = await import("./commands/cards.js");
    await uploadMediaCommand(filePath);
  });

program.parse();
