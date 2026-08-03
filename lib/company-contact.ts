export const companyContact = {
  whatsappNumber: "5531999547699",
  displayNumber: "(31) 99954-7699",
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
  travelers?: string;
  interest?: string;
};

export type TripContactContext = {
  tripName?: string;
  destination?: string;
  period?: string;
};

export function createLeadWhatsAppMessage(lead: WhatsAppLead, trip: TripContactContext = {}) {
  const lines = ["Olá!", "", "Conheci a Viagem Perfeita Turismo pelo site."];
  if (trip.tripName || trip.destination || trip.period) lines.push("", "Tenho interesse na seguinte viagem:", "");
  if (trip.tripName) lines.push("Caravana:", trip.tripName, "");
  if (trip.destination) lines.push("Destino:", trip.destination, "");
  if (trip.period) lines.push("Período:", trip.period, "");
  if (lead.travelers) lines.push("Quantidade de viajantes:", lead.travelers, "");
  if (lead.city) lines.push("Cidade de embarque:", lead.city, "");
  if (lead.interest) lines.push("Interesse:", "", `- ${lead.interest}`, "");
  const hasPersonalData = lead.name || lead.phone || lead.email;
  if (hasPersonalData) lines.push("Dados do interessado:", "");
  if (lead.name) lines.push("Nome:", lead.name);
  if (lead.phone) lines.push("Telefone:", lead.phone);
  if (lead.email) lines.push("E-mail:", lead.email);
  lines.push("", "Gostaria de receber atendimento.");
  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}
