"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight, CalendarDays, ChevronDown, CircleCheck, Clock3, Globe2,
  HeartHandshake, Menu, MessageCircle, Plane, Play, Quote,
  ShieldCheck, Sparkles, Star, Users, X
} from "lucide-react";
import { WhatsAppLink } from "../components/whatsapp-link";
import { companyContact } from "../lib/company-contact";
import { featuredTrips } from "../lib/trips";

const destinations = [
  ["Israel", "Onde as Escrituras ganham vida", "https://images.unsplash.com/photo-1548018560-c7196548e84d?auto=format&fit=crop&w=900&q=80"],
  ["Egito", "A origem de uma história milenar", "https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=900&q=80"],
  ["Grécia", "Pelos caminhos do apóstolo Paulo", "https://images.unsplash.com/photo-1504512485720-7d83a16ee930?auto=format&fit=crop&w=900&q=80"],
  ["Jordânia", "Desertos, promessas e contemplação", "https://images.unsplash.com/photo-1548786811-dd6e453ccca7?auto=format&fit=crop&w=900&q=80"],
];

const faqs = [
  ["Preciso ter experiência com viagens internacionais?", "Não. Nossa equipe acompanha você desde a documentação até o retorno ao Brasil. Antes do embarque, realizamos encontros de preparação e entregamos orientações claras para cada etapa."],
  ["As caravanas têm acompanhamento em português?", "Sim. Você viaja com coordenação brasileira e guias locais especializados, com suporte em português durante todo o roteiro."],
  ["Posso parcelar a minha viagem?", "Sim. Cada caravana possui condições próprias de pagamento. Fale com um especialista para receber a melhor composição para você."],
];

function Logo() {
  return <a className="brand" href="#inicio" aria-label="Viagem Perfeita — início"><span className="brand-mark">VP</span><span><b>Viagem Perfeita</b><small>Turismo & experiências</small></span></a>;
}

export default function Home() {
  const [menu, setMenu] = useState(false);
  const [faq, setFaq] = useState(0);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactDestination, setContactDestination] = useState("");
  const featuredTrip = featuredTrips[0];
  return (
    <main id="inicio">
      <header className="header">
        <div className="nav shell"><Logo />
          <nav className={menu ? "navlinks open" : "navlinks"} aria-label="Navegação principal">
            <a href="#caravanas">Caravanas</a><a href="#destinos">Destinos</a><a href="#sobre">Quem somos</a><a href="#historias">Histórias</a><a href="#contato">Contato</a>
          </nav>
          <WhatsAppLink className="nav-cta" buttonText="Fale com um consultor"><MessageCircle size={17}/> Fale com um consultor</WhatsAppLink>
          <button className="menu" onClick={() => setMenu(!menu)} aria-label="Abrir menu">{menu ? <X/> : <Menu/>}</button>
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
            <div className="hero-actions"><a className="btn primary" href="#caravanas">Conheça as caravanas <ArrowRight size={18}/></a><a className="btn ghost" href="#sobre"><Play size={16} fill="currentColor"/> Nossa história</a></div>
            <div className="hero-proof"><div className="avatars"><span>MR</span><span>AS</span><span>JL</span></div><div><div className="stars"><Star/><Star/><Star/><Star/><Star/></div><small>Viajantes que viveram o inesquecível</small></div></div>
          </motion.div>
          <motion.aside initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} transition={{delay:.2,duration:.7}} className="hero-card">
            <span className="live"><i/> Viagem em demonstração</span><p>{featuredTrip.destination}</p><h3>{featuredTrip.shortTitle}</h3><div className="hero-meta"><span><CalendarDays/>{featuredTrip.period}</span><span><Clock3/>{featuredTrip.days}</span></div><div className="line"/><small>Informações sujeitas à confirmação</small><WhatsAppLink tripName={featuredTrip.title} destination={featuredTrip.destination} period={featuredTrip.period} buttonText="Tenho interesse">Tenho interesse <ArrowRight/></WhatsAppLink>
          </motion.aside>
        </div>
        <div className="trustbar shell"><span><ShieldCheck/>Assistência em cada etapa</span><span><Users/>Grupos cuidadosamente acompanhados</span><span><Globe2/>Curadoria internacional</span><span><HeartHandshake/>Atendimento humano</span></div>
      </section>

      <section className="intro section" id="sobre"><div className="shell intro-grid">
        <div><p className="eyebrow">Por que Viagem Perfeita</p><h2>A tranquilidade de ser cuidado.<br/><em>A emoção de se transformar.</em></h2></div>
        <div className="intro-copy"><p>Acreditamos que uma grande viagem começa muito antes do embarque. Ela nasce na escuta, ganha forma nos detalhes e se torna inesquecível quando cada viajante se sente verdadeiramente acolhido.</p><a href="#contato">Conheça a nossa essência <ArrowRight/></a></div>
      </div>
      <div className="shell metrics"><div><strong>10,6 mil</strong><span>pessoas em nossa comunidade</span></div><div><strong>100%</strong><span>acompanhamento especializado</span></div><div><strong>9+</strong><span>destinos internacionais</span></div><div><strong>24/7</strong><span>suporte durante a viagem</span></div></div>
      </section>

      <section className="section trips-section" id="caravanas"><div className="shell">
        <div className="section-head"><div><p className="eyebrow">Próximas jornadas</p><h2>Escolha onde sua fé<br/>vai te levar.</h2></div><Link className="text-link" href="/caravanas">Ver todas as caravanas <ArrowRight/></Link></div>
        <div className="trip-grid">{featuredTrips.map((trip,i)=><motion.article initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*.1}} className="trip-card" key={trip.slug}>
          <Link className="trip-card-link" href={`/caravanas/${trip.slug}`} aria-label={`Ver detalhes de ${trip.title}`}><div className="trip-img" style={{backgroundImage:`linear-gradient(180deg,transparent 55%,rgba(5,23,19,.56)),url(${trip.image})`}}><span className="status demo">{trip.status}</span><span className="trip-place">{trip.destination}</span></div>
          <div className="trip-body"><p>{trip.period}</p><h3>{trip.title}</h3><div className="trip-meta"><span><Clock3/> {trip.days}</span><span><Plane/> Saída de {trip.departure}</span></div><span className="trip-discover">Descobrir esta jornada <ArrowRight/></span></div></Link>
        </motion.article>)}</div>
      </div></section>

      <section className="experience section"><div className="shell experience-grid"><div className="experience-photo"><div className="floating-note"><Quote/><p>“Eu voltei diferente. A organização nos deu liberdade para viver cada momento com paz.”</p><span>— Marisa, peregrina 2024</span></div></div><div className="experience-copy"><p className="eyebrow light">O nosso jeito de cuidar</p><h2>Você vive a experiência.<br/><em>Nós cuidamos de tudo.</em></h2><p>Da primeira conversa ao abraço na volta, cada detalhe é pensado para que você viaje com leveza, confiança e presença.</p><ul><li><CircleCheck/>Roteiros autorais com propósito e ritmo equilibrado</li><li><CircleCheck/>Hotéis, voos e parceiros selecionados com rigor</li><li><CircleCheck/>Acompanhamento próximo antes, durante e depois</li><li><CircleCheck/>Orientação completa de documentos e bagagem</li></ul><WhatsAppLink className="btn warm" buttonText="Solicitar orçamento">Solicitar orçamento <ArrowRight/></WhatsAppLink></div></div></section>

      <section className="section destinations" id="destinos"><div className="shell"><div className="section-head"><div><p className="eyebrow">Destinos com significado</p><h2>O mundo é vasto.<br/>Escolhemos o que transforma.</h2></div><p className="side-copy">Lugares que carregam história, beleza e a força de experiências que permanecem para sempre.</p></div><div className="destination-grid">{destinations.map(([name,desc,img],i)=><WhatsAppLink buttonText={`Tenho interesse — ${name}`} className={`destination d${i}`} key={name} style={{backgroundImage:`linear-gradient(180deg,transparent 45%,rgba(7,24,20,.85)),url(${img})`}}><span>0{i+1}</span><div><h3>{name}</h3><p>{desc}</p></div><ArrowRight/></WhatsAppLink>)}</div></div></section>

      <section className="section stories" id="historias"><div className="shell stories-grid"><div><p className="eyebrow">Histórias reais</p><h2>Quem viaja com a gente,<br/><em>leva algo para sempre.</em></h2><div className="big-quote">“</div><blockquote>Em cada cidade havia alguém da equipe olhando por nós. Eu fui sozinha, mas nunca me senti só. Foi a viagem da minha vida.</blockquote><div className="person"><span>LC</span><div><b>Lúcia Carvalho</b><small>Caravana Israel & Jordânia</small></div></div></div><div className="story-video"><button aria-label="Assistir depoimento"><Play fill="currentColor"/></button><span>Assista à história de Lúcia</span></div></div></section>

      <section className="section faq"><div className="shell faq-grid"><div><p className="eyebrow">Antes de embarcar</p><h2>Suas dúvidas,<br/>respondidas com clareza.</h2><p>Nossa equipe está pronta para cuidar de tudo que você precisa.</p></div><div>{faqs.map(([q,a],i)=><div className="faq-item" key={q}><button onClick={()=>setFaq(faq===i?-1:i)}><span>{q}</span><ChevronDown className={faq===i?"rotate":""}/></button><AnimatePresence>{faq===i&&<motion.p initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}>{a}</motion.p>}</AnimatePresence></div>)}</div></div></section>

      <section className="cta" id="contato"><div className="cta-bg"/><div className="shell cta-content"><p className="eyebrow light">Sua próxima história começa aqui</p><h2>Qual é a viagem<br/>dos seus sonhos?</h2><p>Conte para a gente. Um especialista vai ouvir você e criar o melhor caminho para transformar esse sonho em realidade.</p><form onSubmit={e=>e.preventDefault()}><input aria-label="Seu nome" placeholder="Seu nome" value={contactName} onChange={e=>setContactName(e.target.value)}/><input aria-label="WhatsApp" placeholder="Seu WhatsApp" value={contactPhone} onChange={e=>setContactPhone(e.target.value)}/><select aria-label="Destino de interesse" value={contactDestination} onChange={e=>setContactDestination(e.target.value)}><option value="" disabled>Destino de interesse</option><option>Israel</option><option>Egito</option><option>Grécia e Turquia</option><option>Outro destino</option></select><WhatsAppLink className="btn warm" destination={contactDestination || undefined} initialLead={{name:contactName || undefined,phone:contactPhone || undefined}} buttonText="Quero viajar">Quero viajar <ArrowRight/></WhatsAppLink></form><small><ShieldCheck/> Seus dados estão seguros. Atendimento sem compromisso.</small></div></section>

      <footer><div className="shell footer-grid"><div><Logo/><p>Viagens de fé. Experiências transformadoras.</p><a href="https://www.instagram.com/viagemperfeitatrip"><Globe2/> @viagemperfeitatrip</a></div><div><b>Explore</b><a href="#caravanas">Caravanas</a><a href="#destinos">Destinos</a><a href="#sobre">Quem somos</a><a href="#historias">Depoimentos</a></div><div><b>Planeje</b><WhatsAppLink buttonText="Fale conosco">Fale conosco</WhatsAppLink><a href="#">Documentação</a><a href="#">Dúvidas frequentes</a><a href="#">Blog de viagem</a></div><div><b>Atendimento</b><p>Segunda a sexta<br/>9h às 18h<br/>{companyContact.displayNumber}</p><WhatsAppLink buttonText="Atendimento pelo WhatsApp">Atendimento pelo WhatsApp</WhatsAppLink></div></div><div className="shell copyright"><span>© 2026 Viagem Perfeita Turismo</span><span>Privacidade · Termos</span></div></footer>
    </main>
  );
}
