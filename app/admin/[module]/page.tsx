import {notFound} from "next/navigation";
import {AdminAiFoundation} from "../../../components/admin-ai-foundation";
import {AdminAcquisition} from "../../../components/admin-acquisition";
import {AdminCampaigns} from "../../../components/admin-campaigns";
import {AdminCaravans} from "../../../components/admin-caravans";
import {AdminCommercialAutomation} from "../../../components/admin-commercial-automation";
import {AdminDashboard} from "../../../components/admin-dashboard";
import {AdminGoogleChecklist} from "../../../components/admin-google-checklist";
import {AdminIdentity} from "../../../components/admin-identity";
import {AdminModule} from "../../../components/admin-module";
import {AdminReports} from "../../../components/admin-reports";
import {AdminShell} from "../../../components/admin-shell";
import {AdminTeamManagement} from "../../../components/admin-team-management";
import {AdminWhatsAppConnection} from "../../../components/admin-whatsapp-connection";
import {CrmOperationalModule} from "../../../components/crm-operational-module";
import {ContentOperationalModule} from "../../../components/content-operational-module";
import {PipelineBoard} from "../../../components/pipeline-board";
import {WhatsAppInbox} from "../../../components/whatsapp-inbox";
import {AdminYoavFoundation} from "../../../components/admin-yoav-foundation";

const modules=["dashboard","atendimento","campanhas","aquisicao","leads","pipeline","automacoes","integracoes","conteudo-social","melhoria-ia","tarefas","caravanas","clientes","reservas","pagamentos","documentos","equipe","relatorios","ia","configuracoes","identidade","google","experiencias","destinos","faqs","artigos","midias","depoimentos","lideres","parceiros","precos","simulador","propostas","aprovacoes","base-de-conhecimento","ia-simulador","ia-logs","ia-configuracoes"];
export const dynamicParams=false;
export function generateStaticParams(){return modules.map(module=>({module}))}

export default async function Page({params}:{params:Promise<{module:string}>}){
 const{module}=await params;if(!modules.includes(module))notFound();
 const title=module==="ia"?"Inteligência artificial":module.charAt(0).toUpperCase()+module.slice(1).replaceAll("-"," ");
 let content;
 if(module==="dashboard")content=<AdminDashboard/>;
 else if(module==="atendimento")content=<WhatsAppInbox/>;
 else if(module==="campanhas")content=<AdminCampaigns/>;
 else if(module==="aquisicao")content=<AdminAcquisition/>;
 else if(module==="pipeline")content=<PipelineBoard/>;
 else if(["automacoes","integracoes","conteudo-social","melhoria-ia"].includes(module))content=<AdminYoavFoundation module={module as "automacoes"|"integracoes"|"conteudo-social"|"melhoria-ia"}/>;
 else if(module==="relatorios")content=<AdminReports/>;
 else if(module==="ia")content=<AdminAiFoundation/>;
 else if(["precos","simulador","propostas","aprovacoes","base-de-conhecimento","ia-simulador","ia-logs","ia-configuracoes"].includes(module))content=<AdminCommercialAutomation module={module as "precos"|"simulador"|"propostas"|"aprovacoes"|"base-de-conhecimento"|"ia-simulador"|"ia-logs"|"ia-configuracoes"}/>;
 else if(["leads","tarefas","clientes","reservas","pagamentos","documentos"].includes(module))content=<CrmOperationalModule module={module as "leads"|"tarefas"|"clientes"|"reservas"|"pagamentos"|"documentos"}/>;
 else if(["experiencias","destinos","faqs","artigos","midias","depoimentos","lideres","parceiros"].includes(module))content=<ContentOperationalModule module={module as "experiencias"|"destinos"|"faqs"|"artigos"|"midias"|"depoimentos"|"lideres"|"parceiros"}/>;
 else if(module==="caravanas")content=<AdminCaravans/>;
 else if(module==="identidade")content=<AdminIdentity/>;
 else if(module==="google")content=<AdminGoogleChecklist/>;
 else if(module==="equipe")content=<AdminTeamManagement/>;
 else if(module==="configuracoes")content=<AdminWhatsAppConnection/>;
 else content=<AdminModule module={module}/>;
 return <AdminShell title={title}>{content}</AdminShell>;
}
