import { siteConfig } from "./site-config.ts";

export const companyContact = {
  whatsappNumber: siteConfig.contact.phoneInternational,
  displayNumber: siteConfig.contact.phoneDisplay,
  defaultMessage:
    "Olá! Conheci a Viagem Perfeita Turismo pelo site e gostaria de receber mais informações sobre as viagens disponíveis.",
} as const;

export function createWhatsAppLink(message: string) {
  return `https://wa.me/${companyContact.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function createTripWhatsAppMessage(tripName: string, period?: string) {
  const caravanName=normalizeCaravanName(tripName);
  const nameWithPeriod=period&&!caravanName.toLocaleLowerCase("pt-BR").includes(period.toLocaleLowerCase("pt-BR"))?`${caravanName} — ${period.toLocaleLowerCase("pt-BR")}`:caravanName;
  return `Olá! Tenho interesse na ${nameWithPeriod}. Gostaria de receber os valores, condições de pagamento e disponibilidade.`;
}

const months = "janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro";

export function normalizeCaravanName(tripName: string) {
  const name = tripName
    .trim()
    .replace(/^(?:viagem\s+)?(?:caravana\s+)+/i, "")
    .replace(new RegExp(`—\\s*(${months})\\s+de\\s+(\\d{4})$`, "i"), (_, month: string, year: string) => `— ${month.toLocaleLowerCase("pt-BR")} de ${year}`);
  return `Caravana ${name}`;
}

export type WhatsAppLead = {
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  travelers?: string;
  interest?: string;
  desiredPeriod?: string;
  accommodation?: string;
  departureCity?: string;
  paymentPreference?: string;
  notes?: string;
  groupType?: string;
  consent?: boolean;
};

export type TripContactContext = {
  tripName?: string;
  destination?: string;
  period?: string;
  duration?: string;
  status?: string;
  pageUrl?: string;
};

export function createLeadWhatsAppMessage(lead: WhatsAppLead, trip: TripContactContext = {}) {
  const lines = [trip.tripName
    ? createTripWhatsAppMessage(trip.tripName, trip.period)
    : "Olá! Gostaria de receber os valores, condições de pagamento e disponibilidade."];
  const page = trip.pageUrl || (typeof window !== "undefined" ? window.location.href : "");
  if (trip.tripName || trip.destination || trip.period || lead.desiredPeriod || page) lines.push("", "CARAVANA ESCOLHIDA");
  if (trip.tripName) lines.push(`Nome: ${normalizeCaravanName(trip.tripName)}`);
  if (trip.destination) lines.push(`Destinos: ${trip.destination}`);
  if (lead.desiredPeriod || trip.period) lines.push(`Período: ${lead.desiredPeriod || trip.period}`);
  if (trip.duration) lines.push(`Duração: ${trip.duration}`);
  if (trip.status) lines.push(`Status: ${trip.status}`);
  if (page) lines.push(`Página: ${page}`);
  if (lead.name || lead.phone || lead.email || lead.city || lead.state) lines.push("", "DADOS DO INTERESSADO");
  if (lead.name) lines.push(`Nome: ${lead.name}`);
  if (lead.phone) lines.push(`WhatsApp: ${lead.phone}`);
  if (lead.email) lines.push(`E-mail: ${lead.email}`);
  if (lead.city || lead.state) lines.push(`Cidade/UF: ${[lead.city, lead.state].filter(Boolean).join("/")}`);
  if (lead.travelers || lead.accommodation || lead.departureCity || lead.paymentPreference || lead.interest || lead.groupType || lead.notes) lines.push("", "PREFERÊNCIAS");
  if (lead.travelers) lines.push(`Quantidade de viajantes: ${lead.travelers}`);
  if (lead.accommodation) lines.push(`Acomodação: ${lead.accommodation}`);
  if (lead.departureCity) lines.push(`Cidade de embarque: ${lead.departureCity}`);
  if (lead.paymentPreference) lines.push(`Pagamento desejado: ${lead.paymentPreference}`);
  if (lead.groupType) lines.push(`Tipo de grupo: ${lead.groupType}`);
  if (lead.interest) lines.push(`Interesse: ${lead.interest}`);
  if (lead.notes) lines.push(`Observações: ${lead.notes}`);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}
