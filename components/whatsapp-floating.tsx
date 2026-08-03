"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { WhatsAppLink } from "./whatsapp-link";

export function WhatsAppFloating(){const[visible,setVisible]=useState(true);const base=process.env.NEXT_PUBLIC_BASE_PATH??"";if(!visible)return null;return <aside className="whatsapp-card" aria-label="Atendimento pelo WhatsApp"><WhatsAppLink className="whatsapp-card-link" aria-label="Precisa de ajuda? Entre em contato com a nossa equipe pelo WhatsApp" buttonText="Fale com um consultor"><span className="whatsapp-card-icon" aria-hidden="true"><img src={`${base}/icons/whatsapp.svg`} alt=""/></span><span className="whatsapp-card-copy"><strong>Precisa de ajuda?</strong><small>Entre em contato com a nossa equipe pelo WhatsApp.</small></span></WhatsAppLink><button type="button" className="whatsapp-card-close" onClick={()=>setVisible(false)} aria-label="Fechar atendimento flutuante"><X/></button></aside>}
