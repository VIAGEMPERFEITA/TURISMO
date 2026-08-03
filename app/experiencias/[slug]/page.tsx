import type { Metadata } from "next";
import { CalendarClock, Globe2, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHero } from "../../../components/page-hero";
import { PublicPage } from "../../../components/public-shell";
import { WhatsAppLink } from "../../../components/whatsapp-link";
import { getExperience, planningExperiences } from "../../../lib/experiences";
export const dynamicParams=false;
export function generateStaticParams(){return planningExperiences.map(({slug})=>({slug}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const e=getExperience((await params).slug);if(!e)return{robots:{index:false}};return{title:`${e.title} em planejamento | Viagem Perfeita Turismo`,description:e.description,alternates:{canonical:`/experiencias/${e.slug}`}}}
export default async function Page({params}:{params:Promise<{slug:string}>}){const e=getExperience((await params).slug);if(!e)notFound();return <PublicPage><PageHero eyebrow="Experiência em planejamento" title={e.title} description={e.description} image={e.image}/><section className="section"><div className="shell planning-detail"><div><p className="eyebrow">Lista de interesse</p><h2>Receba as informações primeiro.</h2><p>Esta experiência ainda não possui data, duração, embarque, preço ou disponibilidade confirmados. Ao cadastrar seu interesse, você informa à equipe o que procura e recebe apenas condições oficiais quando o planejamento estiver concluído.</p><div className="planning-facts"><span><CalendarClock/><b>Datas em definição</b></span><span><Globe2/><b>{e.countries.length?e.countries.join(" · "):"Destino definido com o grupo"}</b></span><span><ShieldCheck/><b>Sem condições fictícias</b></span></div></div><aside><h3>Entre na lista de interesse</h3><p>Conte suas preferências antes de continuar para o WhatsApp.</p><WhatsAppLink tripName={e.title} destination={e.destination} period="Datas em definição" initialInterest="Receber as datas primeiro" buttonText="Tenho interesse">Tenho interesse</WhatsAppLink></aside></div></section></PublicPage>}
