"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, Cable, Camera, CheckCircle2, ShieldCheck, Workflow } from "lucide-react";
import { getSupabaseBrowserClient } from "../lib/supabase-client";
import { AdminLaunchReadiness } from "./admin-launch-readiness";

const configurations = {
  automacoes: { table: "automation_flows", title: "Automações", description: "Fluxos versionados, limites de frequência, horário silencioso e parada de emergência.", icon: Workflow },
  integracoes: { table: "integration_connectors", title: "Integrações", description: "Conectores autorizados com escopos mínimos, estado operacional e credenciais protegidas.", icon: Cable },
  "conteudo-social": { table: "instagram_contents", title: "Conteúdo social", description: "Ideias, roteiros, legendas, aprovação e agenda editorial sem publicação automática.", icon: Camera },
  "melhoria-ia": { table: "improvement_suggestions", title: "Melhoria da IA", description: "Sugestões explicáveis passam por revisão, teste, canário e rollback antes de produção.", icon: Bot },
} as const;

type Module = keyof typeof configurations;
type Row = { id: string; name?: string; title?: string; status: string; provider?: string; updated_at?: string; created_at?: string };
type InstagramAccount = { name: string; provider: string; external_account_id: string | null; status: string; last_sync_at: string | null };

export function AdminYoavFoundation({ module }: { module: Module }) {
  const config = configurations[module];
  const Icon = config.icon;
  const [rows, setRows] = useState<Row[]>([]);
  const [instagramAccount, setInstagramAccount] = useState<InstagramAccount | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const [{ data, error }, accountResult] = await Promise.all([
      client.from(config.table).select("*").order("created_at", { ascending: false }).limit(100),
      module === "conteudo-social"
        ? client.from("channel_accounts").select("name,provider,external_account_id,status,last_sync_at").eq("channel", "instagram").limit(1).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (error) { setNotice("Este módulo estará disponível após a migration CRM YOAV ser publicada."); return; }
    setRows((data ?? []) as Row[]);
    if (module === "conteudo-social") setInstagramAccount((accountResult.data ?? null) as InstagramAccount | null);
  }, [config.table, module]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const modulePanel = <section className="crm-panel">
    <div className="crm-panel-head"><div><Icon/><h2>{config.title}</h2></div><span><ShieldCheck/> Governança ativa</span></div>
    <p>{config.description}</p>
    {module === "conteudo-social" ? <div className="crm-alert" role="status">
      <strong>{instagramAccount?.status === "connected" ? <><CheckCircle2/> Instagram profissional conectado</> : "Instagram aguardando conexão"}</strong>
      <span>{instagramAccount ? `${instagramAccount.name} • ${instagramAccount.provider}${instagramAccount.external_account_id ? ` • ID ${instagramAccount.external_account_id}` : ""}` : "Nenhuma conta profissional autorizada."}</span>
      <small>{instagramAccount?.last_sync_at ? `Última sincronização: ${new Date(instagramAccount.last_sync_at).toLocaleString("pt-BR")}` : "A conexão e as credenciais são gerenciadas somente por administradores."}</small>
    </div> : null}
    {notice ? <div className="crm-alert">{notice}</div> : null}
    <div className="crm-table-wrap"><table><thead><tr><th>Nome</th><th>Provedor</th><th>Status</th><th>Atualização</th></tr></thead><tbody>
      {rows.map(row => {const date=row.updated_at ?? row.created_at;return <tr key={row.id}><td>{row.name ?? row.title ?? "Registro"}</td><td>{row.provider ?? "Interno"}</td><td>{row.status}</td><td>{date ? new Date(date).toLocaleString("pt-BR") : "—"}</td></tr>})}
      {!rows.length && !notice ? <tr><td colSpan={4}>Nenhum registro criado. O ambiente permanece seguro e sem ativações externas automáticas.</td></tr> : null}
    </tbody></table></div>
  </section>;
  return module === "integracoes" ? <div className="crm-report-grid"><AdminLaunchReadiness/>{modulePanel}</div> : modulePanel;
}
