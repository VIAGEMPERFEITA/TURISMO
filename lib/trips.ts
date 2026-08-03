export type TripInternalStatus =
  | "rascunho"
  | "demonstracao"
  | "aguardando_confirmacao"
  | "pronto_para_publicar"
  | "arquivado";

export type TripPublicStatus =
  | "inscricoes_abertas"
  | "ultimas_vagas"
  | "em_breve"
  | "lista_de_espera"
  | "esgotada"
  | "encerrada";

export type TripCategory = "religioso" | "cultural" | "personalizado";

export type ItineraryDay = {
  day: number;
  city?: string;
  title: string;
  description?: string;
  hotel?: string;
  meals?: string[];
  activities?: string[];
  transportation?: string;
  notes?: string;
};

export type Trip = {
  id: string;
  name: string;
  slug: string;
  subtitle: string;
  shortDescription: string;
  fullDescription: string;
  coverImage: string;
  gallery: string[];
  videoUrl?: string;
  primaryDestination: string;
  countries: string[];
  cities: string[];
  departureDate?: string;
  returnDate?: string;
  month?: number;
  year?: number;
  days: number;
  nights: number;
  departureCity: string;
  availableAirports: string[];
  category: TripCategory;
  tripType: string;
  leader?: string;
  coordinator?: string;
  airline?: string;
  hotelCategory?: string;
  totalSeats?: number;
  remainingSeats?: number;
  publicStatus: TripPublicStatus;
  internalStatus: TripInternalStatus;
  featured: boolean;
  published: boolean;
  price?: number;
  currency?: "BRL" | "USD" | "EUR";
  deposit?: number;
  installments?: string;
  commercialNotes?: string;
  itinerary: ItineraryDay[];
  included: string[];
  notIncluded: string[];
  optionalServices: string[];
  documentation: string[];
  faq: Array<{ question: string; answer: string }>;
  seo: { title: string; description: string; noIndex?: boolean };
  differentiator?: string;
};

export const publicStatusLabels: Record<TripPublicStatus, string> = {
  inscricoes_abertas: "Inscrições abertas",
  ultimas_vagas: "Últimas vagas",
  em_breve: "Em breve",
  lista_de_espera: "Lista de espera",
  esgotada: "Esgotada",
  encerrada: "Encerrada",
};

export const internalStatusLabels: Record<TripInternalStatus, string> = {
  rascunho: "Rascunho",
  demonstracao: "Demonstração",
  aguardando_confirmacao: "Aguardando confirmação",
  pronto_para_publicar: "Pronto para publicar",
  arquivado: "Arquivado",
};

const commonIncluded = [
  "Passagens aéreas internacionais conforme programação final",
  "Hospedagem conforme categoria informada na proposta oficial",
  "Traslados e deslocamentos previstos no roteiro final",
  "Acompanhamento conforme confirmação comercial",
];

const commonNotIncluded = [
  "Despesas pessoais e serviços opcionais",
  "Itens não indicados expressamente na proposta oficial",
  "Documentação pessoal, quando não prevista no contrato",
];

const commonDocumentation = [
  "Passaporte válido conforme regras do destino",
  "Vistos e autorizações conforme nacionalidade e roteiro",
  "Requisitos sanitários vigentes na data do embarque",
];

const commonFaq = [
  {
    question: "Quando as informações estarão disponíveis?",
    answer:
      "A página será publicada somente depois da validação de datas, serviços, valores e disponibilidade pela Viagem Perfeita Turismo.",
  },
];

type DraftTripInput = Pick<
  Trip,
  | "id"
  | "name"
  | "slug"
  | "subtitle"
  | "shortDescription"
  | "fullDescription"
  | "coverImage"
  | "gallery"
  | "primaryDestination"
  | "countries"
  | "cities"
  | "month"
  | "year"
  | "days"
  | "nights"
  | "departureCity"
  | "category"
  | "tripType"
  | "internalStatus"
  | "itinerary"
>;

function createDraftTrip(input: DraftTripInput): Trip {
  return {
    ...input,
    availableAirports: [input.departureCity],
    publicStatus: "em_breve",
    featured: false,
    published: false,
    included: commonIncluded,
    notIncluded: commonNotIncluded,
    optionalServices: [],
    documentation: commonDocumentation,
    faq: commonFaq,
    seo: {
      title: `${input.name} | Viagem Perfeita Turismo`,
      description: input.shortDescription,
      noIndex: true,
    },
  };
}

function itinerary(items: Array<[string, string]>): ItineraryDay[] {
  return items.map(([city, title], index) => ({ day: index + 1, city, title }));
}

/**
 * Fonte central de caravanas. Todos os registros abaixo são internos e não
 * confirmados. Eles permanecem fora do site público até `published` ser true e
 * o status interno ser `pronto_para_publicar`.
 */
export const trips: Trip[] = [
  createDraftTrip({
    id: "trip_israel_2027",
    name: "Israel — Caminhos da Fé",
    slug: "israel-2027",
    subtitle: "Caminhos da Fé",
    shortDescription: "Proposta interna de jornada religiosa por Israel e Roma.",
    fullDescription: "Estrutura preliminar aguardando validação comercial e operacional da Viagem Perfeita Turismo.",
    coverImage: "https://images.unsplash.com/photo-1548018560-c7196548e84d?auto=format&fit=crop&w=1800&q=88",
    gallery: ["https://images.unsplash.com/photo-1548018560-c7196548e84d?auto=format&fit=crop&w=1000&q=82"],
    primaryDestination: "Israel",
    countries: ["Israel", "Itália"],
    cities: ["Jerusalém", "Galileia", "Roma"],
    month: 9,
    year: 2027,
    days: 11,
    nights: 10,
    departureCity: "São Paulo",
    category: "religioso",
    tripType: "Caravana internacional",
    internalStatus: "demonstracao",
    itinerary: itinerary([["Roma", "Chegada e acolhimento"], ["Roma", "Roma cristã"], ["Jerusalém", "Chegada à Terra Santa"]]),
  }),
  createDraftTrip({
    id: "trip_israel_egito_2027",
    name: "Israel & Egito — Raízes do Êxodo",
    slug: "israel-egito-2027",
    subtitle: "Raízes do Êxodo",
    shortDescription: "Proposta interna conectando o Egito aos caminhos bíblicos de Israel.",
    fullDescription: "Estrutura preliminar aguardando confirmação de fornecedores, datas e condições comerciais.",
    coverImage: "https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=1800&q=88",
    gallery: ["https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=1000&q=82"],
    primaryDestination: "Egito",
    countries: ["Egito", "Israel"],
    cities: ["Cairo", "Jerusalém", "Galileia"],
    month: 11,
    year: 2027,
    days: 12,
    nights: 11,
    departureCity: "São Paulo",
    category: "religioso",
    tripType: "Caravana internacional",
    internalStatus: "demonstracao",
    itinerary: itinerary([["Cairo", "Chegada e acolhimento"], ["Cairo", "Patrimônio histórico"], ["Jerusalém", "Caminhos bíblicos"]]),
  }),
  createDraftTrip({
    id: "trip_turquia_grecia_2027",
    name: "Turquia & Grécia — Passos de Paulo",
    slug: "turquia-grecia-2027",
    subtitle: "Passos de Paulo",
    shortDescription: "Proposta interna pelos caminhos das primeiras comunidades cristãs.",
    fullDescription: "Estrutura preliminar aguardando confirmação operacional e comercial.",
    coverImage: "https://images.unsplash.com/photo-1504512485720-7d83a16ee930?auto=format&fit=crop&w=1800&q=88",
    gallery: ["https://images.unsplash.com/photo-1504512485720-7d83a16ee930?auto=format&fit=crop&w=1000&q=82"],
    primaryDestination: "Turquia e Grécia",
    countries: ["Turquia", "Grécia"],
    cities: ["Istambul", "Éfeso", "Atenas", "Corinto"],
    month: 3,
    year: 2027,
    days: 14,
    nights: 13,
    departureCity: "São Paulo",
    category: "religioso",
    tripType: "Caravana internacional",
    internalStatus: "demonstracao",
    itinerary: itinerary([["Istambul", "Chegada"], ["Éfeso", "Patrimônio histórico"], ["Atenas", "Caminhos de Paulo"]]),
  }),
  createDraftTrip({
    id: "trip_jordania_israel_2027",
    name: "Jordânia & Israel — Jornada da Promessa",
    slug: "jordania-israel-2027",
    subtitle: "Jornada da Promessa",
    shortDescription: "Rascunho interno entre Jordânia e Israel.",
    fullDescription: "Rascunho aguardando validação integral.",
    coverImage: "https://images.unsplash.com/photo-1548786811-dd6e453ccca7?auto=format&fit=crop&w=1800&q=88",
    gallery: [],
    primaryDestination: "Jordânia",
    countries: ["Jordânia", "Israel"],
    cities: ["Amã", "Petra", "Jerusalém"],
    month: 5,
    year: 2027,
    days: 13,
    nights: 12,
    departureCity: "São Paulo",
    category: "religioso",
    tripType: "Caravana internacional",
    internalStatus: "rascunho",
    itinerary: itinerary([["Amã", "Chegada"], ["Petra", "Visita prevista"], ["Jerusalém", "Chegada prevista"]]),
  }),
  createDraftTrip({
    id: "trip_italia_2027",
    name: "Itália — Caminhos de São Francisco",
    slug: "italia-2027",
    subtitle: "Caminhos de São Francisco",
    shortDescription: "Rascunho interno de viagem cultural e espiritual pela Itália.",
    fullDescription: "Rascunho aguardando validação integral.",
    coverImage: "https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1800&q=88",
    gallery: [],
    primaryDestination: "Itália",
    countries: ["Itália"],
    cities: ["Roma", "Assis", "Florença"],
    month: 6,
    year: 2027,
    days: 10,
    nights: 9,
    departureCity: "São Paulo",
    category: "religioso",
    tripType: "Caravana internacional",
    internalStatus: "rascunho",
    itinerary: itinerary([["Roma", "Chegada"], ["Assis", "Caminhos franciscanos"], ["Florença", "Patrimônio cultural"]]),
  }),
  createDraftTrip({
    id: "trip_emirados_egito_2027",
    name: "Emirados & Egito — Entre História e Futuro",
    slug: "emirados-egito-2027",
    subtitle: "Entre História e Futuro",
    shortDescription: "Rascunho interno combinando Emirados e Egito.",
    fullDescription: "Rascunho aguardando validação integral.",
    coverImage: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1800&q=88",
    gallery: [],
    primaryDestination: "Emirados Árabes Unidos",
    countries: ["Emirados Árabes Unidos", "Egito"],
    cities: ["Dubai", "Abu Dhabi", "Cairo"],
    month: 10,
    year: 2027,
    days: 13,
    nights: 12,
    departureCity: "São Paulo",
    category: "cultural",
    tripType: "Viagem cultural",
    internalStatus: "rascunho",
    itinerary: itinerary([["Dubai", "Chegada"], ["Abu Dhabi", "Experiência cultural"], ["Cairo", "Patrimônio histórico"]]),
  }),
];

export function isTripPublic(trip: Trip) {
  return trip.published && trip.internalStatus === "pronto_para_publicar";
}

export const publishedTrips = trips.filter(isTripPublic);
export const featuredTrips = publishedTrips.filter((trip) => trip.featured);

export function getTripBySlug(slug: string) {
  return trips.find((trip) => trip.slug === slug);
}

export function getPublishedTripBySlug(slug: string) {
  return publishedTrips.find((trip) => trip.slug === slug);
}

export function formatTripPeriod(trip: Trip) {
  if (trip.departureDate && trip.returnDate) {
    const formatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
    return `${formatter.format(new Date(trip.departureDate))} a ${formatter.format(new Date(trip.returnDate))}`;
  }
  if (trip.month && trip.year) {
    const month = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(trip.year, trip.month - 1, 1)));
    return `${month.charAt(0).toUpperCase()}${month.slice(1)} de ${trip.year}`;
  }
  return "Data a confirmar";
}

export function formatTripPrice(trip: Trip) {
  if (!trip.price || !trip.currency) return "Consulte valores";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: trip.currency }).format(trip.price);
}
