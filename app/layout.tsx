import type { Metadata } from "next";
import "./globals.css";
import "./contact-overrides.css";
import "./catalog.css";
import { WhatsAppFloating } from "../components/whatsapp-floating";
import { WhatsAppContactProvider } from "../components/whatsapp-contact-provider";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.viagemperfeitaturismo.com.br"),
  title: "Viagem Perfeita Turismo | Viagens de Fé e Experiências Transformadoras",
  description: "Caravanas internacionais e turismo religioso premium com acompanhamento especializado, segurança e cuidado em cada etapa.",
  keywords: ["turismo religioso", "caravana para Israel", "viagem para Israel", "Viagem Perfeita Turismo", "peregrinação"],
  openGraph: { title: "Viagem Perfeita Turismo", description: "Mais que uma viagem. Um encontro com a sua fé.", type: "website", locale: "pt_BR", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Viagem Perfeita Turismo" }] },
  twitter: { card: "summary_large_image", title: "Viagem Perfeita Turismo", description: "Mais que uma viagem. Um encontro com a sua fé.", images: ["/og.png"] },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  icons: { icon: "/brand/logo-light.jpg", apple: "/brand/logo-light.jpg" },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  const schema={"@context":"https://schema.org","@type":"TravelAgency",name:"Viagem Perfeita Turismo",url:"https://www.viagemperfeitaturismo.com.br",telephone:"+55 31 99954-7699",sameAs:["https://www.instagram.com/viagemperfeitatrip"]};
  return <html lang="pt-BR"><body><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/><WhatsAppContactProvider>{children}<WhatsAppFloating /></WhatsAppContactProvider></body></html>;
}
