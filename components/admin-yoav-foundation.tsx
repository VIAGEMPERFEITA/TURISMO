"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, Cable, Camera, ShieldCheck, Workflow } from "lucide-react";
import { getSupabaseBrowserClient } from "../lib/supabase-client";

const configurations = {
  automacoes: { table: "automation_flows", title: "Automações", description: "Fluxos versionados, limites de frequência, horário silencioso e parada de emergência.", icon: Workflow },
  integracoes: { table: "integration_connectors", title: "Integrações", description: "Conectores autorizados com escopos mínimos, estado operacional e credenciais protegidas.", icon: Cable },
  "conteudo-social": { table: "instagram_contents", title: "Conteúdo social", description: "Ideias, roteiros, legendas, aprovação e agenda editorial sem publicação automática.", icon: Camera },
  "melhoria-ia": { table: "improvement_suggestions", title: "Melhoria da IA", description: "Sugestões explicáveis passam por revisão, teste, canário e rollback antes de produção.", icon: Bot },
} as const;

type Module = keyof typeof configurations;
type Row = { id: string; name?: string; title?: string; status: string; provider?: string; updated_at?: string; created_at?: string };

export function AdminYoavFoundation({ module }: { module: Module }) {
  const config = configurations[module];
  const Icon = config.icon;
  const [rows, setRows] = useState<Row[]>([]);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const { data, error } = await client.from(config.table).select("*").order("created_at", { ascending: false }).limit(100);
    if (error) { setNotice("Este módulo estará disponível após a migration CRM YOAV ser publicada."); return; }
    setRows((data ?? []) as Row[]);
  }, [config.table]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return <section className="crm-panel">
    <div className="crm-panel-head"><div><Icon/><h2>{config.title}</h2></div><span><ShieldCheck/> Governança ativa</span></div>
    <p>{config.description}</p>
    {notice ? <div className="crm-alert">{notice}</div> : null}
    <div className="crm-table-wrap"><table><thead><tr><th>Nome</th><th>Provedor</th><th>Status</th><th>Atualização</th></tr></thead><tbody>
      {rows.map(row => {const date=row.updated_at ?? row.created_at;return <tr key={row.id}><td>{row.name ?? row.title ?? "Registro"}</td><td>{row.provider ?? "Interno"}</td><td>{row.status}</td><td>{date ? new Date(date).toLocaleString("pt-BR") : "—"}</td></tr>})}
      {!rows.length && !notice ? <tr><td colSpan={4}>Nenhum registro criado. O ambiente permanece seguro e sem ativações externas automáticas.</td></tr> : null}
    </tbody></table></div>
  </section>;
}
