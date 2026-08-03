import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicPage } from "../../components/public-shell";
import { PageHero } from "../../components/page-hero";
import { destinations } from "../../lib/destinations";
export const metadata:Metadata={title:"Destinos | Viagem Perfeita Turismo",description:"Conheça destinos religiosos e culturais estudados pela Viagem Perfeita Turismo.",alternates:{canonical:"/destinos"}};
export default function Page(){return <PublicPage><PageHero eyebrow="Destinos com significado" title="Lugares que aproximam história, cultura e fé." description="Informações responsáveis para inspirar sua próxima jornada, sem datas ou condições inventadas."/><section className="section"><div className="shell destination-page-grid">{destinations.map(d=><Link href={`/destinos/${d.slug}`} key={d.slug} className="destination-page-card" style={{backgroundImage:`linear-gradient(0deg,rgba(5,28,24,.86),rgba(5,28,24,.08)),url(${d.image})`}}><div><span>Conheça</span><h2>{d.name}</h2><p>{d.headline}</p></div><ArrowRight/></Link>)}</div></section></PublicPage>}
