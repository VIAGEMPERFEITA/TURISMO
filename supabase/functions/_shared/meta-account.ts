export type MetaChannel = "instagram" | "messenger";

const settingsIds = (settings: Record<string, unknown> | null | undefined) => {
  const keys = ["page_id", "instagram_account_id", "ig_user_id", "business_account_id", "external_account_id"];
  return keys.map((key) => settings?.[key]).filter((value): value is string => typeof value === "string" && value.length > 0);
};

export async function resolveMetaChannelAccount(admin: any, channel: MetaChannel, externalId: string) {
  const direct = await admin.from("channel_accounts").select("id,organization_id,external_account_id,credential_secret_name,settings")
    .eq("channel", channel).eq("external_account_id", externalId).eq("status", "connected").maybeSingle();
  if (direct.data) return direct.data;

  const alias = await admin.from("channel_account_external_ids").select("channel_account_id")
    .eq("external_id", externalId).maybeSingle();
  if (alias.data?.channel_account_id) {
    const account = await admin.from("channel_accounts").select("id,organization_id,external_account_id,credential_secret_name,settings")
      .eq("id", alias.data.channel_account_id).eq("channel", channel).eq("status", "connected").maybeSingle();
    if (account.data) return account.data;
  }

  const candidates = await admin.from("channel_accounts").select("id,organization_id,external_account_id,credential_secret_name,settings")
    .eq("channel", channel).eq("status", "connected");
  const matching = (candidates.data || []).filter((account: any) => settingsIds(account.settings).includes(externalId));
  const account = matching.length === 1 ? matching[0] : (candidates.data?.length === 1 ? candidates.data[0] : null);
  if (!account) return null;
  await admin.from("channel_account_external_ids").upsert({
    organization_id: account.organization_id,
    channel_account_id: account.id,
    external_id: externalId,
    id_kind: "meta_webhook_entry",
    metadata: { learned_at: new Date().toISOString() },
  }, { onConflict: "channel_account_id,external_id" });
  return account;
}
