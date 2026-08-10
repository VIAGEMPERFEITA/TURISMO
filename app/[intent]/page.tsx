import type {Metadata} from "next";
import {ArrowRight,CheckCircle2} from "lucide-react";
import Link from "next/link";
import {notFound} from "next/navigation";
import {BasicContentPage} from "../../components/basic-content-page";
import {WhatsAppLink} from "../../components/whatsapp-link";
import {getSearchLanding,searchLandings} from "../../lib/search-landings";

export const dynamicParams=false;
export function generateStaticParams(){return searchLandings.map(({slug})=>({intent:slug}))}
export async function generateMetadata({params}:{params:Promise<{intent:string}>}):Promise<Metadata>{const page=getSearchLanding((await params).intent);if(!page)return{};return{title:`${page.eyebrow} | Viagem Perfeita Turismo`,description:page.description,keywords:page.keywords,alternates:{canonical:`/${page.slug}`},openGraph:{title:page.title,description:page.description,type:"website"}}}

export default async function SearchLandingPage({params}:{params:Promise<{intent:string}>}){const page=getSearchLanding((await params).intent);if(!page)notFound();const schema={"@context":"https://schema.org","@type":"WebPage",name:page.title,description:page.description,url:`https://www.viagemperfeitaturismo.com.br/${page.slug}`,breadcrumb:{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Início",item:"https://www.viagemperfeitaturismo.com.br/"},{"@type":"ListItem",position:2,name:page.eyebrow,item:`https://www.viagemperfeitaturismo.com.br/${page.slug}`} ]}};return <BasicContentPage eyebrow={page.eyebrow} title={page.title} description={page.description}><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/><section className="search-landing-intro"><p>{page.intro}</p></section><div className="value-grid search-landing-grid">{page.sections.map(section=><article key={section.title}><CheckCircle2/><h2>{section.title}</h2><p>{section.text}</p></article>)}</div><section className="content-cta"><h2>Receba informações oficiais para planejar sua jornada.</h2><p>Converse com a equipe e consulte roteiro, disponibilidade, valores e condições vigentes.</p><div>{page.tripSlug?<Link className="btn ghost" href={`/caravanas/${page.tripSlug}`}>Conhecer a caravana <ArrowRight/></Link>:<Link className="btn ghost" href="/caravanas">Ver próximas caravanas <ArrowRight/></Link>}<WhatsAppLink buttonText="Falar com um consultor" tripName={page.eyebrow} initialInterest="Consultar valores">Falar com um consultor</WhatsAppLink></div></section></BasicContentPage>}
