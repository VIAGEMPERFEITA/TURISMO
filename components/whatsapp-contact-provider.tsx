"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Check, ChevronLeft, MessageCircle, X } from "lucide-react";
import { createContext, type ReactNode, useContext, useState } from "react";
import { useForm } from "react-hook-form";
import { createLeadWhatsAppMessage, createWhatsAppLink, type TripContactContext, type WhatsAppLead } from "../lib/company-contact";
import { type LeadFormData, leadFormSchema } from "../lib/lead-schema";
import { savePublicLead } from "../lib/lead-service";
import { trackWhatsAppClick } from "../lib/whatsapp-tracking";

type ContactRequest = TripContactContext & { buttonText: string; initialInterest?: string; initialLead?: WhatsAppLead };
type ContactContextValue = { openContact: (request: ContactRequest) => void };
const ContactContext = createContext<ContactContextValue | null>(null);
const defaults:LeadFormData={name:"",phone:"",email:"",city:"",state:"",travelers:"1",interest:"Receber roteiro",desiredPeriod:"",accommodation:"A definir",departureCity:"",paymentPreference:"A definir",notes:"",groupType:"",consent:false};

export function useWhatsAppContact(){const context=useContext(ContactContext);if(!context)throw new Error("useWhatsAppContact must be used inside WhatsAppContactProvider");return context}

const reviewLabels:Record<keyof LeadFormData,string>={name:"Nome",phone:"WhatsApp",email:"E-mail",city:"Cidade",state:"Estado",travelers:"Viajantes",interest:"Interesse",desiredPeriod:"Período desejado",accommodation:"Acomodação",departureCity:"Cidade de embarque",paymentPreference:"Pagamento",notes:"Observações",groupType:"Tipo de grupo",consent:"Consentimento"};

export function WhatsAppContactProvider({children}:{children:ReactNode}){
  const[request,setRequest]=useState<ContactRequest|null>(null);const[step,setStep]=useState<"form"|"review">("form");const[saving,setSaving]=useState(false);const[saveMessage,setSaveMessage]=useState("");const[allowFallback,setAllowFallback]=useState(false);
  const form=useForm<LeadFormData>({resolver:zodResolver(leadFormSchema),defaultValues:defaults});
  function openContact(next:ContactRequest){setRequest({...next,pageUrl:window.location.href});setStep("form");setSaveMessage("");setAllowFallback(false);form.reset({...defaults,...next.initialLead,interest:next.initialInterest??next.initialLead?.interest??"Receber roteiro",desiredPeriod:next.period??next.initialLead?.desiredPeriod??""})}
  function close(){setRequest(null)}
  async function confirm(values:LeadFormData){if(!request)return;setSaving(true);setSaveMessage("");const result=await savePublicLead(values,request,request.buttonText);setSaving(false);setSaveMessage(result.message);if(!result.saved){setAllowFallback(true);return}openWhatsApp(values)}
  function openWhatsApp(values:LeadFormData){if(!request)return;const message=createLeadWhatsAppMessage(values,request);trackWhatsAppClick({buttonText:request.buttonText,tripName:request.tripName,lead:values});window.open(createWhatsAppLink(message),"_blank","noopener,noreferrer");close()}
  const values=form.watch();
  return <ContactContext.Provider value={{openContact}}>{children}{request?<div className="contact-modal" role="dialog" aria-modal="true" aria-labelledby="contact-title" onMouseDown={e=>e.target===e.currentTarget&&close()}><form className="contact-form expanded" onSubmit={step==="form"?form.handleSubmit(()=>setStep("review")):form.handleSubmit(confirm)}><button type="button" className="contact-close" onClick={close} aria-label="Fechar formulário"><X/></button><p className="eyebrow">Atendimento personalizado</p><h2 id="contact-title">{step==="form"?"Conte como podemos ajudar.":"Confira sua solicitação"}</h2><p>{request.tripName?`Interesse em ${request.tripName}`:"Sua solicitação será revisada antes de abrir o WhatsApp."}</p>{step==="form"?<div className="contact-fields full-form">
    <label>Nome completo *<input autoFocus {...form.register("name")}/><small>{form.formState.errors.name?.message}</small></label><label>WhatsApp *<input inputMode="tel" {...form.register("phone")}/><small>{form.formState.errors.phone?.message}</small></label>
    <label>E-mail<input type="email" {...form.register("email")}/><small>{form.formState.errors.email?.message}</small></label><label>Cidade<input {...form.register("city")}/></label><label>Estado<input maxLength={2} placeholder="UF" {...form.register("state")}/></label>
    <label>Experiência ou caravana<input value={request.tripName??"Atendimento geral"} readOnly/></label><label>Período desejado<input placeholder="Ex.: segundo semestre de 2027" {...form.register("desiredPeriod")}/></label><label>Quantidade de viajantes<input min="1" type="number" {...form.register("travelers")}/></label>
    <label>Tipo de acomodação<select {...form.register("accommodation")}><option>A definir</option><option>Individual</option><option>Duplo</option><option>Triplo</option></select></label><label>Cidade de embarque<input {...form.register("departureCity")}/></label><label>Pagamento desejado<select {...form.register("paymentPreference")}><option>A definir</option><option>À vista</option><option>Parcelamento</option><option>Quero conhecer as opções</option></select></label>
    <label>Interesse principal<select {...form.register("interest")}><option>Receber roteiro</option><option>Consultar valores</option><option>Ver disponibilidade</option><option>Reservar vaga</option><option>Solicitar proposta</option><option>Outro</option></select></label><label>Tipo de grupo<input placeholder="Igreja, família, empresa..." {...form.register("groupType")}/></label><label className="field-wide">Observações<textarea {...form.register("notes")}/></label>
    <label className="consent-field field-wide"><input type="checkbox" {...form.register("consent")}/><span>Autorizo a Viagem Perfeita Turismo a entrar em contato comigo sobre esta solicitação. <Link href="/politica-de-privacidade" target="_blank">Política de privacidade</Link>.</span><small>{form.formState.errors.consent?.message}</small></label>
  </div>:<div className="request-review"><div className="review-context"><b>Experiência</b><span>{request.tripName||"Atendimento geral"}</span>{request.destination?<><b>Destino</b><span>{request.destination}</span></>:null}</div>{(Object.keys(reviewLabels) as Array<keyof LeadFormData>).filter(k=>k!=="consent"&&Boolean(values[k])).map(k=><div key={k}><b>{reviewLabels[k]}</b><span>{String(values[k])}</span></div>)}<p><Check/> Revise os dados acima. Campos vazios não serão enviados.</p></div>}
  {saveMessage?<div className={allowFallback?"save-status warning":"save-status"}>{saveMessage}</div>:null}<div className="contact-actions">{step==="review"?<button type="button" className="contact-back" onClick={()=>{setStep("form");setSaveMessage("");setAllowFallback(false)}}><ChevronLeft/> Voltar e editar</button>:null}<button className="contact-submit" type="submit" disabled={saving}>{step==="form"?"Revisar solicitação":saving?"Registrando...":"Continuar pelo WhatsApp"}<MessageCircle/></button>{step==="review"&&allowFallback?<button type="button" className="contact-fallback" onClick={()=>openWhatsApp(values)}>Continuar sem registro online</button>:null}</div></form></div>:null}</ContactContext.Provider>
}
