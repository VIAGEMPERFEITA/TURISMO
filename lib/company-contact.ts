export const companyContact = {
  whatsappNumber: "5531995285665",
  displayNumber: "(31) 99528-5665",
  defaultMessage:
    "Olá! Conheci a Viagem Perfeita Turismo pelo site e gostaria de receber mais informações sobre as viagens disponíveis.",
} as const;

export function createWhatsAppLink(message: string) {
  return `https://wa.me/${companyContact.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function createTripWhatsAppMessage(tripName: string) {
  return `Olá! Conheci a Viagem Perfeita Turismo pelo site e tenho interesse na viagem ${tripName}. Gostaria de consultar valores, disponibilidade e formas de pagamento.`;
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
  const lines = ["Olá! Conheci a Viagem Perfeita Turismo pelo site e gostaria de receber atendimento."];
  const page = trip.pageUrl || (typeof window !== "undefined" ? window.location.href : "");
  if (trip.tripName || trip.destination || trip.period || lead.desiredPeriod || page) lines.push("", "CARAVANA ESCOLHIDA");
  if (trip.tripName) lines.push(`Nome: ${trip.tripName}`);
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
  lines.push("", "Gostaria de confirmar valores, disponibilidade e condições de reserva.");
  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}
