import { getAdAccountId, xApi, xApiFetchAllPages } from "../config.js";

function formatSize(size: number | null | undefined): string {
  if (size == null) return "—";
  return size.toLocaleString("en-US");
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return dateStr.slice(0, 10);
}

export async function listAudiences(accountId?: string): Promise<void> {
  const id = getAdAccountId(accountId);

  const audiences = await xApiFetchAllPages("GET", `accounts/${id}/tailored_audiences`, {
    with_deleted: "false",
  });

  if (audiences.length === 0) {
    console.log("No tailored audiences found.");
    return;
  }

  const header = [
    "ID".padEnd(22),
    "Name".padEnd(30),
    "Type".padEnd(10),
    "Size".padEnd(12),
    "Targetable".padEnd(12),
    "Created",
  ].join("  ");

  const separator = [
    "─".repeat(22),
    "─".repeat(30),
    "─".repeat(10),
    "─".repeat(12),
    "─".repeat(12),
    "─".repeat(10),
  ].join("  ");

  console.log(header);
  console.log(separator);

  for (const a of audiences) {
    const row = [
      (a.id || "").padEnd(22),
      (a.name || "").slice(0, 30).padEnd(30),
      (a.audience_type || "").padEnd(10),
      formatSize(a.audience_size).padEnd(12),
      String(a.targetable ?? "—").padEnd(12),
      formatDate(a.created_at),
    ].join("  ");
    console.log(row);

    if (a.targetable === false && a.reasons_not_targetable && a.reasons_not_targetable.length > 0) {
      console.log(`  ⚠ Not targetable: ${a.reasons_not_targetable.join(", ")}`);
    }
  }
}

export async function createAudience(name: string, listType: string, accountId?: string): Promise<void> {
  const id = getAdAccountId(accountId);

  const response = await xApi("POST", `accounts/${id}/tailored_audiences`, undefined, {
    name,
    list_type: listType,
  });

  const audience = response.data;

  console.log(`✅ Created tailored audience: ${audience.id}`);
  console.log(`   Name: ${audience.name}`);
  console.log(`   List Type: ${listType}`);
  console.log(``);
  console.log(`   Next steps:`);
  console.log(`   1. Populate this audience via the X Ads UI or API upload`);
  console.log(`   2. Target it with: x-ads targeting add --line-item <ID> --type TAILORED_AUDIENCE --value ${audience.id}`);
  console.log(`   3. Or target similar users: x-ads targeting add --line-item <ID> --type TAILORED_AUDIENCE_LOOKALIKE --value ${audience.id}`);
}

export async function removeAudience(audienceId: string, accountId?: string): Promise<void> {
  const id = getAdAccountId(accountId);

  await xApi("DELETE", `accounts/${id}/tailored_audiences/${audienceId}`);

  console.log(`✅ Removed tailored audience ${audienceId}`);
}
