import { notFound } from "next/navigation";
import { AdminDashboard } from "../../../components/admin-dashboard";
import { AdminModule } from "../../../components/admin-module";
import { AdminPlaceholder } from "../../../components/admin-placeholder";
import { AdminShell } from "../../../components/admin-shell";
import { PipelineBoard } from "../../../components/pipeline-board";
import { AdminCaravans } from "../../../components/admin-caravans";
import { AdminIdentity } from "../../../components/admin-identity";
import { WhatsAppInbox } from "../../../components/whatsapp-inbox";

const modules=["dashboard","atendimento","leads","pipeline","tarefas","caravanas","clientes","reservas","pagamentos","documentos","equipe","relatorios","configuracoes","identidade","experiencias","destinos","faqs","artigos","midias","depoimentos","lideres","parceiros"];
export const dynamicParams=false;
export function generateStaticParams(){return modules.map(module=>({module}))}
export default async function Page({params}:{params:Promise<{module:string}>}){const{module}=await params;if(!modules.includes(module))notFound();const title=module.charAt(0).toUpperCase()+module.slice(1);let content;if(module==="dashboard")content=<AdminDashboard/>;else if(module==="atendimento")content=<WhatsAppInbox/>;else if(module==="pipeline")content=<PipelineBoard/>;else if(module==="caravanas")content=<AdminCaravans/>;else if(module==="identidade")content=<AdminIdentity/>;else if(["relatorios","configuracoes"].includes(module))content=<AdminPlaceholder title={title} description={module==="relatorios"?"Relatórios respeitam filtros, papéis e exportações autorizadas.":"Dados empresariais, pipeline, mensagens, integrações e privacidade ficam centralizados aqui."}/>;else content=<AdminModule module={module}/>;return <AdminShell title={title}>{content}</AdminShell>}
