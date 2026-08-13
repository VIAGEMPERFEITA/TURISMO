import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
const clean=(value:unknown,max=4096)=>typeof value==="string"?value.trim().slice(0,max):"";
const outputText=(response:any)=>clean(response?.output_text||(response?.output||[]).flatMap((x:any)=>x.content||[]).filter((x:any)=>x.type==="output_text").map((x:any)=>x.text).join("\n"),3000);

Deno.serve(async request=>{
  if(request.method!=="POST")return json({error:"method_not_allowed"},405);
  const workerSecret=Deno.env.get("WHATSAPP_WORKER_SECRET")||"";
  if(!workerSecret||request.headers.get("x-worker-secret")!==workerSecret)return json({error:"unauthorized"},401);
  const supabaseUrl=Deno.env.get("SUPABASE_URL"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),openaiKey=Deno.env.get("OPENAI_API_KEY");
  if(!supabaseUrl||!serviceKey||!openaiKey)return json({error:"service_unavailable"},503);
  const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false}});
  const body=await request.json().catch(()=>({})),executionId=clean(body?.executionId,64);
  if(!executionId)return json({error:"execution_id_required"},400);
  const executionResult=await admin.from("social_automation_executions").select("id,organization_id,channel_account_id,conversation_id,source_message_id,status,messaging_window_expires_at").eq("id",executionId).single();
  const execution:any=executionResult.data;
  if(executionResult.error||!execution)return json({error:"execution_not_found"},404);
  if(["completed","handed_off","cancelled"].includes(execution.status))return json({status:execution.status,idempotent:true});
  const conversationResult=await admin.from("conversations").select("id,organization_id,lead_id,channel,control_mode,ai_managed,requires_human,assigned_to,status,external_thread_id,channel_account_id").eq("id",execution.conversation_id).single();
  const conversation:any=conversationResult.data;
  if(conversationResult.error||!conversation)return json({error:"conversation_not_found"},404);
  if(conversation.channel!=="instagram"||conversation.control_mode!=="ia"||!conversation.ai_managed||conversation.requires_human||conversation.assigned_to||conversation.status==="encerrada"){
    await admin.from("social_automation_executions").update({status:"handed_off",current_step:"human_control",finished_at:new Date().toISOString()}).eq("id",execution.id);
    return json({status:"handed_off"});
  }
  if(execution.messaging_window_expires_at&&new Date(execution.messaging_window_expires_at).getTime()<Date.now())return json({error:"messaging_window_expired"},409);
  const sourceResult=await admin.from("messages").select("id,body,message_type,direction").eq("id",execution.source_message_id).single();
  const source:any=sourceResult.data;
  if(!source||source.direction!=="entrada"||source.message_type!=="texto"||!clean(source.body,4000))return json({error:"unsupported_message"},409);
  try{
    await admin.from("social_automation_executions").update({status:"running",current_step:"generate_ai_response"}).eq("id",execution.id);
    const [historyResult,knowledgeResult,caravansResult]=await Promise.all([
      admin.from("messages").select("id,direction,body,sent_at").eq("conversation_id",conversation.id).not("body","is",null).order("sent_at",{ascending:false}).limit(12),
      admin.rpc("search_authorized_knowledge",{search_text:clean(source.body,160),external_only:true}),
      admin.from("caravans").select("name,destination,departure_date,return_date,status_public,available_spots,short_description,included,not_included").eq("organization_id",conversation.organization_id).eq("published",true).eq("status_internal","confirmada").is("archived_at",null).limit(6),
    ]);
    const context={knowledge:(knowledgeResult.data||[]).slice(0,6),caravans:caravansResult.data||[]};
    const history=(historyResult.data||[]).filter((m:any)=>m.id!==source.id).reverse().map((m:any)=>({role:m.direction==="entrada"?"user":"assistant",content:clean(m.body,1500)}));
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${openaiKey}`,"Content-Type":"application/json"},body:JSON.stringify({
      model:Deno.env.get("OPENAI_MODEL")||"gpt-5.6-sol",
      instructions:`Você é a assistente virtual da Viagem Perfeita Turismo no Instagram. Responda em português, com naturalidade, brevidade e acolhimento. Use exclusivamente os dados oficiais fornecidos no contexto. Não invente preço, vaga, data, hotel, voo, roteiro, contrato ou pagamento. Para negociação, reserva, pagamento, documento, reclamação, urgência, pedido de pessoa ou ausência de informação confirmada, diga que encaminhará à equipe. Nunca solicite documento completo, senha, código ou cartão pelo Instagram. Faça no máximo uma pergunta por resposta. Contexto oficial: ${JSON.stringify(context)}`,
      input:[...history,{role:"user",content:clean(source.body,4000)}],reasoning:{effort:"low"},text:{verbosity:"low"},max_output_tokens:500,safety_identifier:`vp_instagram_${conversation.id.replaceAll("-","").slice(0,32)}`,
    })});
    const provider=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(`openai_${response.status}_${clean(provider?.error?.code,80)}`);
    const answer=outputText(provider)||"Ainda não tenho essa informação confirmada. Vou encaminhar sua conversa para nossa equipe.";
    const messageInsert=await admin.from("messages").insert({conversation_id:conversation.id,direction:"saida",message_type:"texto",body:answer,provider:"meta_instagram",author_type:"ia",delivery_status:"pendente",metadata:{execution_id:execution.id}}).select("id").single();
    if(messageInsert.error)throw messageInsert.error;
    const outboundInsert=await admin.from("instagram_outbound_messages").insert({organization_id:conversation.organization_id,channel_account_id:conversation.channel_account_id,execution_id:execution.id,conversation_id:conversation.id,message_id:messageInsert.data.id,recipient_id:conversation.external_thread_id,payload:{text:answer},idempotency_key:`ai:${source.id}`}).select("id").single();
    if(outboundInsert.error)throw outboundInsert.error;
    const dispatch=await fetch(`${supabaseUrl}/functions/v1/instagram-dispatch`,{method:"POST",headers:{Authorization:`Bearer ${serviceKey}`,apikey:serviceKey,"x-worker-secret":workerSecret,"Content-Type":"application/json"},body:JSON.stringify({outboundId:outboundInsert.data.id})});
    const dispatchBody=await dispatch.json().catch(()=>({}));
    if(!dispatch.ok)throw new Error(`dispatch_${dispatch.status}_${clean(dispatchBody?.error||dispatchBody?.status,120)}`);
    await admin.from("social_automation_executions").update({status:"completed",current_step:"sent",output_redacted:{message_id:messageInsert.data.id,outbound_id:outboundInsert.data.id},finished_at:new Date().toISOString()}).eq("id",execution.id);
    return json({status:"completed",outboundId:outboundInsert.data.id});
  }catch(error){
    const message=error instanceof Error?error.message.slice(0,500):"processing_failed";
    await admin.from("social_automation_executions").update({status:"failed",error_message:message,finished_at:new Date().toISOString()}).eq("id",execution.id);
    return json({error:"assistant_unavailable",retryable:true},503);
  }
});
