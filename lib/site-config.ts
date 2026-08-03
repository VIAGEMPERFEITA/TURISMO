export const siteConfig = {
  name: "Viagem Perfeita Turismo",
  legalName: "VP Turismo",
  officialUrl: "https://www.viagemperfeitaturismo.com.br",
  instagram: "https://www.instagram.com/viagemperfeitatrip",
  instagramHandle: "@viagemperfeitatrip",
  business: {
    cnpj: "",
    cadastur: "",
    city: "",
    state: "",
    email: "",
    serviceHours: "Segunda a sexta, das 9h às 18h",
  },
} as const;

export const publicNavigation = [
  ["Caravanas", "/caravanas"],
  ["Destinos", "/destinos"],
  ["Quem somos", "/quem-somos"],
  ["Histórias", "/historias"],
  ["Experiências", "/caravanas-realizadas"],
  ["Contato", "/contato"],
] as const;
