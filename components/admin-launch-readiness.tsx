"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, ShieldCheck } from "lucide-react";
import { getSupabaseBrowserClient } from "../lib/supabase-client";

type Channel = { provider: string; enabled: boolean; simulation: boolean; credentials: boolean };
type Readiness = {
  channels?: Channel[];
  open_health_alerts?: number;
  unread_conversations?: number;
  over_sla?: number;
  imported_contacts?: { total?: number; consented?: number; suppressed?: number };
};
type AiGate = { release_allowed?: boolean; total?: number; passed?: number; critical_failures?: number };
type WhatsAppAccount = { status: string; coexistence_enabled: boolean; display_phone: string; metadata: Record<string, unknown> | null };

export function AdminLaunchReadiness() {
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [aiGate, setAiGate] = useState<AiGate | null>(null);
  const [whatsapp, setWhatsapp] = useState<WhatsAppAccount | null>(null);
  const [approvedTemplates, setApprovedTemplates] = useState(0);
  const [connectedChannels, setConnectedChannels] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setLoading(true);
    const [center, gate, wa, templates, channels] = await Promise.all([
      client.rpc("operational_readiness_center"),
      client.rpc("ai_release_gate"),
      client.from("whatsapp_accounts").select("status,coexistence_enabled,display_phone,metadata").eq("phone_e164", "5531995285665").maybeSingle(),
      client.from("message_templates").select("id", { count: "exact", head: true }).eq("status", "aprovado"),
      client.from("channel_accounts").select("id", { count: "exact", head: true }).eq("status", "connected"),
    ]);
    setReadiness((center.data ?? null) as Readiness | null);
    setAiGate((gate.data ?? null) as AiGate | null);
    setWhatsapp((wa.data ?? null) as WhatsAppAccount | null);
    setApprovedTemplates(templates.count ?? 0);
    setConnectedChannels(channels.count ?? 0);
    setMessage(center.error || gate.error || wa.error ? "Parte dos indicadores não pôde ser consultada. Verifique as migrations e a sessão do administrador." : "");
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const imported = readiness?.imported_contacts ?? {};
  const webhookActive = whatsapp?.metadata?.webhook_subscription === "active";
  const whatsappReady = whatsapp?.status === "ativo" && whatsapp.coexistence_enabled && webhookActive;
  const checks = [
    { label: "Matriz de segurança da IA", ready: aiGate?.release_allowed === true, detail: `${aiGate?.passed ?? 0}/${aiGate?.total ?? 0} cenários; ${aiGate?.critical_failures ?? 0} falha(s) crítica(s)` },
    { label: "Canais sociais conectados", ready: connectedChannels >= 2, detail: `${connectedChannels} conta(s) conectada(s)` },
    { label: "Alertas operacionais", ready: (readiness?.open_health_alerts ?? 0) === 0, detail: `${readiness?.open_health_alerts ?? 0} alerta(s) aberto(s)` },
    { label: "SLA da caixa de atendimento", ready: (readiness?.over_sla ?? 0) === 0, detail: `${readiness?.over_sla ?? 0} conversa(s) fora do SLA` },
    { label: "Contatos importados governados", ready: (imported.total ?? 0) === 0 || (imported.consented ?? 0) + (imported.suppressed ?? 0) <= (imported.total ?? 0), detail: `${imported.consented ?? 0} consentido(s), ${imported.suppressed ?? 0} suprimido(s), ${imported.total ?? 0} total` },
    { label: "WhatsApp oficial em coexistência", ready: whatsappReady, detail: whatsappReady ? `${whatsapp?.display_phone} conectado e com webhook` : "Bloqueado até a aprovação das permissões da Meta" },
    { label: "Modelos oficiais do WhatsApp", ready: approvedTemplates > 0, detail: `${approvedTemplates} modelo(s) aprovado(s)` },
  ];
  const readyCount = checks.filter(item => item.ready).length;

  return <section className="crm-panel">
    <div className="crm-panel-head"><div><ShieldCheck/><h2>Prontidão para lançamento</h2><p>Diagnóstico consolidado sem executar mensagens ou ativações externas.</p></div><button onClick={load} disabled={loading}><RefreshCw className={loading ? "spin" : ""}/>Atualizar</button></div>
    {message ? <div className="crm-alert">{message}</div> : null}
    <div className="campaign-rates"><span>Itens prontos <b>{readyCount}/{checks.length}</b></span><span>Não lidas <b>{readiness?.unread_conversations ?? 0}</b></span><span>Modo seguro <b>Ativo</b></span></div>
    <ul className="ai-safety-list">{checks.map(item => <li key={item.label}>{item.ready ? <CheckCircle2/> : item.label.includes("Meta") || item.label.includes("Modelos") ? <Clock3/> : <AlertTriangle/>}<span><b>{item.label}</b><small>{item.detail}</small></span></li>)}</ul>
    <p className="crm-muted">A aprovação da Meta, a criação de acesso persistente e qualquer envio real continuam exigindo validação no momento da ação.</p>
  </section>;
}
