export const siteConfig = {
  name: "Viagem Perfeita Turismo",
  legalName: "VP TURISMO E EVENTOS",
  officialUrl: "https://www.viagemperfeitaturismo.com.br",
  contact: {
    phoneDisplay: "(31) 99528-5665",
    phoneInternational: "5531995285665",
    phoneE164: "+55 31 99528-5665",
    whatsappUrl: "https://wa.me/5531995285665",
  },
  instagram: "https://www.instagram.com/viagemperfeitatrip?igsh=a2F1MTV2emN2bDdi&utm_source=qr",
  instagramHandle: "@viagemperfeitatrip",
  facebook: "https://www.facebook.com/share/19QQhixwGw/?mibextid=wwXIfr",
  youtube: "",
  business: {
    cnpj: "28.279.846/0001-21",
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
  ["Depoimentos", "/depoimentos"],
  ["Quem somos", "/quem-somos"],
  ["Blog", "/blog"],
] as const;
