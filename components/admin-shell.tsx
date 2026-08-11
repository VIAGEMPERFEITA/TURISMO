"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BadgePercent,BarChart3,BookOpen,Bot,Calculator,CalendarCheck,Camera,Car,ClipboardCheck,ClipboardList,CreditCard,FileCheck,FileText,GitBranch,Images,LayoutDashboard,LogOut,Map,Megaphone,Menu,MessageCircle,Plug,Rocket,ScrollText,Search,Settings,Users,UserRoundCheck,Workflow,X } from "lucide-react";
import { canAccessModule, getAuthenticatedCrmUser, moduleFromPath, roleLabel, type CrmProfile } from "../lib/crm-auth";
import { clearSupabaseBrowserClient, getSupabaseBrowserClient } from "../lib/supabase-client";

const links=[[LayoutDashboard,"Dashboard","/admin/dashboard","dashboard"],[MessageCircle,"Caixa de entrada","/admin/atendimento","atendimento"],[Map,"Pipeline","/admin/pipeline","pipeline"],[Users,"Leads","/admin/leads","leads"],[ClipboardList,"Tarefas","/admin/tarefas","tarefas"],[UserRoundCheck,"Clientes","/admin/clientes","clientes"],[CalendarCheck,"Reservas","/admin/reservas","reservas"],[CreditCard,"Pagamentos","/admin/pagamentos","pagamentos"],[FileCheck,"Documentos","/admin/documentos","documentos"],[Car,"Caravanas","/admin/caravanas","caravanas"],[BadgePercent,"Preços","/admin/precos","precos"],[Calculator,"Simulador","/admin/simulador","simulador"],[FileText,"Propostas","/admin/propostas","propostas"],[ClipboardCheck,"Aprovações","/admin/aprovacoes","aprovacoes"],[Images,"Conteúdo","/admin/experiencias","experiencias"],[BookOpen,"Base de conhecimento","/admin/base-de-conhecimento","base-de-conhecimento"],[Bot,"Simulador da IA","/admin/ia-simulador","ia-simulador"],[Search,"Google","/admin/google","google"],[BarChart3,"Relatórios","/admin/relatorios","relatorios"],[Bot,"IA","/admin/ia","ia"],[ScrollText,"Logs da IA","/admin/ia-logs","ia-logs"],[Settings,"Configuração da IA","/admin/ia-configuracoes","ia-configuracoes"],[BookOpen,"Equipe","/admin/equipe","equipe"],[Settings,"Configurações","/admin/configuracoes","configuracoes"],[Settings,"Notificações","/admin/configuracoes/notificacoes","configuracoes"]] as const;

const navigationLinks=[links[0],[Rocket,"Acelerador de vendas","/admin/aquisicao","aquisicao"] as const,[Megaphone,"Campanhas e Disparos","/admin/campanhas","campanhas"] as const,...links.slice(1,2),[GitBranch,"Pipeline governado","/admin/pipeline","pipeline"] as const,[Workflow,"Automações","/admin/automacoes","automacoes"] as const,[Plug,"Integrações","/admin/integracoes","integracoes"] as const,[Camera,"Conteúdo social","/admin/conteudo-social","conteudo-social"] as const,[Bot,"Melhoria da IA","/admin/melhoria-ia","melhoria-ia"] as const,...links.slice(3)] as const;

export function AdminShell({children,title}:{children:ReactNode;title:string}){
  const [ready,setReady]=useState(false); const [configured,setConfigured]=useState(true); const [menu,setMenu]=useState(false); const [profile,setProfile]=useState<CrmProfile|null>(null);
  const base=process.env.NEXT_PUBLIC_BASE_PATH??""; const pathname=usePathname(); const currentModule=moduleFromPath(pathname);
  useEffect(()=>{
    const client=getSupabaseBrowserClient();
    if(!client){const timer=window.setTimeout(()=>{setConfigured(false);setReady(true)},0);return()=>window.clearTimeout(timer)}
    let active=true;
    getAuthenticatedCrmUser(client).then(user=>{if(!active)return;if(!user){window.location.replace(`${base}/admin/login/`);return}setProfile(user.profile);setReady(true)});
    const {data}=client.auth.onAuthStateChange(event=>{if(event==="SIGNED_OUT")window.location.replace(`${base}/admin/login/`)});
    return()=>{active=false;data.subscription.unsubscribe()};
  },[base]);
  const visibleLinks=useMemo(()=>profile?navigationLinks.filter(([, , ,module])=>canAccessModule(profile.role,module)):[],[profile]);
  async function logout(){const client=getSupabaseBrowserClient();if(client)await client.auth.signOut({scope:"local"});clearSupabaseBrowserClient();window.location.replace(`${base}/admin/login/`)}
  if(!ready)return <main className="admin-loading" aria-live="polite">Validando acesso seguro…</main>;
  if(!configured)return <main className="admin-setup"><h1>CRM YOAV preparado para conexão</h1><p>Configure as variáveis públicas do Supabase para ativar a autenticação. Nenhuma credencial é armazenada no GitHub Pages.</p><Link href="/admin/login">Voltar ao login</Link></main>;
  if(!profile)return <main className="admin-loading">Redirecionando para o login…</main>;
  if(!canAccessModule(profile.role,currentModule))return <main className="admin-access-denied"><div><h1>Acesso restrito</h1><p>O perfil {roleLabel(profile.role)} não possui permissão para este módulo.</p><Link href="/admin/dashboard">Voltar ao dashboard</Link><button onClick={logout}><LogOut/>Sair com segurança</button></div></main>;
  return <div className="crm"><aside className={menu?"open":""}><div className="crm-brand">CRM <span>YOAV</span></div><nav>{visibleLinks.map(([Icon,label,href])=><Link href={href} key={href} onClick={()=>setMenu(false)}><Icon/>{label}</Link>)}</nav><div className="crm-user"><strong>{profile.full_name}</strong><span>{roleLabel(profile.role)}</span></div><button onClick={logout}><LogOut/>Sair</button></aside><main><header><button className="crm-menu" aria-label={menu?"Fechar menu":"Abrir menu"} onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button><div><small>CRM YOAV · Viagem Perfeita Turismo · {roleLabel(profile.role)}</small><h1>{title}</h1></div></header>{children}</main></div>;
}
