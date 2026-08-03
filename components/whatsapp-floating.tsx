import { MessageCircle } from "lucide-react";
import { WhatsAppLink } from "./whatsapp-link";

export function WhatsAppFloating() {
  return (
    <WhatsAppLink className="whatsapp" aria-label="Fale com um consultor pelo WhatsApp" buttonText="Fale com um consultor">
      <span className="whatsapp-tooltip">Fale com um consultor</span>
      <MessageCircle aria-hidden="true" fill="currentColor" />
      <span className="whatsapp-label">Fale pelo WhatsApp</span>
    </WhatsAppLink>
  );
}
