import { getAdAccountId, xApi, xApiFetchAllPages } from "../config.js";

function formatMicros(micros: number | null | undefined): string {
  if (micros == null) return "—";
  const dollars = micros / 1_000_000;
  return "$" + dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dollarsToMicros(dollars: number): string {
  return String(Math.round(dollars * 1_000_000));
}

function formatBid(lineItem: any): string {
  if (lineItem.automatically_select_bid === true || lineItem.bid_amount_local_micro == null) {
    return "AUTO";
  }
  return formatMicros(lineItem.bid_amount_local_micro);
}

export async function listLineItems(campaignId?: string, accountId?: string): Promise<void> {
  const id = getAdAccountId(accountId);

  const params: Record<string, string> = {
    with_deleted: "false",
  };

  if (campaignId) {
    params.campaign_ids = campaignId;
  }

  const lineItems = await xApiFetchAllPages("GET", `accounts/${id}/line_items`, params);

  if (lineItems.length === 0) {
    console.log("No line items found.");
    return;
  }

  const header = [
    "ID".padEnd(22),
    "Name".padEnd(22),
    "Campaign ID".padEnd(22),
    "Objective".padEnd(19),
    "Bid".padEnd(10),
    "Status".padEnd(10),
    "Servable",
  ].join("  ");

  const separator = [
    "─".repeat(22),
    "─".repeat(22),
    "─".repeat(22),
    "─".repeat(19),
    "─".repeat(10),
    "─".repeat(10),
    "─".repeat(10),
  ].join("  ");

  console.log(header);
  console.log(separator);

  for (const li of lineItems) {
    const row = [
      (li.id || "").padEnd(22),
      (li.name || "").slice(0, 22).padEnd(22),
      (li.campaign_id || "").padEnd(22),
      (li.objective || "").padEnd(19),
      formatBid(li).padEnd(10),
      (li.entity_status || "").padEnd(10),
      String(li.servable ?? ""),
    ].join("  ");
    console.log(row);

    if (li.reasons_not_servable && li.reasons_not_servable.length > 0) {
      console.log(`${"".padEnd(22)}  ⚠ ${li.reasons_not_servable.join(", ")}`);
    }
  }
}

interface CreateLineItemOpts {
  campaign: string;
  name: string;
  objective: string;
  productType?: string;
  placements?: string;
  bid?: string;
  bidType?: string;
  autoBid?: boolean;
  status?: string;
  totalBudget?: string;
  startTime?: string;
  endTime?: string;
}

export async function createLineItem(opts: CreateLineItemOpts, accountId?: string): Promise<void> {
  const id = getAdAccountId(accountId);

  const body: Record<string, string> = {
    campaign_id: opts.campaign,
    name: opts.name,
    objective: opts.objective,
    product_type: opts.productType || "PROMOTED_TWEETS",
    placements: opts.placements || "ALL_ON_TWITTER",
    entity_status: opts.status || "PAUSED",
  };

  if (opts.autoBid) {
    body.automatically_select_bid = "true";
  } else if (opts.bid) {
    body.bid_amount_local_micro = dollarsToMicros(parseFloat(opts.bid));
  }

  if (opts.bidType) {
    body.bid_type = opts.bidType;
  }

  if (opts.totalBudget) {
    body.total_budget_amount_local_micro = dollarsToMicros(parseFloat(opts.totalBudget));
  }

  if (opts.startTime) {
    body.start_time = opts.startTime;
  }

  if (opts.endTime) {
    body.end_time = opts.endTime;
  }

  const response = await xApi("POST", `accounts/${id}/line_items`, undefined, body);
  const li = response.data;

  console.log(`✅ Line item created`);
  console.log(`   ID:           ${li.id}`);
  console.log(`   Name:         ${li.name}`);
  console.log(`   Campaign ID:  ${li.campaign_id}`);
  console.log(`   Objective:    ${li.objective}`);
  console.log(`   Product Type: ${li.product_type}`);
  console.log(`   Placements:   ${li.placements}`);
  console.log(`   Bid:          ${formatBid(li)}`);
  console.log(`   Status:       ${li.entity_status}`);
  console.log(`   Total Budget: ${formatMicros(li.total_budget_amount_local_micro)}`);
}

interface UpdateLineItemOpts {
  id: string;
  name?: string;
  status?: string;
  bid?: string;
  autoBid?: boolean;
  totalBudget?: string;
}

export async function updateLineItem(opts: UpdateLineItemOpts, accountId?: string): Promise<void> {
  const acctId = getAdAccountId(accountId);

  const body: Record<string, string> = {};

  if (opts.name) {
    body.name = opts.name;
  }

  if (opts.status) {
    body.entity_status = opts.status;
  }

  if (opts.autoBid) {
    body.automatically_select_bid = "true";
  } else if (opts.bid) {
    body.bid_amount_local_micro = dollarsToMicros(parseFloat(opts.bid));
  }

  if (opts.totalBudget) {
    body.total_budget_amount_local_micro = dollarsToMicros(parseFloat(opts.totalBudget));
  }

  if (Object.keys(body).length === 0) {
    console.error("No update fields provided. Use --name, --status, --bid, --auto-bid, or --total-budget.");
    process.exit(1);
  }

  const response = await xApi("PUT", `accounts/${acctId}/line_items/${opts.id}`, undefined, body);
  const li = response.data;

  console.log(`✅ Line item updated`);
  console.log(`   ID:           ${li.id}`);
  console.log(`   Name:         ${li.name}`);
  console.log(`   Objective:    ${li.objective}`);
  console.log(`   Bid:          ${formatBid(li)}`);
  console.log(`   Status:       ${li.entity_status}`);
}

export async function pauseLineItem(lineItemId: string, accountId?: string): Promise<void> {
  await updateLineItem({ id: lineItemId, status: "PAUSED" }, accountId);
}

export async function removeLineItem(lineItemId: string, accountId?: string): Promise<void> {
  const acctId = getAdAccountId(accountId);

  await xApi("DELETE", `accounts/${acctId}/line_items/${lineItemId}`);

  console.log(`✅ Line item ${lineItemId} removed`);
}
