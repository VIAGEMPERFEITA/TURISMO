import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
const clean=(value:unknown,max=4096)=>typeof value==="string"?value.trim().slice(0,max):"";

Deno.serve(async request=>{
  if(request.method!=="POST")return json({error:"method_not_allowed"},405);
  const workerSecret=Deno.env.get("WHATSAPP_WORKER_SECRET")||"";
  if(!workerSecret||request.headers.get("x-worker-secret")!==workerSecret)return json({error:"unauthorized"},401);
  const supabaseUrl=Deno.env.get("SUPABASE_URL"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const fallbackToken=Deno.env.get("META_INSTAGRAM_ACCESS_TOKEN")||"";
  if(!supabaseUrl||!serviceKey)return json({error:"service_unavailable"},503);
  const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false}});
  const outboundId=clean((await request.json().catch(()=>({})))?.outboundId,64);
  if(!outboundId)return json({error:"outbound_id_required"},400);
  const result=await admin.from("instagram_outbound_messages")
    .select("id,organization_id,channel_account_id,conversation_id,message_id,recipient_id,payload,status,attempts,channel_accounts!inner(external_account_id,status,credential_secret_name,settings)")
    .eq("id",outboundId).single();
  const outbound:any=result.data;
  if(result.error||!outbound)return json({error:"outbound_not_found"},404);
  if(["enviado","entregue","lido","cancelado"].includes(outbound.status))return json({status:outbound.status,idempotent:true});
  const account=Array.isArray(outbound.channel_accounts)?outbound.channel_accounts[0]:outbound.channel_accounts;
  if(!account?.external_account_id||account.status!=="connected")return json({error:"account_not_connected"},409);
  let vaultToken="";
  if(account?.credential_secret_name){const {data}=await admin.rpc("get_instagram_access_token",{target_secret_name:account.credential_secret_name});vaultToken=clean(data,4096);}
  const tokens=[vaultToken,clean(fallbackToken,4096)].filter((token,index,tokens)=>token&&tokens.indexOf(token)===index);
  if(!tokens.length)return json({error:"access_token_missing"},503);
  if(outbound.attempts>=5)return json({error:"retry_limit_reached"},409);
  const claimed=await admin.from("instagram_outbound_messages").update({status:"processando",processing_at:new Date().toISOString(),attempts:outbound.attempts+1,updated_at:new Date().toISOString()})
    .eq("id",outbound.id).in("status",["pendente","falhou"]).select("id").maybeSingle();
  if(!claimed.data)return json({error:"already_processing"},409);
  try{
    let response:Response|null=null,provider:any={};
    for(const token of tokens){
      response=await fetch("https://graph.instagram.com/v25.0/me/messages",{
        method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({recipient:{id:outbound.recipient_id},message:outbound.payload?.message||outbound.payload}),
      });
      provider=await response.json().catch(()=>({}));
      const authFailure=response.status===401||[190,102].includes(Number(provider?.error?.code));
      if(response.ok||!authFailure)break;
    }
    if(!response?.ok)throw new Error(`meta_${response?.status||502}_${clean(provider?.error?.code,40)}_${clean(provider?.error?.message,240)}`);
    const externalId=clean(provider?.message_id||provider?.messages?.[0]?.id,256),now=new Date().toISOString();
    await admin.from("instagram_outbound_messages").update({status:"enviado",external_message_id:externalId||null,sent_at:now,last_error:null,updated_at:now}).eq("id",outbound.id);
    if(outbound.message_id)await admin.from("messages").update({external_message_id:externalId||null,provider:"meta_instagram",delivery_status:"enviado"}).eq("id",outbound.message_id);
    return json({status:"enviado",externalMessageId:externalId});
  }catch(error){
    const message=error instanceof Error?error.message.slice(0,500):"dispatch_failed";
    const nextAttempt=new Date(Date.now()+Math.min(60,2**Math.min(outbound.attempts,5))*60000).toISOString();
    await admin.from("instagram_outbound_messages").update({status:"falhou",last_error:message,next_attempt_at:nextAttempt,updated_at:new Date().toISOString()}).eq("id",outbound.id);
    if(outbound.message_id)await admin.from("messages").update({delivery_status:"falhou",error_message:message}).eq("id",outbound.message_id);
    return json({status:"falhou",retryAt:nextAttempt},502);
  }
});
