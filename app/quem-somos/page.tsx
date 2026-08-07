import type { Metadata } from "next";
import { CheckCircle2, Compass, HeartHandshake, ShieldCheck } from "lucide-react";
import { BasicContentPage } from "../../components/basic-content-page";
import { WhatsAppLink } from "../../components/whatsapp-link";
import { siteConfig } from "../../lib/site-config";

export const metadata:Metadata={title:"Quem somos | Viagem Perfeita Turismo",description:"Conheça o propósito, os compromissos e o jeito de organizar jornadas da Viagem Perfeita Turismo.",alternates:{canonical:"/quem-somos"}};

export default function Page(){
  const credentials = [
    ["Razão social", siteConfig.legalName], ["Nome fantasia", siteConfig.name],
    ["CNPJ", siteConfig.business.cnpj], ["Cadastur", siteConfig.business.cadastur],
    ["Cidade sede", [siteConfig.business.city,siteConfig.business.state].filter(Boolean).join(" / ")],
  ].filter(([,value])=>value);
  return <BasicContentPage eyebrow="Quem somos" title="Presença, clareza e propósito em cada jornada." description="A Viagem Perfeita Turismo organiza experiências culturais e espirituais com atendimento próximo, preparação responsável e cuidado humano.">
    <section className="institutional-intro"><div><p className="eyebrow">Porque existimos</p><h2>Para transformar deslocamentos em experiências com significado.</h2><p>Uma viagem de fé começa na escuta. Entendemos o perfil de cada viajante e de cada grupo para construir uma jornada coerente, acolhedora e transparente — desde a primeira conversa até o retorno.</p></div><img src="https://images.unsplash.com/photo-1763966461585-41a652f12dd3?auto=format&fit=crop&w=2400&q=92" alt="Vista panorâmica de Jerusalém"/></section>
    <div className="value-grid institutional-values"><div><Compass/><h3>Missão</h3><p>Planejar jornadas responsáveis que conectem pessoas, história, cultura e espiritualidade.</p></div><div><HeartHandshake/><h3>Visão</h3><p>Ser reconhecida pelo cuidado humano, pela organização e pela confiança em viagens de propósito.</p></div><div><ShieldCheck/><h3>Valores</h3><p>Verdade, presença, respeito, segurança, excelência e compromisso com cada viajante.</p></div></div>
    <section className="institutional-section"><p className="eyebrow">Como organizamos</p><h2>Uma viagem segura começa muito antes do embarque.</h2><div className="process-grid">{[["01","Escuta","Entendemos propósito, perfil, necessidades e expectativas."],["02","Curadoria","Avaliamos roteiro, ritmo, operação, hospedagem e fornecedores."],["03","Preparação","Orientamos documentos, pagamentos, bagagem e dinâmica do grupo."],["04","Acompanhamento","Mantemos comunicação próxima antes, durante e depois da jornada."]].map(([number,title,text])=><div key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></div>)}</div></section>
    <section className="real-photo-band"><img src="https://images.unsplash.com/photo-1763966461585-41a652f12dd3?auto=format&fit=crop&w=2400&q=92" alt="Vista panorâmica de Jerusalém"/><div><p className="eyebrow light">Compromisso espiritual</p><h2>Conteúdo, contemplação e respeito ao ritmo do grupo.</h2><p>A proposta espiritual é conduzida com sensibilidade e responsabilidade. A coordenação de cada caravana, os líderes participantes e a equipe de acompanhamento são apresentados nas informações oficiais da experiência.</p></div></section>
    <section className="institutional-section"><p className="eyebrow">Porque confiar na Viagem Perfeita</p><h2>Compromissos que orientam cada decisão.</h2><div className="trust-reasons">{["Informações comerciais publicadas somente após validação","Fornecedores avaliados conforme cada operação","Orientação clara de documentação e preparação","Atendimento humano e acompanhamento próximo","Respeito às necessidades e à mobilidade do viajante","Nenhuma promessa de serviço sem confirmação oficial"].map(item=><p key={item}><CheckCircle2/>{item}</p>)}</div></section>
    <section className="credibility-card"><div><p className="eyebrow light">Credibilidade</p><h2>Atendimento oficial e transparente.</h2><p>Consulte nossos canais oficiais para conhecer cada saída, receber as condições vigentes e conversar diretamente com a equipe.</p></div><dl>{credentials.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}<div><dt>Instagram</dt><dd><a href={siteConfig.instagram} target="_blank" rel="noopener noreferrer">{siteConfig.instagramHandle}</a></dd></div><div><dt>WhatsApp</dt><dd>(31) 99528-5665</dd></div></dl></section>
    <div className="content-cta"><h2>Converse com quem cuida de cada detalhe.</h2><p>Conte o que você deseja viver e receba atendimento personalizado.</p><WhatsAppLink buttonText="Falar com um consultor">Falar com um consultor</WhatsAppLink></div>
  </BasicContentPage>
}
