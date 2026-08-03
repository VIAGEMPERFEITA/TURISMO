import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { PageHero } from "../../../components/page-hero";
import { PublicPage } from "../../../components/public-shell";
import { TripFaq } from "../../../components/trip-faq";
import { WhatsAppLink } from "../../../components/whatsapp-link";
import { destinations, getDestination } from "../../../lib/destinations";
import { planningExperiences } from "../../../lib/experiences";
export const dynamicParams=false;
export function generateStaticParams(){return destinations.map(({slug})=>({slug}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const d=getDestination((await params).slug);if(!d)return{robots:{index:false}};return{title:`${d.name} | Destinos | Viagem Perfeita Turismo`,description:d.introduction,alternates:{canonical:`/destinos/${d.slug}`}}}
export default async function Page({params}:{params:Promise<{slug:string}>}){const d=getDestination((await params).slug);if(!d)notFound();const available=planningExperiences.filter(e=>e.destinationSlugs.includes(d.slug));return <PublicPage><PageHero eyebrow="Destino" title={d.name} description={d.introduction} image={d.image}/><section className="section"><div className="shell destination-detail"><div><p className="eyebrow">Contexto histórico</p><h2>{d.headline}</h2><p>{d.history}</p><h3>Significado espiritual</h3><p>{d.spirituality}</p><h3>Principais lugares</h3><ul>{d.places.map(p=><li key={p}><MapPin/>{p}</li>)}</ul></div><aside><h3>Planejamento responsável</h3><b>Melhor período</b><p>{d.bestPeriod}</p><b>Documentação</b><p>{d.documentation}</p><WhatsAppLink destination={d.name} tripName={`Experiência em ${d.name}`} buttonText="Tenho interesse">Tenho interesse</WhatsAppLink></aside></div></section>{available.length?<section className="section related-experiences"><div className="shell"><p className="eyebrow">Em planejamento</p><h2>Experiências relacionadas</h2><div className="simple-links">{available.map(e=><a href={`/experiencias/${e.slug}`} key={e.slug}>{e.title}</a>)}</div></div></section>:null}<section className="section"><div className="shell faq-grid"><div><p className="eyebrow">Perguntas frequentes</p><h2>Antes de planejar.</h2></div><TripFaq items={d.faqs}/></div></section></PublicPage>}
