export type Trip = {
  slug: string;
  title: string;
  shortTitle: string;
  destination: string;
  period: string;
  days: string;
  departure: string;
  status: "Demonstração" | "Rascunho";
  image: string;
  gallery: string[];
  description: string;
  itinerary: string[];
  included: string[];
  notIncluded: string[];
  faq: Array<[string, string]>;
};

const commonIncluded = [
  "Passagens aéreas internacionais conforme programação",
  "Hospedagem em hotéis selecionados com café da manhã",
  "Traslados e deslocamentos em veículo executivo",
  "Guia especializado em português",
  "Ingressos para visitas previstas no roteiro",
  "Acompanhamento da equipe Viagem Perfeita",
];

const commonNotIncluded = [
  "Despesas pessoais e serviços opcionais",
  "Refeições e bebidas não mencionadas no roteiro",
  "Documentação, passaporte e vistos quando aplicáveis",
  "Excesso de bagagem e alterações solicitadas pelo viajante",
];

const commonFaq: Array<[string, string]> = [
  ["As informações desta página já estão confirmadas?", "Não. Esta caravana está marcada como demonstração. Datas, serviços, valores e disponibilidade serão revisados pela Viagem Perfeita antes da publicação comercial."],
  ["A viagem terá acompanhamento em português?", "A estrutura demonstrativa prevê coordenação brasileira e guias locais em português. A confirmação constará no contrato final da viagem."],
  ["Como recebo valores e condições?", "Preencha o formulário de interesse. A equipe entrará em contato pelo WhatsApp com as informações oficiais e atualizadas."],
];

export const trips: Trip[] = [
  {
    slug: "israel-2027", title: "Israel — Caminhos da Fé", shortTitle: "Caminhos da Fé", destination: "Israel + Roma", period: "Setembro de 2027", days: "11 dias", departure: "São Paulo", status: "Demonstração",
    image: "https://images.unsplash.com/photo-1548018560-c7196548e84d?auto=format&fit=crop&w=1800&q=88",
    gallery: ["https://images.unsplash.com/photo-1548018560-c7196548e84d?auto=format&fit=crop&w=1000&q=82","https://images.unsplash.com/photo-1526481280695-3c687fd643ed?auto=format&fit=crop&w=1000&q=82","https://images.unsplash.com/photo-1547483238-2cbf881a559f?auto=format&fit=crop&w=1000&q=82"],
    description: "Uma jornada demonstrativa pelos cenários centrais da história cristã, combinando a contemplação de Roma com experiências culturais e espirituais na Galileia e em Jerusalém.",
    itinerary: ["Roma — chegada e acolhimento","Roma cristã e Vaticano","Tel Aviv e Cesareia Marítima","Nazaré, Caná e Monte Tabor","Mar da Galileia e Cafarnaum","Rio Jordão e Mar Morto","Jerusalém — Monte das Oliveiras","Via Dolorosa e Santo Sepulcro"], included: commonIncluded, notIncluded: commonNotIncluded, faq: commonFaq,
  },
  {
    slug: "israel-egito-2027", title: "Israel & Egito — Raízes do Êxodo", shortTitle: "Raízes do Êxodo", destination: "Egito + Israel", period: "Novembro de 2027", days: "12 dias", departure: "São Paulo", status: "Demonstração",
    image: "https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=1800&q=88",
    gallery: ["https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=1000&q=82","https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?auto=format&fit=crop&w=1000&q=82","https://images.unsplash.com/photo-1548018560-c7196548e84d?auto=format&fit=crop&w=1000&q=82"],
    description: "Uma proposta demonstrativa que conecta o legado do Egito aos caminhos bíblicos de Israel, com narrativa histórica, visitas guiadas e momentos de espiritualidade.",
    itinerary: ["Cairo e boas-vindas","Pirâmides de Gizé e Museu Egípcio","Cairo histórico","Travessia para Israel","Mar Morto e Jericó","Galileia e Cafarnaum","Nazaré e Caná","Jerusalém antiga","Monte das Oliveiras e Getsêmani"], included: commonIncluded, notIncluded: commonNotIncluded, faq: commonFaq,
  },
  {
    slug: "turquia-grecia-2027", title: "Turquia & Grécia — Passos de Paulo", shortTitle: "Passos de Paulo", destination: "Turquia + Grécia", period: "Março de 2027", days: "14 dias", departure: "São Paulo", status: "Demonstração",
    image: "https://images.unsplash.com/photo-1504512485720-7d83a16ee930?auto=format&fit=crop&w=1800&q=88",
    gallery: ["https://images.unsplash.com/photo-1504512485720-7d83a16ee930?auto=format&fit=crop&w=1000&q=82","https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1000&q=82","https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=82"],
    description: "Uma experiência demonstrativa pelos caminhos das primeiras comunidades cristãs, atravessando paisagens da Turquia e sítios históricos da Grécia.",
    itinerary: ["Istambul — chegada","Istambul histórica","Capadócia","Éfeso e Casa de Maria","Travessia para a Grécia","Tessalônica e Bereia","Meteora","Delfos","Atenas e Corinto"], included: commonIncluded, notIncluded: commonNotIncluded, faq: commonFaq,
  },
  {
    slug: "jordania-israel-2027", title: "Jordânia & Israel — Jornada da Promessa", shortTitle: "Jornada da Promessa", destination: "Jordânia + Israel", period: "Maio de 2027", days: "13 dias", departure: "São Paulo", status: "Rascunho",
    image: "https://images.unsplash.com/photo-1548786811-dd6e453ccca7?auto=format&fit=crop&w=1800&q=88",
    gallery: ["https://images.unsplash.com/photo-1548786811-dd6e453ccca7?auto=format&fit=crop&w=1000&q=82","https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?auto=format&fit=crop&w=1000&q=82","https://images.unsplash.com/photo-1548018560-c7196548e84d?auto=format&fit=crop&w=1000&q=82"],
    description: "Rascunho de uma jornada entre Petra, o deserto de Wadi Rum e os lugares essenciais da Terra Santa.",
    itinerary: ["Amã — chegada","Monte Nebo e Madaba","Petra","Wadi Rum","Travessia para Israel","Galileia","Nazaré","Mar Morto","Jerusalém"], included: commonIncluded, notIncluded: commonNotIncluded, faq: commonFaq,
  },
  {
    slug: "italia-2027", title: "Itália — Caminhos de São Francisco", shortTitle: "Caminhos de São Francisco", destination: "Itália", period: "Junho de 2027", days: "10 dias", departure: "São Paulo", status: "Rascunho",
    image: "https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1800&q=88",
    gallery: ["https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1000&q=82","https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1000&q=82","https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?auto=format&fit=crop&w=1000&q=82"],
    description: "Rascunho de uma viagem cultural e espiritual por Roma, Assis e cidades que preservam importantes capítulos da história cristã.",
    itinerary: ["Roma — chegada","Roma antiga","Vaticano","Assis","Cássia","Florença","Orvieto","Roma — despedida"], included: commonIncluded, notIncluded: commonNotIncluded, faq: commonFaq,
  },
  {
    slug: "emirados-egito-2027", title: "Emirados & Egito — Entre História e Futuro", shortTitle: "Entre História e Futuro", destination: "Dubai + Abu Dhabi + Egito", period: "Outubro de 2027", days: "13 dias", departure: "São Paulo", status: "Rascunho",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1800&q=88",
    gallery: ["https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1000&q=82","https://images.unsplash.com/photo-1512632578888-169bbbc64f33?auto=format&fit=crop&w=1000&q=82","https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=1000&q=82"],
    description: "Rascunho de uma experiência que combina arquitetura contemporânea, cultura árabe e a grandiosidade histórica do Egito.",
    itinerary: ["Dubai — chegada","Dubai contemporânea","Abu Dhabi","Deserto dos Emirados","Cairo","Pirâmides de Gizé","Museu Egípcio","Cairo histórico","Retorno ao Brasil"], included: commonIncluded, notIncluded: commonNotIncluded, faq: commonFaq,
  },
];

export const featuredTrips = trips.slice(0, 3);

export function getTripBySlug(slug: string) {
  return trips.find((trip) => trip.slug === slug);
}
