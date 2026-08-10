"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {ArrowRight,CheckCircle2,Copy,MessageCircle,ShieldCheck} from "lucide-react";
import Link from "next/link";
import {useState} from "react";
import {useForm} from "react-hook-form";
import {createLeadWhatsAppMessage,createWhatsAppLink} from "../lib/company-contact";
import {formatBrazilianPhone,leadFormSchema,type LeadFormData} from "../lib/lead-schema";
import {recordWhatsAppStarted,savePublicLead} from "../lib/lead-service";
import {trackWhatsAppClick} from "../lib/whatsapp-tracking";

const defaults:LeadFormData={name:"",phone:"",email:"",city:"",state:"",travelers:"1",interest:"Receber valores e condições",desiredPeriod:"",accommodation:"A definir",departureCity:"",paymentPreference:"A definir",notes:"",groupType:"",consent:false};

export function DreamTripForm(){
 const[done,setDone]=useState<{link:string;message:string;leadId?:string}|null>(null);const[notice,setNotice]=useState("");
 const form=useForm<LeadFormData>({resolver:zodResolver(leadFormSchema),defaultValues:defaults});
 async function submit(values:LeadFormData){
  setNotice("");const context={destination:values.interest,pageUrl:window.location.href};
  const result=await savePublicLead(values,context,"Formulário — viagem dos sonhos");
  if(!result.saved){setNotice(result.message);return}
  const message=createLeadWhatsAppMessage(values,context);const link=createWhatsAppLink(message);
  if(result.leadId)await recordWhatsAppStarted(result.leadId,"Formulário — viagem dos sonhos");
  trackWhatsAppClick({buttonText:"Receber valores e condições",lead:values});setDone({link,message,leadId:result.leadId});
 }
 async function copy(){if(done)await navigator.clipboard.writeText(done.message);setNotice("Mensagem copiada. Você pode colá-la no WhatsApp.")}
 if(done)return <div className="dream-success" role="status"><CheckCircle2/><h3>Solicitação registrada.</h3><p>Seu interesse foi salvo no atendimento da Viagem Perfeita. Use o botão abaixo para continuar com a mensagem completa.</p>{done.leadId?<small>Código do atendimento: {done.leadId.slice(0,8).toUpperCase()}</small>:null}<a className="btn warm" href={done.link} target="_blank" rel="noopener noreferrer">Continuar no WhatsApp <MessageCircle/></a><button type="button" onClick={copy}><Copy/> Copiar mensagem</button></div>;
 return <form className="dream-trip-form" onSubmit={form.handleSubmit(submit)} noValidate>
  <label><span>Nome completo *</span><input autoComplete="name" placeholder="Seu nome" {...form.register("name")}/><small>{form.formState.errors.name?.message}</small></label>
  <label><span>WhatsApp com DDD *</span><input inputMode="tel" autoComplete="tel" placeholder="(31) 99999-9999" {...form.register("phone",{onChange:event=>form.setValue("phone",formatBrazilianPhone(event.target.value),{shouldValidate:false})})}/><small>{form.formState.errors.phone?.message}</small></label>
  <label><span>E-mail</span><input type="email" autoComplete="email" placeholder="voce@exemplo.com" {...form.register("email")}/><small>{form.formState.errors.email?.message}</small></label>
  <label><span>Destino de interesse *</span><select {...form.register("interest")}><option value="">Selecione</option><option>Israel</option><option>Egito, Jordânia e Israel</option><option>Grécia e Turquia</option><option>Europa</option><option>Viagem personalizada</option><option>Outro destino</option></select><small>{form.formState.errors.interest?.message}</small></label>
  <label className="consent-field field-wide"><input type="checkbox" {...form.register("consent")}/><span>Autorizo o contato da Viagem Perfeita sobre esta solicitação. Li a <Link href="/politica-de-privacidade">Política de Privacidade</Link>.</span><small>{form.formState.errors.consent?.message}</small></label>
  {notice?<p className="dream-form-notice" role="alert">{notice}</p>:null}
  <button className="btn warm" type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting?"Registrando com segurança…":"Receber valores e condições"}<ArrowRight/></button>
  <small className="dream-security"><ShieldCheck/> O lead é salvo antes da abertura do WhatsApp.</small>
 </form>
}
