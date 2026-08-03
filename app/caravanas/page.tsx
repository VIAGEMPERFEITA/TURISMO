import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TripsCatalog } from "../../components/trips-catalog";
import { publishedTrips } from "../../lib/trips";

export const metadata: Metadata = {
  title: "Caravanas | Viagem Perfeita Turismo",
  description: "Consulte as caravanas oficialmente publicadas pela Viagem Perfeita Turismo.",
};

export default function TripsCatalogPage() {
  return <main className="catalog"><section className="catalog-hero"><div className="shell"><Link href="/"><ArrowLeft /> Voltar ao início</Link><p className="eyebrow light">Catálogo de caravanas</p><h1>Jornadas que<br/><em>transformam.</em></h1><p>Encontre viagens com propósito, acompanhamento próximo e informações validadas pela nossa equipe.</p></div></section><section className="section catalog-content"><div className="shell"><TripsCatalog trips={publishedTrips} /></div></section></main>;
}
