import type { Metadata } from "next";
import { Mail, MessageCircle } from "lucide-react";
import { BasicContentPage } from "../../components/basic-content-page";
import { WhatsAppLink } from "../../components/whatsapp-link";
import { companyContact } from "../../lib/company-contact";
import { siteConfig } from "../../lib/site-config";
export const metadata:Metadata={title:"Contato | Viagem Perfeita Turismo",description:"Fale com a equipe da Viagem Perfeita Turismo.",alternates:{canonical:"/contato"}};
export default function Page(){return <BasicContentPage eyebrow="Contato" title="Vamos conversar sobre a sua próxima viagem." description="Preencha suas preferências e confira a solicitação antes de continuar para o WhatsApp."><div className="contact-page-grid"><div><MessageCircle/><h2>Atendimento pelo WhatsApp</h2><p>{companyContact.displayNumber}<br/>{siteConfig.business.serviceHours}</p><WhatsAppLink buttonText="Fale conosco">Fale conosco</WhatsAppLink></div><div><Mail/><h2>E-mail</h2><p>{siteConfig.business.email || "O e-mail institucional ainda aguarda confirmação para publicação."}</p></div></div></BasicContentPage>}
