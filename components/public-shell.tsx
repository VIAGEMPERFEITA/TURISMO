"use client";

import Link from "next/link";
import { Menu, MessageCircle, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { companyContact } from "../lib/company-contact";
import { publicNavigation, siteConfig } from "../lib/site-config";
import { CompanyLogo } from "./company-logo";
import { WhatsAppLink } from "./whatsapp-link";
import { Breadcrumbs } from "./breadcrumbs";

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  return <header className="header public-page-header"><div className="nav shell"><CompanyLogo variant="dark" href="/"/><nav className={open ? "navlinks open" : "navlinks"} aria-label="Navegação principal">{publicNavigation.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}</nav><WhatsAppLink className="nav-cta" buttonText="Fale com um consultor"><MessageCircle size={17}/> Fale com um consultor</WhatsAppLink><button className="menu" onClick={() => setOpen(!open)} aria-label={open ? "Fechar menu" : "Abrir menu"}>{open ? <X/> : <Menu/>}</button></div></header>;
}

export function PublicFooter() {
  return <footer><div className="shell footer-newsletter"><div><b>Inspiração e preparação para sua próxima jornada</b><p>Receba informações sobre experiências, destinos e novos conteúdos.</p></div><Link href="/contato">Quero receber novidades</Link></div><div className="shell footer-grid"><div><CompanyLogo variant="dark" href="/"/><p>Viagens de fé, cultura e experiências transformadoras planejadas com presença e cuidado.</p><a href={siteConfig.instagram} target="_blank" rel="noopener noreferrer">{siteConfig.instagramHandle}</a></div><div><b>Explore</b><Link href="/caravanas">Experiências</Link><Link href="/destinos">Destinos</Link><Link href="/quem-somos">Quem somos</Link><Link href="/caravanas-realizadas">Caravanas realizadas</Link><Link href="/historias">Depoimentos</Link></div><div><b>Planeje</b><Link href="/viagens-personalizadas">Viagens personalizadas</Link><Link href="/lideres-de-caravanas">Líderes de caravanas</Link><Link href="/documentacao">Documentação</Link><Link href="/perguntas-frequentes">Perguntas frequentes</Link><Link href="/blog">Blog</Link></div><div><b>Destinos</b><Link href="/destinos/israel">Israel</Link><Link href="/destinos/egito">Egito</Link><Link href="/destinos/jordania">Jordânia</Link><Link href="/destinos/turquia">Turquia</Link><Link href="/destinos/grecia">Grécia</Link></div><div><b>Atendimento</b><p>{siteConfig.business.serviceHours}<br/>{companyContact.displayNumber}</p><Link href="/contato">Fale conosco</Link><WhatsAppLink buttonText="Atendimento pelo WhatsApp">Atendimento pelo WhatsApp</WhatsAppLink></div></div><div className="shell copyright"><span>© 2026 {siteConfig.name}</span><span><Link href="/politica-de-privacidade">Privacidade</Link> · <Link href="/termos-de-uso">Termos</Link> · <Link href="/politica-de-cookies">Cookies</Link></span></div></footer>;
}

export function PublicPage({ children }: { children: ReactNode }) { return <><PublicHeader/><Breadcrumbs/><main className="public-page">{children}</main><PublicFooter/></>; }
