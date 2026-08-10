"use client";
import Link from "next/link";
import {
  Camera,
  ChevronDown,
  Menu,
  MessageCircle,
  Play,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { companyContact } from "../lib/company-contact";
import { siteConfig } from "../lib/site-config";
import { CompanyLogo } from "./company-logo";
import { WhatsAppLink } from "./whatsapp-link";
import { Breadcrumbs } from "./breadcrumbs";
const Instagram = Camera;
const Youtube = Play;
function Facebook() {
  return (
    <strong className="facebook-glyph" aria-hidden="true">
      f
    </strong>
  );
}

function HeaderNavigation({ close }: { close: () => void }) {
  return (
    <>
      <details className="nav-dropdown">
        <summary>
          Caravanas
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className="nav-dropdown-menu">
          <Link href="/caravanas" onClick={close}>
            Próximas caravanas
          </Link>
          <Link href="/caravanas-realizadas" onClick={close}>
            Caravanas realizadas
          </Link>
          <Link href="/viagens-personalizadas" onClick={close}>
            Viagens personalizadas
          </Link>
          <Link href="/lideres-de-caravanas" onClick={close}>
            Líderes de caravanas
          </Link>
        </div>
      </details>
      <details className="nav-dropdown">
        <summary>
          Destinos
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className="nav-dropdown-menu">
          <Link href="/destinos" onClick={close}>
            Todos os destinos
          </Link>
          <Link href="/destinos/israel" onClick={close}>
            Israel
          </Link>
          <Link href="/destinos/egito" onClick={close}>
            Egito
          </Link>
          <Link href="/destinos/jordania" onClick={close}>
            Jordânia
          </Link>
          <Link href="/destinos/turquia" onClick={close}>
            Turquia
          </Link>
          <Link href="/destinos/grecia" onClick={close}>
            Grécia
          </Link>
          <Link href="/destinos/europa" onClick={close}>
            Europa
          </Link>
        </div>
      </details>
      <Link href="/depoimentos" onClick={close}>
        Depoimentos
      </Link>
      <Link href="/quem-somos" onClick={close}>
        Quem somos
      </Link>
      <Link href="/blog" onClick={close}>
        Blog
      </Link>
    </>
  );
}

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.classList.toggle("menu-open", open);
    return () => document.body.classList.remove("menu-open");
  }, [open]);
  return (
    <header className="header site-header">
      <div className="header-shell shell">
        <CompanyLogo variant="light" href="/" />
        <div className="header-stack">
          <div className="header-top">
            <span>Central de atendimento</span>
            <a href={`tel:+${siteConfig.contact.phoneInternational}`}>{siteConfig.contact.phoneDisplay}</a>
            <span className="header-social-label">Acompanhe nossas redes</span>
            <nav aria-label="Redes sociais do cabeçalho">
              <a
                href={siteConfig.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <Facebook />
              </a>
              <a
                href={siteConfig.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <Instagram />
              </a>
              <span role="img" aria-label="YouTube em breve">
                <Youtube />
              </span>
            </nav>
          </div>
          <div className="header-nav-row">
            <nav
              id="main-navigation"
              className={open ? "navlinks open" : "navlinks"}
              aria-label="Navegação principal"
            >
              <HeaderNavigation close={() => setOpen(false)} />
            </nav>
            <WhatsAppLink
              className="nav-cta"
              buttonText="Fale com um consultor"
            >
              <MessageCircle size={17} /> Atendimento
            </WhatsAppLink>
            <button
              className="menu"
              type="button"
              aria-expanded={open}
              aria-controls="main-navigation"
              onClick={() => setOpen(!open)}
              aria-label={open ? "Fechar menu" : "Abrir menu"}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return (
    <footer>
      <div className="shell footer-newsletter">
        <div>
          <b>Inspiração e preparação para sua próxima jornada</b>
          <p>
            Receba informações sobre experiências, destinos e novos conteúdos.
          </p>
        </div>
        <Link href="/contato">Quero receber novidades</Link>
      </div>
      <div className="shell footer-grid">
        <div>
          <b>Explore</b>
          <Link href="/caravanas">Experiências</Link>
          <Link href="/destinos">Destinos</Link>
          <Link href="/quem-somos">Quem somos</Link>
          <Link href="/caravanas-realizadas">Caravanas realizadas</Link>
          <Link href="/depoimentos">Depoimentos</Link>
        </div>
        <div>
          <b>Planeje</b>
          <Link href="/viagens-personalizadas">Viagens personalizadas</Link>
          <Link href="/lideres-de-caravanas">Líderes de caravanas</Link>
          <Link href="/documentacao">Documentação</Link>
          <Link href="/perguntas-frequentes">Perguntas frequentes</Link>
          <Link href="/blog">Blog</Link>
        </div>
        <div>
          <b>Destinos</b>
          <Link href="/destinos/israel">Israel</Link>
          <Link href="/destinos/egito">Egito</Link>
          <Link href="/destinos/jordania">Jordânia</Link>
          <Link href="/destinos/turquia">Turquia</Link>
          <Link href="/destinos/grecia">Grécia</Link>
        </div>
        <div>
          <b>Atendimento</b>
          <p>
            {siteConfig.business.serviceHours}
            <br />
            {companyContact.displayNumber}
          </p>
          <Link href="/contato">Fale conosco</Link>
          <WhatsAppLink buttonText="Atendimento pelo WhatsApp">
            Atendimento pelo WhatsApp
          </WhatsAppLink>
        </div>
      </div>
      <section className="footer-trust-wrap">
        <div className="shell footer-trust">
          <CompanyLogo variant="light" href="/" />
          <div className="footer-contact-summary">
            <b>
              A SUA ESCOLHA <em>EM VIAGENS DE FÉ</em>
            </b>
            <p>
              Entre em contato {companyContact.displayNumber}
              <br />
              {siteConfig.business.serviceHours}
            </p>
          </div>
          <div className="footer-social">
            <b>
              Acompanhe
              <br />
              nossas redes
            </b>
            <nav aria-label="Redes sociais">
              <a
                href={siteConfig.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook da Viagem Perfeita"
              >
                <Facebook />
              </a>
              <a
                href={siteConfig.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram da Viagem Perfeita"
              >
                <Instagram />
              </a>
              <span
                className="social-disabled"
                role="img"
                aria-label="YouTube — link será disponibilizado em breve"
                title="YouTube em breve"
              >
                <Youtube />
              </span>
            </nav>
          </div>
          <div
            className="partner-logos"
            aria-label="Entidades do setor de turismo"
          >
            <img
              src={`${base}/partners/israel-tourism.png`}
              width="134"
              height="39"
              alt="Ministério do Turismo de Israel"
            />
            <img src={`${base}/partners/abav.png`} width="97" height="57" alt="ABAV" />
            <img src={`${base}/partners/cadastur.png`} width="176" height="36" alt="Cadastur" />
          </div>
        </div>
      </section>
      <div className="footer-legal">
        <div className="shell">
          <strong>
            VP TURISMO E EVENTOS CNPJ 28.279.846/0001-21 BELO HORIZONTE/MG
          </strong>
        </div>
      </div>
    </footer>
  );
}

export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicHeader />
      <Breadcrumbs />
      <main className="public-page">{children}</main>
      <PublicFooter />
    </>
  );
}
