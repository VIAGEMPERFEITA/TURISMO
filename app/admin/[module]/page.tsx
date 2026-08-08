import { notFound } from "next/navigation";
import { AdminCampaigns } from "../../../components/admin-campaigns";
import { AdminDashboard } from "../../../components/admin-dashboard";
import { AdminModule } from "../../../components/admin-module";
import { AdminPlaceholder } from "../../../components/admin-placeholder";
import { AdminShell } from "../../../components/admin-shell";
import { PipelineBoard } from "../../../components/pipeline-board";
import { AdminCaravans } from "../../../components/admin-caravans";
import { AdminIdentity } from "../../../components/admin-identity";
import { WhatsAppInbox } from "../../../components/whatsapp-inbox";
import { AdminWhatsAppConnection } from "../../../components/admin-whatsapp-connection";

const modules=["dashboard","atendimento","campanhas","leads","pipeline","tarefas","caravanas","clientes","reservas","pagamentos","documentos","equipe","relatorios","configuracoes","identidade","experiencias","destinos","faqs","artigos","midias","depoimentos","lideres","parceiros"];
export const dynamicParams=false;
export function generateStaticParams(){return modules.map(module=>({module}))}
export default async function Page({params}:{params:Promise<{module:string}>}){const{module}=await params;if(!modules.includes(module))notFound();const title=module==="campanhas"?"Campanhas e Disparos":module.charAt(0).toUpperCase()+module.slice(1);let content;if(module==="dashboard")content=<AdminDashboard/>;else if(module==="atendimento")content=<WhatsAppInbox/>;else if(module==="campanhas")content=<AdminCampaigns/>;else if(module==="pipeline")content=<PipelineBoard/>;else if(module==="caravanas")content=<AdminCaravans/>;else if(module==="identidade")content=<AdminIdentity/>;else if(module==="configuracoes")content=<AdminWhatsAppConnection/>;else if(module==="relatorios")content=<AdminPlaceholder title={title} description="Relatórios respeitam filtros, papéis e exportações autorizadas."/>;else content=<AdminModule module={module}/>;return <AdminShell title={title}>{content}</AdminShell>}
