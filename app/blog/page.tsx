import type { Metadata } from "next";
import { BasicContentPage } from "../../components/basic-content-page";
export const metadata:Metadata={title:"Blog | Viagem Perfeita Turismo",description:"Conteúdos sobre turismo religioso, destinos e preparação de viagens.",robots:{index:false,follow:true}};
export default function Page(){return <BasicContentPage eyebrow="Conteúdo" title="Informação para viajar melhor." description="A área editorial está preparada para conteúdos oficiais da Viagem Perfeita."><div className="catalog-empty"><h2>Publicações em preparação.</h2><p>Em breve: Israel, turismo religioso, passaporte, vistos, segurança e dicas de viagem. Nenhum artigo sem revisão será indexado.</p></div></BasicContentPage>}
