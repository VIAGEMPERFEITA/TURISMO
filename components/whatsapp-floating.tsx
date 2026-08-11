"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { WhatsAppLink } from "./whatsapp-link";

export function WhatsAppFloating() {
  const [visible, setVisible] = useState(true);
  const pathname = usePathname();
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  if (!visible || pathname.startsWith("/admin")) return null;

  return <aside className="whatsapp-card" aria-label="Atendimento pelo WhatsApp">
    <WhatsAppLink className="whatsapp-card-link" buttonText="Fale com um consultor">
      <span className="whatsapp-card-icon" aria-hidden="true"><img src={`${base}/icons/whatsapp.svg`} alt="" /></span>
      <span className="whatsapp-card-copy"><strong>Precisa de ajuda?</strong><small>Entre em contato com a nossa equipe pelo WhatsApp.</small></span>
    </WhatsAppLink>
    <button type="button" className="whatsapp-card-close" onClick={() => setVisible(false)} aria-label="Fechar atendimento flutuante"><X /></button>
  </aside>;
}
