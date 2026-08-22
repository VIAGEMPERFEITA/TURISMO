import {createClient} from "https://esm.sh/@supabase/supabase-js@2";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
const clean=(value:unknown,max=4096)=>typeof value==="string"?value.trim().slice(0,max):"";
const officialPhone="5531995285665";

Deno.serve(async request=>{
 if(request.method!=="POST")return json({error:"method_not_allowed"},405);
 const workerSecret=Deno.env.get("WHATSAPP_WORKER_SECRET")||"";
 if(!workerSecret||request.headers.get("x-worker-secret")!==workerSecret)return json({error:"unauthorized"},401);
 const supabaseUrl=Deno.env.get("SUPABASE_URL"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!supabaseUrl||!serviceKey)return json({error:"service_unavailable"},503);
 const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false}});
 const campaignId=clean((await request.json().catch(()=>({})))?.campaignId,64);
 if(!campaignId)return json({error:"campaign_id_required"},400);
 const{data:campaign}=await admin.from("campaigns").select("id,organization_id,status,simulation_mode,batch_size,error_pause_threshold,template_id,message_snapshot,scheduled_at").eq("id",campaignId).maybeSingle();
 if(!campaign)return json({error:"campaign_not_found"},404);
 if(!["agendada","em_andamento"].includes(campaign.status)&&!campaign.simulation_mode)return json({error:"campaign_not_released"},409);
 const{data:integration}=await admin.from("integration_settings").select("enabled,simulation_mode,credentials_configured").eq("organization_id",campaign.organization_id).eq("provider","whatsapp_cloud_api").maybeSingle();
 const simulation=campaign.simulation_mode||integration?.simulation_mode!==false||integration?.enabled!==true||integration?.credentials_configured!==true;
 const now=new Date().toISOString();
 const{data:recipients,error}=await admin.from("campaign_recipients").select("id,lead_id,customer_id,phone_e164,display_name,variables,status,attempts,scheduled_at").eq("campaign_id",campaign.id).in("status",["pendente","agendada","na_fila","falhou"]).lte("attempts",4).or(`scheduled_at.is.null,scheduled_at.lte.${now}`).order("created_at").limit(campaign.batch_size||50);
 if(error)return json({error:"queue_read_failed"},500);
 if(!recipients?.length)return json({status:"idle",simulation,processed:0,queued:0,blocked:0});

 let account:any=null,template:any=null,operationalTemplate:any=null;
 if(!simulation){
  const accountResult=await admin.from("whatsapp_accounts").select("id,status,phone_e164,phone_number_id,waba_id,coexistence_enabled").eq("organization_id",campaign.organization_id).eq("phone_e164",officialPhone).eq("status","ativo").maybeSingle();
  account=accountResult.data;
  if(!account?.phone_number_id||!account?.waba_id||account.coexistence_enabled!==true)return json({error:"official_whatsapp_not_connected"},409);
  if(!campaign.template_id)return json({error:"approved_template_required"},409);
  const templateResult=await admin.from("message_templates").select("id,name,language_code,status,meta_template_id,variables").eq("id",campaign.template_id).eq("organization_id",campaign.organization_id).eq("status","aprovado").maybeSingle();
  template=templateResult.data;
  if(!template?.meta_template_id)return json({error:"approved_meta_template_required"},409);
  const operationalResult=await admin.from("whatsapp_templates").select("id,name,language_code,status,components,meta_template_id").eq("organization_id",campaign.organization_id).eq("whatsapp_account_id",account.id).eq("status","aprovado").eq("name",template.name).eq("language_code",template.language_code||"pt_BR").maybeSingle();
  operationalTemplate=operationalResult.data;
  if(!operationalTemplate?.id)return json({error:"approved_operational_template_required"},409);
 }

 let processed=0,queued=0,blocked=0,duplicates=0;
 for(const recipient of recipients){
  const claimed=await admin.from("campaign_recipients").update({status:"processando",attempts:recipient.attempts+1,updated_at:now}).eq("id",recipient.id).in("status",["pendente","agendada","na_fila","falhou"]).select("id").maybeSingle();
  if(!claimed.data)continue;
  processed+=1;
  if(simulation){
   await admin.from("campaign_recipients").update({status:"enviada",sent_at:now,updated_at:now}).eq("id",recipient.id);
   await admin.from("message_events").insert({organization_id:campaign.organization_id,campaign_id:campaign.id,recipient_id:recipient.id,event_type:"simulation_sent",payload:{simulation:true}});
   continue;
  }

  const[{data:consent},{data:suppression}]=await Promise.all([
   admin.from("contact_consents").select("id").eq("organization_id",campaign.organization_id).eq("phone_e164",recipient.phone_e164).eq("channel","whatsapp").eq("purpose","marketing").eq("granted",true).is("revoked_at",null).maybeSingle(),
   admin.from("contact_suppressions").select("id").eq("organization_id",campaign.organization_id).eq("phone_e164",recipient.phone_e164).eq("channel","whatsapp").in("scope",["marketing","todos"]).is("released_at",null).limit(1).maybeSingle(),
  ]);
  if(!consent||suppression||(!recipient.lead_id&&!recipient.customer_id)){
   const reason=!consent?"marketing_consent_missing":suppression?"contact_suppressed":"contact_identity_missing";
   await admin.from("campaign_recipients").update({status:"bloqueada",last_error_code:reason,last_error_message:reason,updated_at:now}).eq("id",recipient.id);
   await admin.from("message_events").insert({organization_id:campaign.organization_id,campaign_id:campaign.id,recipient_id:recipient.id,event_type:"dispatch_blocked",payload:{reason}});
   blocked+=1;continue;
  }

  const existingConversation=await admin.from("conversations").select("id").eq("organization_id",campaign.organization_id).eq("channel","whatsapp").eq("external_thread_id",recipient.phone_e164).limit(1).maybeSingle();
  let conversation=existingConversation.data;
  if(!conversation){
   const made=await admin.from("conversations").insert({organization_id:campaign.organization_id,lead_id:recipient.lead_id||null,customer_id:recipient.customer_id||null,channel:"whatsapp",external_thread_id:recipient.phone_e164,whatsapp_account_id:account.id,contact_wa_id:recipient.phone_e164,status:"aguardando_cliente",control_mode:"humano",ai_managed:false,last_message_at:now}).select("id").single();
   if(made.error){await admin.from("campaign_recipients").update({status:"falhou",last_error_code:"conversation_create_failed",last_error_message:made.error.message,updated_at:now}).eq("id",recipient.id);continue}
   conversation=made.data;
  }
  const payload={type:"template",template:{name:operationalTemplate.name,language:{code:operationalTemplate.language_code||"pt_BR"},components:operationalTemplate.components||[]}};
  await admin.from("campaign_messages").upsert({campaign_id:campaign.id,recipient_id:recipient.id,template_id:campaign.template_id,rendered_content:clean(campaign.message_snapshot?.content)||`Modelo ${template.name}`,payload_snapshot:payload,simulation:false},{onConflict:"recipient_id"});
  const idempotencyKey=`campaign:${campaign.id}:${recipient.id}`;
  const{data:existingOutbound}=await admin.from("whatsapp_outbound_messages").select("id,status").eq("organization_id",campaign.organization_id).eq("idempotency_key",idempotencyKey).maybeSingle();
  if(existingOutbound){await admin.from("campaign_recipients").update({status:"na_fila",updated_at:now}).eq("id",recipient.id);duplicates+=1;continue}
  const message=await admin.from("messages").insert({conversation_id:conversation.id,direction:"saida",message_type:"sistema",body:`Modelo ${template.name}`,delivery_status:"pendente",metadata:{campaign_id:campaign.id,recipient_id:recipient.id,template_name:template.name}}).select("id").single();
  if(message.error){await admin.from("campaign_recipients").update({status:"falhou",last_error_code:"message_create_failed",last_error_message:message.error.message,updated_at:now}).eq("id",recipient.id);continue}
  const out=await admin.from("whatsapp_outbound_messages").insert({organization_id:campaign.organization_id,whatsapp_account_id:account.id,conversation_id:conversation.id,message_id:message.data.id,author_type:"sistema",message_type:"template",recipient_wa_id:recipient.phone_e164,payload,template_id:operationalTemplate.id,idempotency_key:idempotencyKey,status:"pendente",scheduled_at:recipient.scheduled_at||now}).select("id").single();
  if(out.error){
   const duplicate=out.error.code==="23505";
   await admin.from("campaign_recipients").update({status:duplicate?"na_fila":"falhou",last_error_code:duplicate?null:"official_queue_failed",last_error_message:duplicate?null:out.error.message,updated_at:now}).eq("id",recipient.id);
   if(duplicate)duplicates+=1;continue;
  }
  await admin.from("campaign_recipients").update({status:"na_fila",updated_at:now}).eq("id",recipient.id);
  await admin.from("message_events").insert({organization_id:campaign.organization_id,campaign_id:campaign.id,recipient_id:recipient.id,event_type:"official_queue_created",payload:{outbound_id:out.data.id}});
  fetch(`${supabaseUrl}/functions/v1/whatsapp-dispatch`,{method:"POST",headers:{Authorization:`Bearer ${serviceKey}`,apikey:serviceKey,"x-worker-secret":workerSecret,"Content-Type":"application/json"},body:JSON.stringify({outboundId:out.data.id})}).catch(()=>{});
  queued+=1;
 }
 await admin.from("campaign_audit_logs").insert({organization_id:campaign.organization_id,campaign_id:campaign.id,action:"worker_batch",metadata:{simulation,processed,queued,blocked,duplicates}});
 return json({status:simulation?"simulated":"queued_for_official_dispatch",simulation,processed,queued,blocked,duplicates});
});
