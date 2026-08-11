"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgePercent, BarChart3, BookOpen, Bot, Calculator, CalendarCheck, Camera,
  Car, ClipboardCheck, ClipboardList, CreditCard, FileCheck, FileText,
  GitBranch, Images, LayoutDashboard, LogOut, Megaphone, Menu,
  MessageCircle, Plug, Rocket, ScrollText, Search, Settings, Users,
  UserRoundCheck, Workflow, X,
} from "lucide-react";
import { canAccessModule, getAuthenticatedCrmUser, moduleFromPath, roleLabel, type CrmProfile } from "../lib/crm-auth";
import { clearSupabaseBrowserClient, getSupabaseBrowserClient } from "../lib/supabase-client";

type NavItem = readonly [React.ComponentType<{ className?: string }>, string, string, string];
type NavGroup = { label: string; items: readonly NavItem[] };

const navigation: readonly NavGroup[] = [
  { label: "Visão geral", items: [
    [LayoutDashboard, "Dashboard", "/admin/dashboard", "dashboard"],
    [BarChart3, "Relatórios", "/admin/relatorios", "relatorios"],
  ] },
  { label: "Comercial", items: [
    [Rocket, "Acelerador de vendas", "/admin/aquisicao", "aquisicao"],
    [Megaphone, "Campanhas e disparos", "/admin/campanhas", "campanhas"],
    [MessageCircle, "Caixa de entrada", "/admin/atendimento", "atendimento"],
    [GitBranch, "Pipeline governado", "/admin/pipeline", "pipeline"],
    [Users, "Leads", "/admin/leads", "leads"],
    [ClipboardList, "Tarefas", "/admin/tarefas", "tarefas"],
  ] },
  { label: "Operação de viagens", items: [
    [UserRoundCheck, "Clientes", "/admin/clientes", "clientes"],
    [CalendarCheck, "Reservas", "/admin/reservas", "reservas"],
    [CreditCard, "Pagamentos", "/admin/pagamentos", "pagamentos"],
    [FileCheck, "Documentos", "/admin/documentos", "documentos"],
    [Car, "Caravanas", "/admin/caravanas", "caravanas"],
    [BadgePercent, "Preços", "/admin/precos", "precos"],
    [Calculator, "Simulador", "/admin/simulador", "simulador"],
    [FileText, "Propostas", "/admin/propostas", "propostas"],
    [ClipboardCheck, "Aprovações", "/admin/aprovacoes", "aprovacoes"],
  ] },
  { label: "Automação e inteligência", items: [
    [Workflow, "Automações", "/admin/automacoes", "automacoes"],
    [Plug, "Integrações", "/admin/integracoes", "integracoes"],
    [BookOpen, "Base de conhecimento", "/admin/base-de-conhecimento", "base-de-conhecimento"],
    [Bot, "Simulador da IA", "/admin/ia-simulador", "ia-simulador"],
    [Bot, "Inteligência artificial", "/admin/ia", "ia"],
    [Bot, "Melhoria da IA", "/admin/melhoria-ia", "melhoria-ia"],
    [ScrollText, "Logs da IA", "/admin/ia-logs", "ia-logs"],
    [Settings, "Configuração da IA", "/admin/ia-configuracoes", "ia-configuracoes"],
  ] },
  { label: "Conteúdo e presença", items: [
    [Images, "Experiências", "/admin/experiencias", "experiencias"],
    [Camera, "Conteúdo social", "/admin/conteudo-social", "conteudo-social"],
    [Search, "Google", "/admin/google", "google"],
  ] },
  { label: "Administração", items: [
    [BookOpen, "Equipe", "/admin/equipe", "equipe"],
    [Settings, "Configurações", "/admin/configuracoes", "configuracoes"],
  ] },
] as const;

export function AdminShell({ children, title }: { children: ReactNode; title: string }) {
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState<CrmProfile | null>(null);
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const pathname = usePathname();
  const currentModule = moduleFromPath(pathname);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      const timer = window.setTimeout(() => { setConfigured(false); setReady(true); }, 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    getAuthenticatedCrmUser(client).then(user => {
      if (!active) return;
      if (!user) { window.location.replace(`${base}/admin/login/`); return; }
      setProfile(user.profile);
      setReady(true);
    });
    const { data } = client.auth.onAuthStateChange(event => {
      if (event === "SIGNED_OUT") window.location.replace(`${base}/admin/login/`);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [base]);

  const visibleGroups = useMemo(() => {
    if (!profile) return [];
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return navigation.map(group => ({
      ...group,
      items: group.items.filter(([, label, , module]) =>
        canAccessModule(profile.role, module) && (!term || label.toLocaleLowerCase("pt-BR").includes(term))),
    })).filter(group => group.items.length);
  }, [profile, query]);

  async function logout() {
    const client = getSupabaseBrowserClient();
    if (client) await client.auth.signOut({ scope: "local" });
    clearSupabaseBrowserClient();
    window.location.replace(`${base}/admin/login/`);
  }

  if (!ready) return <main className="admin-loading" aria-live="polite"><span className="admin-loader" />Validando acesso seguro…</main>;
  if (!configured) return <main className="admin-setup"><h1>CRM YOAV preparado para conexão</h1><p>Configure as variáveis públicas do Supabase para ativar a autenticação. Nenhuma credencial é armazenada no GitHub Pages.</p><Link href="/admin/login">Voltar ao login</Link></main>;
  if (!profile) return <main className="admin-loading">Redirecionando para o login…</main>;
  if (!canAccessModule(profile.role, currentModule)) return <main className="admin-access-denied"><div><h1>Acesso restrito</h1><p>O perfil {roleLabel(profile.role)} não possui permissão para este módulo.</p><Link href="/admin/dashboard">Voltar ao dashboard</Link><button onClick={logout}><LogOut />Sair com segurança</button></div></main>;

  const initials = profile.full_name.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "VP";

  return <div className="crm">
    <aside className={menu ? "open" : ""} aria-label="Navegação administrativa">
      <div className="crm-brand"><span className="crm-brand-mark">VP</span><div><strong>CRM YOAV</strong><small>Viagem Perfeita</small></div></div>
      <label className="crm-nav-search"><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar módulo" aria-label="Buscar módulo" /></label>
      <nav>
        {visibleGroups.map(group => <section className="crm-nav-group" key={group.label}>
          <h2>{group.label}</h2>
          {group.items.map(([Icon, label, href]) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return <Link href={href} key={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={() => setMenu(false)}><Icon />{label}</Link>;
          })}
        </section>)}
        {!visibleGroups.length ? <p className="crm-nav-empty">Nenhum módulo encontrado.</p> : null}
      </nav>
      <div className="crm-user"><span className="crm-user-avatar">{initials}</span><div><strong>{profile.full_name}</strong><small>{roleLabel(profile.role)}</small></div></div>
      <button className="crm-logout" onClick={logout}><LogOut />Sair com segurança</button>
    </aside>
    {menu ? <button className="crm-overlay" aria-label="Fechar menu" onClick={() => setMenu(false)} /> : null}
    <main>
      <header className="crm-topbar">
        <button className="crm-menu" aria-label={menu ? "Fechar menu" : "Abrir menu"} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button>
        <div className="crm-page-title"><small>CRM YOAV <span>•</span> {roleLabel(profile.role)}</small><h1>{title}</h1></div>
        <div className="crm-system-status"><span /><div><small>Sistema operacional</small><strong>Ambiente seguro</strong></div></div>
      </header>
      <div className="crm-content">{children}</div>
    </main>
  </div>;
}
