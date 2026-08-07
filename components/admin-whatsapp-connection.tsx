"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, MessageCircle, ShieldCheck, Smartphone } from "lucide-react";
import { getSupabaseBrowserClient } from "../lib/supabase-client";

const META_APP_ID = "1295731149305805";
const META_CONFIGURATION_ID = "4336542926489080";
type SignupSession = { waba_id?: string; phone_number_id?: string };
type FacebookResponse = { authResponse?: { code?: string } };
type FacebookSdk = { init(options: Record<string, unknown>): void; login(callback: (response: FacebookResponse) => void, options: Record<string, unknown>): void };
declare global { interface Window { FB?: FacebookSdk; fbAsyncInit?: () => void } }

export function AdminWhatsAppConnection() {
  const [sdkReady,setSdkReady]=useState(false),[connecting,setConnecting]=useState(false),[message,setMessage]=useState(""),[connected,setConnected]=useState(false);
  const signupSession=useRef<SignupSession|null>(null);
  useEffect(()=>{
    const client=getSupabaseBrowserClient();
    client?.from("whatsapp_accounts").select("status,coexistence_enabled").eq("phone_e164","5531995285665").maybeSingle().then(({data})=>setConnected(Boolean(data?.coexistence_enabled&&data?.status==="ativo")));
    const onMessage=(event:MessageEvent)=>{if(!event.origin.endsWith("facebook.com"))return;let payload=event.data;if(typeof payload==="string"){try{payload=JSON.parse(payload)}catch{return}}if(payload?.type!=="WA_EMBEDDED_SIGNUP")return;if(payload.event==="FINISH")signupSession.current=payload.data??null;if(payload.event==="CANCEL"){setConnecting(false);setMessage("Conexão cancelada. O WhatsApp do celular não foi alterado.")}if(payload.event==="ERROR"){setConnecting(false);setMessage("A Meta não concluiu a conexão. Nenhuma conta foi removida.")}};
    window.addEventListener("message",onMessage);
    window.fbAsyncInit=()=>{window.FB?.init({appId:META_APP_ID,cookie:true,xfbml:false,version:"v25.0"});setSdkReady(true)};
    if(window.FB)window.fbAsyncInit();else if(!document.getElementById("facebook-jssdk")){const script=document.createElement("script");script.id="facebook-jssdk";script.async=true;script.defer=true;script.crossOrigin="anonymous";script.src="https://connect.facebook.net/pt_BR/sdk.js";document.head.appendChild(script)}
    return()=>window.removeEventListener("message",onMessage);
  },[]);
  function connect(){if(!window.FB||!sdkReady||connecting)return;setConnecting(true);setMessage("");signupSession.current=null;window.FB.login(async response=>{const code=response.authResponse?.code;if(!code){setConnecting(false);setMessage("A autorização não foi concluída. Nenhuma alteração foi feita no celular.");return}await new Promise(resolve=>setTimeout(resolve,500));const session=signupSession.current;if(!session?.waba_id||!session?.phone_number_id){setConnecting(false);setMessage("A Meta não retornou os dados da conta. Confirme que escolheu conectar o WhatsApp Business existente.");return}const client=getSupabaseBrowserClient();if(!client){setConnecting(false);setMessage("Supabase não configurado.");return}const{data,error}=await client.functions.invoke("whatsapp-embedded-signup",{body:{code,...session}});setConnecting(false);if(error||!data?.connected){setMessage(data?.error?`Conexão não concluída: ${data.error}`:"Não foi possível concluir a conexão.");return}setConnected(true);setMessage("WhatsApp Business conectado em coexistência. O aplicativo do celular permanece ativo.")},{config_id:META_CONFIGURATION_ID,response_type:"code",override_default_response_type:true,extras:{sessionInfoVersion:"3",featureType:"whatsapp_business_app_onboarding"}})}
  return <div className="crm-report-grid whatsapp-connection-grid"><section className="crm-panel"><div className="crm-panel-head"><div><h2>WhatsApp Business</h2><p>Conecte o número oficial à caixa compartilhada usando o cadastro incorporado da Meta.</p></div>{connected?<CheckCircle2 aria-label="Conectado"/>:<MessageCircle/>}</div><div className={`whatsapp-connection-status ${connected?"connected":"pending"}`}><strong>{connected?"Conectado em coexistência":"Aguardando conexão"}</strong><span>(31) 99528-5665</span></div><button className="crm-primary whatsapp-connect-button" onClick={connect} disabled={!sdkReady||connecting||connected}>{connecting?<LoaderCircle className="spin"/>:connected?<CheckCircle2/>:<MessageCircle/>}{connecting?"Conectando…":connected?"WhatsApp conectado":sdkReady?"Conectar WhatsApp Business":"Carregando Meta…"}</button>{message?<div className="crm-alert" role="status">{message}</div>:null}</section><section className="crm-panel"><h2>Proteção do aplicativo móvel</h2><ul className="ai-safety-list"><li><Smartphone/><span><b>WhatsApp permanece no celular</b><small>Este fluxo usa coexistência e não solicita exclusão do aplicativo.</small></span></li><li><ShieldCheck/><span><b>Token protegido</b><small>A credencial é trocada no servidor e armazenada no Vault do Supabase.</small></span></li></ul></section></div>
}
