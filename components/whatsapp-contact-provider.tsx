"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { createLeadWhatsAppMessage, createWhatsAppLink, type TripContactContext, type WhatsAppLead } from "../lib/company-contact";
import { trackWhatsAppClick } from "../lib/whatsapp-tracking";

type ContactRequest = TripContactContext & { buttonText: string; initialInterest?: string; initialLead?: WhatsAppLead };
type ContactContextValue = { openContact: (request: ContactRequest) => void };
const ContactContext = createContext<ContactContextValue | null>(null);

export function useWhatsAppContact() {
  const context = useContext(ContactContext);
  if (!context) throw new Error("useWhatsAppContact must be used inside WhatsAppContactProvider");
  return context;
}

export function WhatsAppContactProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ContactRequest | null>(null);
  const [lead, setLead] = useState<WhatsAppLead>({ travelers: "1", interest: "Receber roteiro" });

  function openContact(next: ContactRequest) {
    setRequest(next);
    setLead({ travelers: "1", interest: next.initialInterest ?? "Receber roteiro", ...next.initialLead });
  }

  function closeContact() { setRequest(null); }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request) return;
    const message = createLeadWhatsAppMessage(lead, request);
    trackWhatsAppClick({ buttonText: request.buttonText, tripName: request.tripName, lead });
    window.open(createWhatsAppLink(message), "_blank", "noopener,noreferrer");
    closeContact();
  }

  return (
    <ContactContext.Provider value={{ openContact }}>
      {children}
      {request && (
        <div className="contact-modal" role="dialog" aria-modal="true" aria-labelledby="contact-title" onMouseDown={(event) => event.target === event.currentTarget && closeContact()}>
          <form className="contact-form" onSubmit={submit}>
            <button type="button" className="contact-close" onClick={closeContact} aria-label="Fechar formulário"><X /></button>
            <p className="eyebrow">Atendimento personalizado</p>
            <h2 id="contact-title">Conte um pouco sobre você.</h2>
            <p>{request.tripName ? `Interesse em ${request.tripName}` : "Nossa equipe prepara o melhor atendimento para a sua próxima viagem."}</p>
            <div className="contact-fields">
              <label>Nome<input required autoFocus value={lead.name ?? ""} onChange={(e) => setLead({...lead,name:e.target.value})} /></label>
              <label>Telefone<input required inputMode="tel" value={lead.phone ?? ""} onChange={(e) => setLead({...lead,phone:e.target.value})} /></label>
              <label>E-mail<input required type="email" value={lead.email ?? ""} onChange={(e) => setLead({...lead,email:e.target.value})} /></label>
              <label>Cidade<input required value={lead.city ?? ""} onChange={(e) => setLead({...lead,city:e.target.value})} /></label>
              <label>Quantidade de viajantes<input required min="1" type="number" value={lead.travelers ?? ""} onChange={(e) => setLead({...lead,travelers:e.target.value})} /></label>
              <label>Interesse principal<select required value={lead.interest ?? ""} onChange={(e) => setLead({...lead,interest:e.target.value})}><option>Receber roteiro</option><option>Consultar valores</option><option>Reservar vaga</option><option>Outro</option></select></label>
            </div>
            <button className="contact-submit" type="submit"><MessageCircle /> Continuar no WhatsApp</button>
            <small>Ao continuar, sua mensagem será preparada automaticamente e aberta no WhatsApp.</small>
          </form>
        </div>
      )}
    </ContactContext.Provider>
  );
}
