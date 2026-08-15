const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export function extractBrazilianWhatsApp(text: string): string | null {
  const match = text.match(
    /(?:\+?55[\s().-]*)?(?:\(?\d{2}\)?[\s.-]*)9\d{4}[\s.-]*\d{4}\b/,
  );
  if (!match) return null;

  const digits = match[0].replace(/\D/g, "");
  if (digits.length === 11) return `55${digits}`;
  if (digits.length === 13 && digits.startsWith("55")) return digits;
  return null;
}

export function hasExplicitWhatsAppConsent(text: string): boolean {
  const value = normalize(text);
  if (
    /\b(nao autorizo|nao quero|nao aceito|nao concordo|nao pode)\b/.test(
      value,
    )
  ) {
    return false;
  }

  return /\b(sim|autorizo|aceito|concordo|pode continuar|pode me chamar|quero continuar)\b/.test(
    value,
  );
}

type CaptureConsentInput = {
  organizationId: string;
  leadId: string | null;
  conversationId: string;
  text: string;
  source: string;
};

export async function captureWhatsAppConsent(
  admin: any,
  input: CaptureConsentInput,
): Promise<{ captured: boolean; phone: string | null }> {
  const phone = extractBrazilianWhatsApp(input.text);
  if (!phone || !hasExplicitWhatsAppConsent(input.text)) {
    return { captured: false, phone };
  }

  const consentAt = new Date().toISOString();
  if (input.leadId) {
    const leadResult = await admin
      .from("leads")
      .update({
        phone: `+${phone}`,
        phone_normalized: phone,
        consent: true,
        consent_at: consentAt,
      })
      .eq("id", input.leadId)
      .eq("organization_id", input.organizationId);
    if (leadResult.error) throw leadResult.error;
  }

  const conversationResult = await admin
    .from("conversations")
    .update({ consent_at: consentAt })
    .eq("id", input.conversationId)
    .eq("organization_id", input.organizationId);
  if (conversationResult.error) throw conversationResult.error;

  const consentResult = await admin.from("contact_consents").upsert(
    {
      organization_id: input.organizationId,
      phone_e164: phone,
      channel: "whatsapp",
      purpose: "commercial_service",
      source: input.source,
      granted: true,
      granted_at: consentAt,
      revoked_at: null,
      evidence: { capture_method: "explicit_phone_and_sim" },
    },
    { onConflict: "organization_id,phone_e164,channel,purpose" },
  );
  if (consentResult.error) throw consentResult.error;

  return { captured: true, phone };
}
