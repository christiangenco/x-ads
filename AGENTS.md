# x-ads-cli

CLI for managing X (Twitter) ad campaigns.

## .env

```env
X_API_KEY=                    # Consumer Key (from X Developer Portal)
X_API_SECRET=                 # Consumer Secret
X_ACCESS_TOKEN=               # User OAuth access token
X_ACCESS_TOKEN_SECRET=        # User OAuth access token secret
X_AD_ACCOUNT_ID=              # Default ad account ID
```

## CLI Usage

```bash
x-ads auth login                   # OAuth 1.0a flow → access tokens
x-ads auth status                  # Verify tokens, list accessible ad accounts

x-ads accounts                     # List accessible ad accounts

x-ads funding                      # List funding instruments (payment methods)

x-ads campaigns list [--account ID]
x-ads campaigns create --name "Sale" --funding FI_ID --budget 50
x-ads campaigns update --id 123 --name "Summer Sale" --status ACTIVE
x-ads campaigns pause --id 123
x-ads campaigns remove --id 123

x-ads line-items list [--campaign 123]
x-ads line-items create --campaign 123 --name "US Traffic" \
  --objective WEBSITE_CLICKS --bid 1.50 --bid-type AUTO
x-ads line-items update --id 456 --total-budget 200
x-ads line-items pause --id 456
x-ads line-items remove --id 456

x-ads promoted-tweets list [--line-item 456]
x-ads promoted-tweets promote --line-item 456 --tweet-ids 789,012
x-ads promoted-tweets create-tweet --text "Check this out" --line-item 456
x-ads promoted-tweets remove --id 101

x-ads cards list
x-ads cards create --name "Card" --title "Visit" --url "https://example.com" --media-key MK123
x-ads cards update --id C123 --title "New Title"
x-ads cards remove --id C123

x-ads targeting locations "New York"
x-ads targeting interests
x-ads targeting conversations "fitness"
x-ads targeting platforms
x-ads targeting show --line-item 456
x-ads targeting add --line-item 456 --type LOCATION --value "abc123"
x-ads targeting remove --id TC123

x-ads audiences list
x-ads audiences create --name "Customers" --list-type EMAIL

x-ads analytics --entity CAMPAIGN --date-range last_7d
x-ads analytics --campaign 123 --granularity DAY
x-ads analytics --line-item 456 --date-range 2026-01-01..2026-01-31

x-ads media upload ./image.jpg     # Upload media, get media_key
```

## Gotchas

- `--pretty` for human-readable output (default is JSON)
- Most commands accept `--account ID` to override `X_AD_ACCOUNT_ID`
- Budget is in dollars; API uses micro-currency internally (1 USD = 1,000,000 micros)
- Campaign objectives: `AWARENESS`, `TWEET_ENGAGEMENTS`, `VIDEO_VIEWS`, `WEBSITE_CLICKS`, `WEBSITE_CONVERSIONS`, `FOLLOWERS`, `APP_INSTALLS`, `APP_ENGAGEMENTS`, `REACH`, `PREROLL_VIEWS`
