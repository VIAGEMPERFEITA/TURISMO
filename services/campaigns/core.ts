export type CampaignContact = {
  id: string;
  name?: string | null;
  phone?: string | null;
  consented?: boolean;
  suppressed?: boolean;
};

export type AudienceResult = {
  eligible: Array<CampaignContact & { normalizedPhone: string }>;
  withoutConsent: number;
  invalidPhone: number;
  suppressed: number;
  duplicates: number;
};

export function normalizeCampaignPhone(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return /^55[1-9][0-9]{9,10}$/.test(withCountry) ? withCountry : null;
}

export function buildEligibleAudience(contacts: CampaignContact[]): AudienceResult {
  const result: AudienceResult = { eligible: [], withoutConsent: 0, invalidPhone: 0, suppressed: 0, duplicates: 0 };
  const seen = new Set<string>();
  for (const contact of contacts) {
    const phone = normalizeCampaignPhone(contact.phone);
    if (!contact.consented) { result.withoutConsent += 1; continue; }
    if (contact.suppressed) { result.suppressed += 1; continue; }
    if (!phone) { result.invalidPhone += 1; continue; }
    if (seen.has(phone)) { result.duplicates += 1; continue; }
    seen.add(phone);
    result.eligible.push({ ...contact, normalizedPhone: phone });
  }
  return result;
}

const variablePattern = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
export function extractTemplateVariables(content: string) {
  return [...new Set([...content.matchAll(variablePattern)].map(match => match[1]))];
}

export function renderCampaignMessage(content: string, values: Record<string, string | null | undefined>) {
  const missing: string[] = [];
  const rendered = content.replace(variablePattern, (_, key: string) => {
    const value = values[key]?.trim();
    if (!value) { missing.push(key); return `{{${key}}}`; }
    return value;
  });
  return { rendered, missing: [...new Set(missing)], valid: missing.length === 0 };
}

export function campaignIdempotencyKey(campaignId: string, phone: string, version: number) {
  return `${campaignId}:${normalizeCampaignPhone(phone) ?? "invalid"}:v${version}`;
}

export const optOutExpressions = ["SAIR", "PARAR", "CANCELAR", "REMOVER", "DESCADASTRAR"] as const;
export function isOptOutMessage(value: string) {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  return optOutExpressions.some(expression => normalized === expression || normalized.startsWith(`${expression} `));
}
