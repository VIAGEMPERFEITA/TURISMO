import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const clean=(value:unknown,max=4096)=>typeof value==="string"?value.trim().slice(0,max):"";

Deno.serve(async request=>{
  if(request.method==="OPTIONS")return new Response("ok",{headers});
  if(request.method!=="POST")return json({error:"method_not_allowed"},405);
  const supabaseUrl=Deno.env.get("SUPABASE_URL")||"",anonKey=Deno.env.get("SUPABASE_ANON_KEY")||"",serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const appId=Deno.env.get("META_INSTAGRAM_APP_ID")||"1295731149305805",appSecret=Deno.env.get("META_INSTAGRAM_APP_SECRET")||"";
  if(!supabaseUrl||!anonKey||!serviceKey||!appSecret)return json({connected:false,error:"service_not_configured"});
  const body=await request.json().catch(()=>({}));
  const authorization=request.headers.get("Authorization")||"";
  const bearer=authorization.startsWith("Bearer ")?authorization.slice(7):"";
  const sessionToken=clean(body.session_access_token,4096)||bearer;
  const userClient=createClient(supabaseUrl,anonKey,{auth:{persistSession:false}});
  const {data:authData}=await userClient.auth.getUser(sessionToken);
  if(!authData.user)return json({connected:false,error:"authentication_required"});
  const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false}});
  const {data:profile}=await admin.from("profiles").select("role,organization_id,active").eq("id",authData.user.id).maybeSingle();
  if(!profile?.active||!["administrador","gestor"].includes(profile.role))return json({connected:false,error:"forbidden"});
  const code=clean(body.code,2048),redirectUri=clean(body.redirect_uri,1024);
  if(!code||!redirectUri)return json({connected:false,error:"incomplete_oauth_data"});
  const expected="https://viagemperfeita.github.io/TURISMO/admin/configuracoes/";
  if(redirectUri!==expected)return json({connected:false,error:"invalid_redirect_uri"});

  const form=new FormData();
  form.set("client_id",appId);form.set("client_secret",appSecret);form.set("grant_type","authorization_code");form.set("redirect_uri",redirectUri);form.set("code",code);
  const shortResponse=await fetch("https://api.instagram.com/oauth/access_token",{method:"POST",body:form});
  const shortData=await shortResponse.json().catch(()=>({}));
  const shortToken=clean(shortData.access_token),instagramUserId=clean(String(shortData.user_id??""),180);
  if(!shortResponse.ok||!shortToken||!instagramUserId)return json({connected:false,error:"instagram_token_exchange_failed",provider_code:clean(shortData?.error_type||shortData?.error?.code,48)});
  const longUrl=new URL("https://graph.instagram.com/access_token");
  longUrl.searchParams.set("grant_type","ig_exchange_token");longUrl.searchParams.set("client_secret",appSecret);longUrl.searchParams.set("access_token",shortToken);
  const longResponse=await fetch(longUrl);const longData=await longResponse.json().catch(()=>({}));
  const accessToken=clean(longData.access_token)||shortToken;
  if(!longResponse.ok||!accessToken)return json({connected:false,error:"instagram_long_token_failed",provider_code:clean(longData?.error?.code,48)});
  const profileUrl=new URL("https://graph.instagram.com/v25.0/me");profileUrl.searchParams.set("fields","user_id,username,name,profile_picture_url");profileUrl.searchParams.set("access_token",accessToken);
  const accountResponse=await fetch(profileUrl);const accountData=await accountResponse.json().catch(()=>({}));
  if(!accountResponse.ok)return json({connected:false,error:"instagram_account_validation_failed",provider_code:clean(accountData?.error?.code,48)});
  const graphAccountId=clean(String(accountData.id||instagramUserId),180);
  const externalId=clean(String(accountData.user_id||accountData.id||""),180)||instagramUserId,username=clean(accountData.username,160)||"viagemperfeitatrip";
  const subscribedFields=["messages","message_reactions","messaging_postbacks","messaging_seen","messaging_referral","comments","live_comments","mentions"];
  const subscriptionUrl=new URL(`https://graph.instagram.com/v25.0/${encodeURIComponent(graphAccountId)}/subscribed_apps`);
  const subscriptionResponse=await fetch(subscriptionUrl,{
    method:"POST",
    headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json"},
    body:JSON.stringify({subscribed_fields:subscribedFields}),
  });
  const subscriptionData=await subscriptionResponse.json().catch(()=>({}));
  if(!subscriptionResponse.ok||subscriptionData?.success!==true)return json({connected:false,error:"instagram_webhook_subscription_failed",provider_code:clean(subscriptionData?.error?.code,48)});
  const secretName=`meta_instagram_${profile.organization_id}_${externalId}`;
  const {error:vaultError}=await admin.rpc("store_instagram_access_token",{target_secret_name:secretName,target_access_token:accessToken});
  if(vaultError)return json({connected:false,error:"token_vault_failed"});
  const connectedAt=new Date().toISOString();
  const account={organization_id:profile.organization_id,channel:"instagram",name:`Instagram @${username}`,provider:"meta",external_account_id:externalId,status:"connected",credential_secret_name:secretName,webhook_secret_name:"META_INSTAGRAM_VERIFY_TOKEN",scopes:["instagram_business_basic","instagram_business_manage_messages","instagram_business_manage_comments","instagram_business_content_publish"],capabilities:{direct:true,comments:true,content_publish:true,human_handoff:true},settings:{username,profile_picture_url:clean(accountData.profile_picture_url,1024)||null,token_expires_in:Number(longData.expires_in||0),connected_at:connectedAt},last_sync_at:connectedAt,last_error:null,updated_at:connectedAt};
  const {data:connected,error:upsertError}=await admin.from("channel_accounts").upsert(account,{onConflict:"organization_id,channel,name"}).select("id").single();
  if(upsertError||!connected)return json({connected:false,error:"account_update_failed"});
  await admin.from("integration_connectors").update({status:"connected",credential_secret_name:secretName,last_sync_at:connectedAt,last_error:null,updated_at:connectedAt}).eq("organization_id",profile.organization_id).eq("name","Instagram Messaging API");
  await admin.from("audit_logs").insert({organization_id:profile.organization_id,user_id:authData.user.id,action:"instagram_account_connected",entity_type:"channel_account",entity_id:connected.id,after_data:{external_account_id:externalId,graph_account_id:graphAccountId,username,subscribed_fields:subscribedFields}});
  return json({connected:true,username,externalAccountId:externalId});
});
