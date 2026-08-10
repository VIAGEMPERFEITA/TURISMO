import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight,CheckCircle2,FileCheck2,MessageCircle,ShieldCheck,WalletCards} from "lucide-react";
import {PublicFooter,PublicHeader} from "../../components/public-shell";
import {WhatsAppLink} from "../../components/whatsapp-link";

export const metadata:Metadata={title:"Como reservar sua viagem | Viagem Perfeita Turismo",description:"Entenda as etapas para receber informações, validar condições e confirmar sua reserva com segurança."};
const steps=[
 [MessageCircle,"1. Conte o que procura","Informe destino, período, quantidade de viajantes e cidade de embarque."],
 [FileCheck2,"2. Receba a proposta oficial","A equipe apresenta roteiro, inclusões, exclusões, disponibilidade, valores e condições vigentes."],
 [WalletCards,"3. Escolha as condições","Tire dúvidas e escolha a composição de pagamento disponível para a viagem."],
 [ShieldCheck,"4. Confirme com segurança","A reserva só é confirmada após aceite das condições, contrato e procedimentos oficiais."],
] as const;
export default function HowToBook(){return <main><PublicHeader/><section className="inner-hero"><div className="shell"><p className="eyebrow light">Processo transparente</p><h1>Como reservar sua viagem</h1><p>Interesse não significa reserva confirmada. Veja como nossa equipe cuida de cada etapa.</p></div></section><section className="section"><div className="shell"><div className="catalog-notice"><CheckCircle2/><div><b>Informação comercial aberta</b><br/><span>“Disponível” indica atendimento comercial aberto. A confirmação depende de disponibilidade real, proposta, contrato e pagamento.</span></div></div><div className="process-grid">{steps.map(([Icon,title,text])=><article key={title}><Icon/><h2>{title}</h2><p>{text}</p></article>)}</div><div className="reserve"><h2>Pronto para começar?</h2><p>Preencha seus dados e receba somente informações oficiais e atualizadas.</p><WhatsAppLink buttonText="Receber valores e condições" initialInterest="Receber valores e condições">Receber valores e condições <ArrowRight/></WhatsAppLink><Link className="text-link" href="/caravanas">Ver caravanas disponíveis <ArrowRight/></Link></div></div></section><PublicFooter/></main>}
