import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
const clean=(value:unknown,max=2000)=>typeof value==="string"?value.trim().slice(0,max):"";

async function validSignature(raw:string,signature:string,secret:string){
  if(!signature.startsWith("sha256=")||!secret)return false;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const digest=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(raw));
  const expected=`sha256=${[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join("")}`;
  if(expected.length!==signature.length)return false;
  let mismatch=0;for(let i=0;i<expected.length;i+=1)mismatch|=expected.charCodeAt(i)^signature.charCodeAt(i);return mismatch===0;
}

function eventType(field:string,value:Record<string,unknown>){
  if(field==="comments")return "instagram_comment";
  if(field==="mentions")return "instagram_story_mention";
  const message=value?.message as Record<string,unknown>|undefined;
  if(message?.is_echo)return "instagram_echo";
  if(message?.text)return "instagram_dm";
  if(value?.referral)return "instagram_ad_referral";
  return `instagram_${clean(field,60)||"event"}`;
}

async function handleDirectMessage(admin:any,entry:any,event:any,account:any,supabaseUrl:string,serviceKey:string,workerSecret:string){
  const message=event?.message||{};
  if(message?.is_echo)return;
  const senderId=clean(event?.sender?.id,180),externalId=clean(message?.mid,220),text=clean(message?.text,4000);
  if(!senderId||!externalId)return;
  const social=await admin.from("social_events").upsert({organization_id:account.organization_id,channel_account_id:account.id,event_type:"instagram_dm",external_event_id:externalId,payload_redacted:{sender_id:senderId,text:text||null,has_media:Array.isArray(message?.attachments)},received_at:new Date().toISOString()},{onConflict:"organization_id,event_type,external_event_id",ignoreDuplicates:true}).select("id").maybeSingle();
  if(!social.data)return;
  let identityResult=await admin.from("contact_identities").select("id,lead_id,customer_id").eq("organization_id",account.organization_id).eq("identity_type","instagram").eq("external_id",senderId).maybeSingle();
  let identity:any=identityResult.data;
  if(!identity){
    const lead=await admin.from("leads").insert({organization_id:account.organization_id,name:"Contato do Instagram",phone:`instagram:${senderId}`,phone_normalized:`ig:${senderId}`,source:"Instagram",source_detail:"Direct",consent:false}).select("id").single();
    if(lead.error)throw lead.error;
    const created=await admin.from("contact_identities").insert({organization_id:account.organization_id,lead_id:lead.data.id,channel_account_id:account.id,identity_type:"instagram",external_id:senderId,normalized_value:senderId,display_name:"Contato do Instagram",metadata:{source:"instagram_direct"}}).select("id,lead_id,customer_id").single();
    if(created.error)throw created.error;identity=created.data;
  }
  await admin.from("social_events").update({contact_identity_id:identity.id}).eq("id",social.data.id);
  let conversationResult=await admin.from("conversations").select("id,lead_id,customer_id").eq("organization_id",account.organization_id).eq("channel_account_id",account.id).eq("channel","instagram").eq("external_thread_id",senderId).maybeSingle();
  let conversation:any=conversationResult.data;
  if(!conversation){
    const created=await admin.from("conversations").insert({organization_id:account.organization_id,lead_id:identity.lead_id,customer_id:identity.customer_id,channel:"instagram",channel_account_id:account.id,external_thread_id:senderId,status:"ia_ativa",control_mode:"ia",ai_managed:true,requires_human:false,customer_service_window_expires_at:new Date(Date.now()+24*60*60*1000).toISOString(),last_message_at:new Date().toISOString()}).select("id,lead_id,customer_id").single();
    if(created.error)throw created.error;conversation=created.data;
  }else await admin.from("conversations").update({last_message_at:new Date().toISOString(),customer_service_window_expires_at:new Date(Date.now()+24*60*60*1000).toISOString(),updated_at:new Date().toISOString()}).eq("id",conversation.id);
  const inbound=await admin.from("messages").insert({conversation_id:conversation.id,direction:"entrada",message_type:text?"texto":"sistema",body:text||"Mídia recebida pelo Instagram",external_message_id:externalId,provider:"meta_instagram",author_type:"cliente",delivery_status:"entregue",metadata:{instagram_sender_id:senderId}}).select("id").single();
  if(inbound.error){if(inbound.error.code==="23505")return;throw inbound.error;}
  const execution=await admin.from("social_automation_executions").insert({organization_id:account.organization_id,social_event_id:social.data.id,contact_identity_id:identity.id,channel_account_id:account.id,conversation_id:conversation.id,source_message_id:inbound.data.id,status:"queued",current_step:"ai_queued",messaging_window_expires_at:new Date(Date.now()+24*60*60*1000).toISOString(),input_redacted:{event_type:"instagram_dm",sender_id:senderId}}).select("id").single();
  if(execution.error){if(execution.error.code==="23505")return;throw execution.error;}
  if(text&&workerSecret)fetch(`${supabaseUrl}/functions/v1/instagram-ai-orchestrator`,{method:"POST",headers:{Authorization:`Bearer ${serviceKey}`,apikey:serviceKey,"x-worker-secret":workerSecret,"Content-Type":"application/json"},body:JSON.stringify({executionId:execution.data.id})}).catch(()=>{});
}

Deno.serve(async request=>{
  const url=new URL(request.url);
  if(request.method==="GET"){
    const token=Deno.env.get("META_INSTAGRAM_VERIFY_TOKEN")||"";
    if(url.searchParams.get("hub.mode")==="subscribe"&&token&&url.searchParams.get("hub.verify_token")===token)
      return new Response(url.searchParams.get("hub.challenge")||"",{status:200});
    return json({error:"verification_failed"},403);
  }
  if(request.method!=="POST")return json({error:"method_not_allowed"},405);
  const raw=await request.text();
  if(!await validSignature(raw,request.headers.get("x-hub-signature-256")||"",Deno.env.get("META_INSTAGRAM_APP_SECRET")||""))
    return json({error:"invalid_signature"},401);
  const supabaseUrl=Deno.env.get("SUPABASE_URL"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!supabaseUrl||!serviceKey)return json({error:"service_unavailable"},503);
  const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false}});
  const workerSecret=Deno.env.get("WHATSAPP_WORKER_SECRET")||"";
  try{
    const payload=JSON.parse(raw);
    if(payload?.object!=="instagram")return json({received:true,ignored:true});
    for(const entry of payload.entry||[]){
      const accountExternalId=clean(entry.id,160);
      const {data:account}=await admin.from("channel_accounts").select("id,organization_id").eq("channel","instagram").eq("external_account_id",accountExternalId).eq("status","connected").maybeSingle();
      if(!account)continue;
      for(const event of entry.messaging||[])await handleDirectMessage(admin,entry,event,account,supabaseUrl,serviceKey,workerSecret);
      for(const change of entry.changes||[]){
      const value=change.value||{},field=clean(change.field,80),type=eventType(field,value);
      const senderId=clean(value?.sender?.id||value?.from?.id||value?.user_id,180);
      const externalId=clean(value?.message?.mid||value?.id||`${entry.time}:${field}:${senderId}`,220);
      const inserted=await admin.from("social_events").upsert({organization_id:account.organization_id,channel_account_id:account.id,event_type:type,external_event_id:externalId,payload_redacted:{field,sender_id:senderId,media_id:clean(value?.media?.id,180),text:clean(value?.message?.text||value?.text,1000)},received_at:new Date().toISOString()},{onConflict:"organization_id,event_type,external_event_id",ignoreDuplicates:true}).select("id").maybeSingle();
      if(!inserted.data||type==="instagram_echo")continue;
      if(senderId){
        const identity=await admin.from("contact_identities").select("id,lead_id").eq("organization_id",account.organization_id).eq("identity_type","instagram").eq("external_id",senderId).maybeSingle();
        if(identity.data)await admin.from("social_events").update({contact_identity_id:identity.data.id}).eq("id",inserted.data.id);
      }
      const {data:flows}=await admin.from("automation_flows").select("id,active_version").eq("organization_id",account.organization_id).eq("channel","instagram").eq("trigger_type",type).eq("status","active");
      for(const flow of flows||[])await admin.from("social_automation_executions").insert({organization_id:account.organization_id,flow_id:flow.id,social_event_id:inserted.data.id,status:"queued",current_step:"evaluate_trigger",messaging_window_expires_at:new Date(Date.now()+24*60*60*1000).toISOString(),input_redacted:{event_type:type,sender_id:senderId}});
      }
    }
    return json({received:true});
  }catch{return json({error:"invalid_payload"},400)}
});
