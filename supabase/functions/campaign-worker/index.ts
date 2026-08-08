import {createClient} from "https://esm.sh/@supabase/supabase-js@2";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
const clean=(value:unknown,max=4096)=>typeof value==="string"?value.trim().slice(0,max):"";

Deno.serve(async request=>{
 if(request.method!=="POST")return json({error:"method_not_allowed"},405);
 const workerSecret=Deno.env.get("WHATSAPP_WORKER_SECRET")||"";
 if(!workerSecret||request.headers.get("x-worker-secret")!==workerSecret)return json({error:"unauthorized"},401);
 const supabaseUrl=Deno.env.get("SUPABASE_URL"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!supabaseUrl||!serviceKey)return json({error:"service_unavailable"},503);
 const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false}});
 const campaignId=clean((await request.json().catch(()=>({})))?.campaignId,64);
 if(!campaignId)return json({error:"campaign_id_required"},400);
 const{data:campaign}=await admin.from("campaigns").select("id,organization_id,status,simulation_mode,batch_size,error_pause_threshold").eq("id",campaignId).maybeSingle();
 if(!campaign)return json({error:"campaign_not_found"},404);
 const{data:integration}=await admin.from("integration_settings").select("enabled,simulation_mode,credentials_configured").eq("organization_id",campaign.organization_id).eq("provider","whatsapp_cloud_api").maybeSingle();
 const simulation=campaign.simulation_mode||integration?.simulation_mode!==false||integration?.enabled!==true||integration?.credentials_configured!==true;
 const{data:recipients,error}=await admin.from("campaign_recipients").select("id,phone_e164,status,attempts").eq("campaign_id",campaign.id).in("status",["pendente","agendada","na_fila","falhou"]).lte("attempts",4).order("created_at").limit(campaign.batch_size||50);
 if(error)return json({error:"queue_read_failed"},500);
 if(!recipients?.length)return json({status:"idle",simulation,processed:0});
 if(!simulation&&!Deno.env.get("META_WHATSAPP_ACCESS_TOKEN"))return json({error:"access_token_missing"},503);

 let processed=0;
 for(const recipient of recipients){
  const now=new Date().toISOString();
  const claimed=await admin.from("campaign_recipients").update({status:"processando",attempts:recipient.attempts+1,updated_at:now}).eq("id",recipient.id).in("status",["pendente","agendada","na_fila","falhou"]).select("id").maybeSingle();
  if(!claimed.data)continue;
  if(simulation){await admin.from("campaign_recipients").update({status:"enviada",sent_at:now,updated_at:now}).eq("id",recipient.id);await admin.from("message_events").insert({organization_id:campaign.organization_id,campaign_id:campaign.id,recipient_id:recipient.id,event_type:"simulation_sent",payload:{simulation:true}});processed+=1;continue}
  // O envio real é delegado ao dispatcher oficial já homologado. Este worker apenas
  // libera itens quando integração, credenciais e campanha estiverem explicitamente reais.
  await admin.from("campaign_recipients").update({status:"na_fila",updated_at:now}).eq("id",recipient.id);processed+=1;
 }
 await admin.from("campaign_audit_logs").insert({organization_id:campaign.organization_id,campaign_id:campaign.id,action:"worker_batch",metadata:{simulation,processed}});
 return json({status:simulation?"simulated":"queued_for_official_dispatch",simulation,processed});
});
