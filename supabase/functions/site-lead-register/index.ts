import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"Content-Type":"application/json"}});
const clean=(v:unknown,n=1000)=>typeof v==="string"?v.trim().slice(0,n):"";
const norm=(v:unknown)=>clean(v,80).toLowerCase();
const phone=(v:unknown)=>clean(v,40).replace(/\D/g,"");
Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!key)return json({error:"unavailable"},503);
  const db=createClient(url,key,{auth:{persistSession:false}});
  try{
    const input=await req.json(),leadId=clean(input.leadId,80),session=clean(input.sessionId,100),kind=clean(input.eventKind,40);
    if(!leadId||!session||!["lead_saved","whatsapp_consent"].includes(kind))return json({error:"invalid_request"},400);
    const {data:lead}=await db.from("leads").select("id,organization_id,phone_normalized,email,name").eq("id",leadId).maybeSingle();if(!lead)return json({error:"not_found"},404);
    if(kind==="lead_saved"&&phone(input.phoneNormalized)!==phone(lead.phone_normalized)&&norm(input.email)!==norm(lead.email))return json({error:"identity_mismatch"},403);
    let {data:account}=await db.from("channel_accounts").select("id").eq("organization_id",lead.organization_id).eq("channel","site_chat").limit(1).maybeSingle();
    if(!account){const made=await db.from("channel_accounts").insert({organization_id:lead.organization_id,channel:"site_chat",provider:"site",name:"Site oficial",status:"connected",settings:{origin:"public_site"}}).select("id").single();if(made.error)throw made.error;account=made.data}
    let {data:identity}=await db.from("contact_identities").select("id,lead_id").eq("organization_id",lead.organization_id).eq("identity_type","site_session").eq("external_id",session).maybeSingle();
    if(kind==="whatsapp_consent"&&(!identity||identity.lead_id!==lead.id))return json({error:"session_not_registered"},403);
    if(!identity){const made=await db.from("contact_identities").insert({organization_id:lead.organization_id,lead_id:lead.id,channel_account_id:account.id,identity_type:"site_session",external_id:session,normalized_value:session,display_name:lead.name,metadata:{page_url:clean(input.pageUrl,1000)}}).select("id,lead_id").single();if(made.error)throw made.error;identity=made.data}
    let {data:conversation}=await db.from("conversations").select("id").eq("organization_id",lead.organization_id).eq("channel_account_id",account.id).eq("channel","site").eq("external_thread_id",session).maybeSingle();
    if(!conversation){const made=await db.from("conversations").insert({organization_id:lead.organization_id,lead_id:lead.id,channel:"site",channel_account_id:account.id,external_thread_id:session,status:"aberta",control_mode:"assistida",ai_managed:false,last_message_at:new Date().toISOString()}).select("id").single();if(made.error)throw made.error;conversation=made.data}
    const external=`site:${kind}:${session}:${lead.id}`;
    const social=await db.from("social_events").upsert({organization_id:lead.organization_id,channel_account_id:account.id,contact_identity_id:identity.id,event_type:`site_${kind}`,external_event_id:external,payload_redacted:{page_url:clean(input.pageUrl,600),origin:clean(input.origin,200),consent_whatsapp:input.consentWhatsApp===true},received_at:new Date().toISOString()},{onConflict:"organization_id,event_type,external_event_id",ignoreDuplicates:true}).select("id").maybeSingle();
    let messageId="";
    if(social.data){const msg=await db.from("messages").insert({conversation_id:conversation.id,direction:"entrada",message_type:"sistema",body:clean(input.message,1000)||"Interação registrada no site",external_message_id:external,provider:"site",author_type:"cliente",delivery_status:"entregue",metadata:{event_kind:kind}}).select("id").single();if(!msg.error)messageId=msg.data.id}
    if(kind==="whatsapp_consent"&&social.data){
      const worker=Deno.env.get("WHATSAPP_WORKER_SECRET")||"";
      if(worker)fetch(`${url}/functions/v1/omnichannel-whatsapp-router`,{method:"POST",headers:{Authorization:`Bearer ${key}`,apikey:key,"x-worker-secret":worker,"Content-Type":"application/json"},body:JSON.stringify({sourceChannel:"site",sourceConversationId:conversation.id,sourceMessageId:messageId,sourceEventId:social.data.id,leadId:lead.id,consentConfirmed:true,summary:"Solicitação de atendimento iniciada no site"})}).catch(()=>{});
    }
    return json({registered:true,duplicate:!social.data,conversationId:conversation.id});
  }catch(error){return json({error:"registration_failed",detail:error instanceof Error?error.message:"unknown"},500)}
});
