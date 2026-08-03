import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TripsCatalog } from "../../components/trips-catalog";
import { publishedTrips } from "../../lib/trips";
import { PublicPage } from "../../components/public-shell";

export const metadata: Metadata = {
  title: "Caravanas | Viagem Perfeita Turismo",
  description: "Consulte as caravanas oficialmente publicadas pela Viagem Perfeita Turismo.",
  alternates: { canonical: "/caravanas" },
};

export default function TripsCatalogPage() {
  return <PublicPage><div className="catalog"><section className="catalog-hero"><div className="shell"><Link href="/"><ArrowLeft /> Voltar ao início</Link><p className="eyebrow light">Catálogo contínuo de caravanas</p><h1>Próximas<br/><em>saídas.</em></h1><p>Escolha sua próxima jornada e viva experiências que unem fé, história, cultura e propósito.</p></div></section><section className="section catalog-content"><div className="shell"><TripsCatalog trips={publishedTrips} /></div></section></div></PublicPage>;
}
