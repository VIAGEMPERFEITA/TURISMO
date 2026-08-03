import type { LeadFormData } from "./lead-schema";
import { normalizePhone } from "./lead-schema";
import { getSupabaseBrowserClient } from "./supabase-client";
import type { TripContactContext } from "./company-contact";
export type LeadSaveResult={saved:boolean;duplicate?:boolean;emailStatus?:"enviado"|"falhou"|"pendente";message:string};
export async function savePublicLead(data:LeadFormData,context:TripContactContext,buttonText:string):Promise<LeadSaveResult>{
  const supabase=getSupabaseBrowserClient();
  if(!supabase)return{saved:false,message:"O registro online ainda não está configurado. Seus dados permanecem neste formulário e você pode continuar pelo WhatsApp."};
  const params=new URLSearchParams(window.location.search);
  const payload={...data,phone_normalized:normalizePhone(data.phone),experience_name:context.tripName||"Atendimento geral",destination:context.destination||null,desired_period:data.desiredPeriod||context.period||null,duration:context.duration||null,landing_page:window.location.href,referrer:document.referrer||null,source:"Site",source_detail:buttonText,utm_source:params.get("utm_source"),utm_medium:params.get("utm_medium"),utm_campaign:params.get("utm_campaign"),utm_content:params.get("utm_content"),utm_term:params.get("utm_term"),consent_at:new Date().toISOString()};
  const {data:result,error}=await supabase.rpc("upsert_public_lead",{lead_payload:payload});
  if(error)return{saved:false,message:"Não foi possível registrar agora. Revise sua conexão e tente novamente; o preenchimento não foi apagado."};
  const saved=(result as {duplicate?:boolean;notification_id?:string}|null);let emailStatus:"enviado"|"falhou"|"pendente"="pendente";
  if(saved?.notification_id){const {data,error:notifyError}=await supabase.functions.invoke("send-crm-notification",{body:{notificationId:saved.notification_id}});emailStatus=!notifyError&&data?.status==="enviado"?"enviado":notifyError||data?.status==="falhou"?"falhou":"pendente"}
  return{saved:true,duplicate:Boolean(saved?.duplicate),emailStatus,message:saved?.duplicate?"Seu cadastro já existia e o novo interesse foi registrado.":"Solicitação registrada com segurança."};
}
