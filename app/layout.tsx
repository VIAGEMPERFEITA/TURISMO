import type { Metadata } from "next";
import "./globals.css";
import "./contact-overrides.css";
import "./catalog.css";
import "./final-adjustments.css";
import { WhatsAppFloating } from "../components/whatsapp-floating";
import { WhatsAppContactProvider } from "../components/whatsapp-contact-provider";
import { BackToTop } from "../components/back-to-top";
import { AiSiteAssistant } from "../components/ai-site-assistant";
import { siteConfig } from "../lib/site-config";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.viagemperfeitaturismo.com.br"),
  title: "Viagem Perfeita Turismo | Viagens de Fé e Experiências Transformadoras",
  description: "Caravanas internacionais e turismo religioso para Israel, Egito e Jordânia, com atendimento em Belo Horizonte e acompanhamento em grupo.",
  keywords: ["turismo religioso", "caravana para Israel", "viagem para Israel", "Viagem Perfeita Turismo", "peregrinação"],
  openGraph: { title: "Viagem Perfeita Turismo", description: "Mais que uma viagem. Um encontro com a sua fé.", type: "website", locale: "pt_BR", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Viagem Perfeita Turismo" }] },
  twitter: { card: "summary_large_image", title: "Viagem Perfeita Turismo", description: "Mais que uma viagem. Um encontro com a sua fé.", images: ["/og.png"] },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  icons: { icon: "/brand/logo-light.jpg", apple: "/brand/logo-light.jpg" },
  verification: {
    other: {
      "facebook-domain-verification": "vc4g7p9chy10sgqatzvzrzm7e93qfn",
    },
  },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  const schema={"@context":"https://schema.org","@type":["TravelAgency","Organization"],name:siteConfig.name,legalName:siteConfig.legalName,taxID:siteConfig.business.cnpj,url:siteConfig.officialUrl,telephone:siteConfig.contact.phoneE164,email:siteConfig.business.email,address:{"@type":"PostalAddress",addressLocality:siteConfig.business.city,addressRegion:siteConfig.business.state,addressCountry:"BR"},sameAs:[siteConfig.instagram,siteConfig.facebook]};
  return <html lang="pt-BR"><body><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/><WhatsAppContactProvider>{children}<BackToTop/><AiSiteAssistant/><WhatsAppFloating /></WhatsAppContactProvider></body></html>;
}
