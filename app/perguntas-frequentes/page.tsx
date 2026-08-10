import type { Metadata } from "next";
import { BasicContentPage } from "../../components/basic-content-page";
import { TripFaq } from "../../components/trip-faq";
import { generalFaqs } from "../../lib/faqs";
export const metadata:Metadata={title:"Perguntas frequentes | Viagem Perfeita Turismo",description:"Respostas gerais para planejar sua viagem com responsabilidade.",alternates:{canonical:"/perguntas-frequentes"}};
export default function Page(){const schema={"@context":"https://schema.org","@type":"FAQPage",mainEntity:generalFaqs.map(([question,answer])=>({"@type":"Question",name:question,acceptedAnswer:{"@type":"Answer",text:answer}}))};return <BasicContentPage eyebrow="Perguntas frequentes" title="Informação clara antes de embarcar." description="Respostas gerais; condições específicas sempre devem ser confirmadas no roteiro e contrato."><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/><TripFaq items={generalFaqs}/></BasicContentPage>}
