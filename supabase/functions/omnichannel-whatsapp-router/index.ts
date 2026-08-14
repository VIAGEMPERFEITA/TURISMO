import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
const clean=(v:unknown,n=1000)=>typeof v==="string"?v.trim().slice(0,n):"";
const digits=(v:unknown)=>clean(v,40).replace(/\D/g,"");

Deno.serve(async req=>{
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  const worker=Deno.env.get("WHATSAPP_WORKER_SECRET")||"";
  if(!worker||req.headers.get("x-worker-secret")!==worker)return json({error:"unauthorized"},401);
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!key)return json({error:"service_unavailable"},503);
  const db=createClient(url,key,{auth:{persistSession:false}});
  try{
    const input=await req.json();
    const channel=clean(input.sourceChannel,20);
    if(!["instagram","facebook","site"].includes(channel))return json({error:"invalid_channel"},400);
    const leadId=clean(input.leadId,80),conversationId=clean(input.sourceConversationId,80),messageId=clean(input.sourceMessageId,80),eventId=clean(input.sourceEventId,80);
    if(!leadId)return json({error:"lead_required"},400);
    const {data:lead,error:leadError}=await db.from("leads").select("id,organization_id,phone_normalized,phone,name").eq("id",leadId).single();
    if(leadError||!lead)return json({error:"lead_not_found"},404);
    const phone=digits(lead.phone_normalized||lead.phone);
    const consent=input.consentConfirmed===true;
    let status=!phone?"aguardando_dados":!consent?"aguardando_consentimento":"aguardando_template";
    const record={organization_id:lead.organization_id,source_channel:channel,source_conversation_id:conversationId||null,source_message_id:messageId||null,source_event_id:eventId||null,lead_id:lead.id,destination_phone:phone||null,consent_confirmed:consent,consent_confirmed_at:consent?new Date().toISOString():null,status,payload:{summary:clean(input.summary,1500)}};
    const saved=await db.from("omnichannel_handoffs").insert(record).select("id").single();
    if(saved.error?.code==="23505"){
      let lookup=db.from("omnichannel_handoffs").select("id,status").eq("organization_id",lead.organization_id).eq("source_channel",channel);
      lookup=eventId?lookup.eq("source_event_id",eventId):lookup.eq("source_message_id",messageId);
      const existing=await lookup.maybeSingle();
      if(existing.data)return json({handoffId:existing.data.id,status:existing.data.status,duplicate:true});
    }
    if(saved.error)throw saved.error;
    const handoffId=saved.data.id;
    if(status!=="aguardando_template")return json({handoffId,status});
    const {data:account}=await db.from("whatsapp_accounts").select("id,organization_id").eq("organization_id",lead.organization_id).in("status",["ativo","teste"]).limit(1).maybeSingle();
    const {data:template}=await db.from("whatsapp_templates").select("id,name,language_code,components").eq("organization_id",lead.organization_id).eq("status","aprovado").eq("purpose","omnichannel_handoff").limit(1).maybeSingle();
    if(!account||!template)return json({handoffId,status});
    let {data:conversation}=await db.from("conversations").select("id,whatsapp_account_id,contact_wa_id").eq("organization_id",lead.organization_id).eq("lead_id",lead.id).eq("channel","whatsapp").order("updated_at",{ascending:false}).limit(1).maybeSingle();
    if(!conversation){
      const made=await db.from("conversations").insert({organization_id:lead.organization_id,lead_id:lead.id,channel:"whatsapp",whatsapp_account_id:account.id,contact_wa_id:phone,status:"ia_ativa",control_mode:"ia",ai_managed:true,last_message_at:new Date().toISOString()}).select("id,whatsapp_account_id,contact_wa_id").single();
      if(made.error)throw made.error;conversation=made.data;
    }else if(conversation.whatsapp_account_id!==account.id||conversation.contact_wa_id!==phone){
      await db.from("conversations").update({whatsapp_account_id:account.id,contact_wa_id:phone,updated_at:new Date().toISOString()}).eq("id",conversation.id);
    }
    const payload={type:"template",template:{name:template.name,language:{code:template.language_code||"pt_BR"},components:template.components||[]}};
    const message=await db.from("messages").insert({conversation_id:conversation.id,direction:"saida",message_type:"template",body:`Modelo ${template.name}`,delivery_status:"pendente",whatsapp_account_id:account.id,provider:"meta_whatsapp",author_type:"sistema",metadata:{handoff_id:handoffId,source_channel:channel}}).select("id").single();
    if(message.error)throw message.error;
    const out=await db.from("whatsapp_outbound_messages").insert({organization_id:lead.organization_id,whatsapp_account_id:account.id,conversation_id:conversation.id,message_id:message.data.id,author_type:"sistema",message_type:"template",recipient_wa_id:phone,payload,template_id:template.id,idempotency_key:`omnichannel:${handoffId}`,status:"pendente"}).select("id").single();
    if(out.error)throw out.error;
    status="enfileirado";
    await db.from("omnichannel_handoffs").update({status,updated_at:new Date().toISOString()}).eq("id",handoffId);
    fetch(`${url}/functions/v1/whatsapp-dispatch`,{method:"POST",headers:{Authorization:`Bearer ${key}`,apikey:key,"x-worker-secret":worker,"Content-Type":"application/json"},body:JSON.stringify({outboundId:out.data.id})}).catch(()=>{});
    return json({handoffId,status,outboundId:out.data.id});
  }catch(error){return json({error:"routing_failed",detail:error instanceof Error?error.message:"unknown"},500)}
});
