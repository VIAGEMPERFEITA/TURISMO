"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight, CalendarDays, Camera, ChevronDown, CircleCheck, Clock3, Globe2,
  HeartHandshake, Menu, MessageCircle, Plane, Play, Quote,
  ShieldCheck, Sparkles, Users, X
} from "lucide-react";
import { WhatsAppLink } from "../components/whatsapp-link";
import { TripCard } from "../components/trip-card";
import { CompanyLogo } from "../components/company-logo";
import { RealJourneysGallery } from "../components/real-journeys-gallery";
import { PublicFooter } from "../components/public-shell";
import { publishedTrips } from "../lib/trips";
import { publicNavigation, siteConfig } from "../lib/site-config";

const destinations = [
  ["Israel", "Onde as Escrituras ganham vida", "https://images.unsplash.com/photo-1548018560-c7196548e84d?auto=format&fit=crop&w=900&q=80"],
  ["Egito", "A origem de uma história milenar", "https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=900&q=80"],
  ["Grécia", "Pelos caminhos do apóstolo Paulo", "https://images.unsplash.com/photo-1504512485720-7d83a16ee930?auto=format&fit=crop&w=900&q=80"],
  ["Jordânia", "Desertos, promessas e contemplação", "https://images.unsplash.com/photo-1548786811-dd6e453ccca7?auto=format&fit=crop&w=900&q=80"],
];
const destinationSlugs = ["israel", "egito", "grecia", "jordania"];

const faqs = [
  ["Preciso ter experiência com viagens internacionais?", "Não. Nossa equipe acompanha você desde a documentação até o retorno ao Brasil. Antes do embarque, realizamos encontros de preparação e entregamos orientações claras para cada etapa."],
  ["As caravanas têm acompanhamento em português?", "Sim. Você viaja com coordenação brasileira e guias locais especializados, com suporte em português durante todo o roteiro."],
  ["Posso parcelar a minha viagem?", "Sim. Cada caravana possui condições próprias de pagamento. Fale com um especialista para receber a melhor composição para você."],
];

const instagramTestimonials = [
  { quote: "Foi incrível! Momentos maravilhosos com esta caravana de fé.", author: "Eliana Souza", context: "Caravana em Israel", url: "https://www.instagram.com/viagemperfeitatrip/reel/DCC391rROqj/" },
  { quote: "Muito top! Vale super a pena.", author: "Kathreina", context: "Experiência em Orvieto, Itália", url: "https://www.instagram.com/viagemperfeitatrip/reel/DH6PnxPRpjH/" },
];

export default function Home() {
  const [menu, setMenu] = useState(false);
  const [faq, setFaq] = useState(0);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactDestination, setContactDestination] = useState("");
  useEffect(()=>{document.body.classList.toggle("menu-open",menu);return()=>document.body.classList.remove("menu-open")},[menu]);
  return (
    <main id="inicio">
      <header className="header">
        <div className="nav shell"><CompanyLogo variant="dark" href="/" />
          <nav id="home-main-navigation" className={menu ? "navlinks open" : "navlinks"} aria-label="Navegação principal">
            {publicNavigation.map(([label,href])=><Link href={href} key={href} onClick={()=>setMenu(false)}>{label}</Link>)}
          </nav>
          <WhatsAppLink className="nav-cta" buttonText="Fale com um consultor"><MessageCircle size={17}/> Fale com um consultor</WhatsAppLink>
          <button type="button" className="menu" onClick={() => setMenu(!menu)} aria-label={menu?"Fechar menu":"Abrir menu"} aria-expanded={menu} aria-controls="home-main-navigation">{menu ? <X/> : <Menu/>}</button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-image" aria-hidden="true" />
        <div className="hero-shade" />
        <div className="hero-content shell">
          <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:.75}} className="hero-copy">
            <p className="eyebrow light"><Sparkles size={15}/> Turismo religioso premium</p>
            <h1>Mais que uma viagem.<br/><em>Um encontro</em> com a sua fé.</h1>
            <p className="hero-lead">Jornadas internacionais cuidadosamente planejadas para você viver o extraordinário com segurança, propósito e todo o cuidado.</p>
            <div className="hero-actions"><Link className="btn primary" href="/caravanas">Conheça as caravanas <ArrowRight size={18}/></Link><Link className="btn ghost" href="/quem-somos"><Play size={16} fill="currentColor"/> Nossa história</Link></div>
            <a className="hero-proof instagram-proof" href={siteConfig.instagram} target="_blank" rel="noopener noreferrer" aria-label="Ver o Instagram da Viagem Perfeita Turismo"><Camera/><div><strong>Mais de 10 mil seguidores</strong><small>acompanham nossas jornadas no Instagram</small></div><ArrowRight/></a>
          </motion.div>
          <motion.aside initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} transition={{delay:.2,duration:.7}} className="hero-card">
            <span className="live"><i/> Atendimento personalizado</span><p>Planeje com segurança</p><h3>Encontre sua próxima jornada</h3><div className="hero-meta"><span><CalendarDays/>Datas validadas</span><span><ShieldCheck/>Suporte próximo</span></div><div className="line"/><small>Receba somente informações oficiais da nossa equipe</small><WhatsAppLink buttonText="Falar com um consultor">Falar com um consultor <ArrowRight/></WhatsAppLink>
          </motion.aside>
        </div>
        <div className="trustbar shell"><span><ShieldCheck/>Assistência em cada etapa</span><span><Users/>Grupos cuidadosamente acompanhados</span><span><Globe2/>Curadoria internacional</span><span><HeartHandshake/>Atendimento humano</span></div>
      </section>

      <section className="section home-featured-experiences" aria-labelledby="featured-experiences-title"><div className="shell">
        <div className="section-head"><div><p className="eyebrow">Próximas caravanas</p><h2 id="featured-experiences-title">Escolha sua próxima<br/>jornada.</h2></div><p className="featured-intro">Experiências que unem fé, história, cultura e propósito, apresentadas em ordem de prioridade e saída.</p></div>
        <div className="catalog-grid home-confirmed-grid">{publishedTrips.slice(0,8).map((trip)=><TripCard key={trip.id} trip={trip}/>)}</div>
        <Link className="journey-all-link" href="/caravanas">Ver catálogo completo <ArrowRight size={16}/></Link>
      </div></section>

      <section className="intro section" id="sobre"><div className="shell intro-grid">
        <div><p className="eyebrow">Por que Viagem Perfeita</p><h2>A tranquilidade de ser cuidado.<br/><em>A emoção de se transformar.</em></h2></div>
        <div className="intro-copy"><p>Acreditamos que uma grande viagem começa muito antes do embarque. Ela nasce na escuta, ganha forma nos detalhes e se torna inesquecível quando cada viajante se sente verdadeiramente acolhido.</p><Link href="/quem-somos">Conheça a nossa essência <ArrowRight/></Link></div>
      </div>
      <div className="shell metrics"><div><strong>Cuidado</strong><span>em cada detalhe da jornada</span></div><div><strong>Clareza</strong><span>nas informações comerciais</span></div><div><strong>Presença</strong><span>antes, durante e depois</span></div><div><strong>Propósito</strong><span>em cada experiência</span></div></div>
      </section>

      <section className="experience section"><div className="shell experience-grid"><div className="experience-photo"><div className="floating-note"><Quote/><p>Cada informação publicada passa pela validação da equipe antes de chegar até você.</p><span>Compromisso Viagem Perfeita</span></div></div><div className="experience-copy"><p className="eyebrow light">O nosso jeito de cuidar</p><h2>Você vive a experiência.<br/><em>Nós cuidamos de tudo.</em></h2><p>Da primeira conversa ao abraço na volta, cada detalhe é pensado para que você viaje com leveza, confiança e presença.</p><ul><li><CircleCheck/>Roteiros com propósito e ritmo equilibrado</li><li><CircleCheck/>Informações comerciais apresentadas com clareza</li><li><CircleCheck/>Acompanhamento próximo em cada etapa</li><li><CircleCheck/>Orientação de documentos e preparação</li></ul><WhatsAppLink className="btn warm" buttonText="Solicitar orçamento">Solicitar orçamento <ArrowRight/></WhatsAppLink></div></div></section>

      <RealJourneysGallery preview />

      <section className="section leaders-home"><div className="shell experience-grid"><div className="experience-copy"><p className="eyebrow">Pastores, líderes e grupos</p><h2>Monte sua própria<br/><em>caravana.</em></h2><p>Transformamos o propósito do seu grupo em uma jornada organizada, com criação de roteiro, apoio de divulgação, captação de interessados, reuniões preparatórias, operação e acompanhamento dos participantes.</p><ul><li><CircleCheck/>Igrejas, ministérios e comunidades</li><li><CircleCheck/>Cantores, grupos familiares e empresas</li><li><CircleCheck/>Atendimento próximo ao líder e aos viajantes</li></ul><Link className="btn primary" href="/lideres-de-caravanas">Conhecer o atendimento para líderes <ArrowRight/></Link></div><div className="leaders-home-panel"><Users/><p className="eyebrow light">Do propósito ao embarque</p><h3>Uma equipe ao lado do seu grupo em cada etapa.</h3><WhatsAppLink buttonText="Montar minha caravana" tripName="Caravana para grupo próprio" initialInterest="Solicitar proposta para líderes">Falar com um consultor <MessageCircle/></WhatsAppLink></div></div></section>

      <section className="section destinations" id="destinos"><div className="shell"><div className="section-head"><div><p className="eyebrow">Destinos com significado</p><h2>O mundo é vasto.<br/>Escolhemos o que transforma.</h2></div><Link className="text-link" href="/destinos">Conhecer todos os destinos <ArrowRight/></Link></div><div className="destination-grid">{destinations.map(([name,desc,img],i)=><Link href={`/destinos/${destinationSlugs[i]}`} className={`destination d${i}`} key={name} style={{backgroundImage:`linear-gradient(180deg,transparent 45%,rgba(7,24,20,.85)),url(${img})`}}><span>0{i+1}</span><div><h3>{name}</h3><p>{desc}</p></div><ArrowRight/></Link>)}</div></div></section>

      <section className="section stories" id="historias"><div className="shell"><div className="stories-heading"><div><p className="eyebrow">Experiências reais</p><h2>Quem viaja, volta com<br/><em>uma história para contar.</em></h2></div><p>Relatos públicos de pessoas que acompanharam experiências da Viagem Perfeita, preservados com sua origem para você conferir.</p></div><div className="testimonial-grid">{instagramTestimonials.map((testimonial)=><a className="testimonial-card" href={testimonial.url} target="_blank" rel="noopener noreferrer" key={testimonial.url}><Quote/><blockquote>“{testimonial.quote}”</blockquote><div><span><strong>{testimonial.author}</strong><small>{testimonial.context}</small></span><span className="testimonial-source"><Camera/> Ver no Instagram</span></div></a>)}</div><div className="instagram-community"><div><Camera/><span><strong>Acompanhe a Viagem Perfeita</strong><small>Israel, Europa e jornadas que unem história, cultura e fé.</small></span></div><a href="https://www.instagram.com/viagemperfeitatrip" target="_blank" rel="noopener noreferrer">@viagemperfeitatrip <ArrowRight/></a></div><p className="verified-content-note">Depoimentos extraídos de comentários públicos no perfil oficial. Grafia ajustada apenas para leitura, sem alterar o sentido.</p></div></section>

      <section className="section faq"><div className="shell faq-grid"><div><p className="eyebrow">Antes de embarcar</p><h2>Suas dúvidas,<br/>respondidas com clareza.</h2><p>Nossa equipe está pronta para cuidar de tudo que você precisa.</p></div><div>{faqs.map(([q,a],i)=><div className="faq-item" key={q}><button onClick={()=>setFaq(faq===i?-1:i)}><span>{q}</span><ChevronDown className={faq===i?"rotate":""}/></button><AnimatePresence>{faq===i&&<motion.p initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}>{a}</motion.p>}</AnimatePresence></div>)}</div></div></section>

      <section className="cta" id="contato"><div className="cta-bg"/><div className="shell cta-content"><p className="eyebrow light">Sua próxima história começa aqui</p><h2>Qual é a viagem<br/>dos seus sonhos?</h2><p>Conte para a gente. Um especialista vai ouvir você e criar o melhor caminho para transformar esse sonho em realidade.</p><form onSubmit={e=>e.preventDefault()}><input aria-label="Seu nome" placeholder="Seu nome" value={contactName} onChange={e=>setContactName(e.target.value)}/><input aria-label="WhatsApp" placeholder="Seu WhatsApp" value={contactPhone} onChange={e=>setContactPhone(e.target.value)}/><select aria-label="Destino de interesse" value={contactDestination} onChange={e=>setContactDestination(e.target.value)}><option value="" disabled>Destino de interesse</option><option>Israel</option><option>Egito</option><option>Grécia e Turquia</option><option>Outro destino</option></select><WhatsAppLink className="btn warm" destination={contactDestination || undefined} initialLead={{name:contactName || undefined,phone:contactPhone || undefined}} buttonText="Quero viajar">Quero viajar <ArrowRight/></WhatsAppLink></form><small><ShieldCheck/> Seus dados estão seguros. Atendimento sem compromisso.</small></div></section>

      <PublicFooter />
    </main>
  );
}
