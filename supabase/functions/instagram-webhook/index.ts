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
  try{
    const payload=JSON.parse(raw);
    if(payload?.object!=="instagram")return json({received:true,ignored:true});
    for(const entry of payload.entry||[])for(const change of entry.changes||[]){
      const value=change.value||{},field=clean(change.field,80),type=eventType(field,value);
      const accountExternalId=clean(entry.id,160);
      const {data:account}=await admin.from("channel_accounts").select("id,organization_id").eq("channel","instagram").eq("external_account_id",accountExternalId).eq("status","connected").maybeSingle();
      if(!account)continue;
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
    return json({received:true});
  }catch{return json({error:"invalid_payload"},400)}
});
