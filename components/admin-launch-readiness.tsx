"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, FlaskConical, PauseCircle, RefreshCw, ShieldCheck } from "lucide-react";
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
type Preflight = {
  expired_tokens?: number;
  tokens_expiring_14d?: number;
  stale_validations?: number;
  webhook_retrying?: number;
  webhook_dead_letter?: number;
  queue_stuck?: number;
  campaigns_unlocked?: number;
  handoffs_waiting?: number;
  recovery_snapshot_at?: string | null;
  simulation_only?: boolean;
};
type LearningCycle = { cycle_date: string; status: string; passed: number; scenarios_total: number; critical_failures: number };
type QueryFailure = { message: string };
type QueryResult<T> = { data: T | null; count?: number | null; error?: QueryFailure | null };

async function withQueryTimeout<T>(query: PromiseLike<QueryResult<T>>, timeoutMs = 15_000): Promise<QueryResult<T>> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutResult = new Promise<QueryResult<T>>(resolve => {
    timeout = setTimeout(() => resolve({ data: null, error: { message: "Tempo limite de consulta excedido." } }), timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve(query), timeoutResult]);
  } catch (error) {
    return { data: null, error: { message: error instanceof Error ? error.message : "Falha inesperada na consulta." } };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function AdminLaunchReadiness() {
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [aiGate, setAiGate] = useState<AiGate | null>(null);
  const [whatsapp, setWhatsapp] = useState<WhatsAppAccount | null>(null);
  const [approvedTemplates, setApprovedTemplates] = useState<number | null>(null);
  const [connectedChannels, setConnectedChannels] = useState<number | null>(null);
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [lastOperation, setLastOperation] = useState<Record<string, unknown> | null>(null);
  const [lastLearning, setLastLearning] = useState<LearningCycle | null>(null);

  const load = useCallback(async () => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setMessage("A conexão com o banco não está disponível nesta publicação.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [center, gate, preflightResult, wa, templates, channels, learning] = await Promise.all([
        withQueryTimeout(client.rpc("operational_readiness_center")),
        withQueryTimeout(client.rpc("ai_release_gate")),
        withQueryTimeout(client.rpc("meta_prelaunch_preflight")),
        withQueryTimeout(client.from("whatsapp_accounts").select("status,coexistence_enabled,display_phone,metadata").eq("phone_e164", "5531995285665").maybeSingle()),
        withQueryTimeout(client.from("message_templates").select("id", { count: "exact", head: true }).eq("status", "aprovado")),
        withQueryTimeout(client.from("channel_accounts").select("id", { count: "exact", head: true }).eq("status", "connected")),
        withQueryTimeout(client.from("ai_learning_cycles").select("cycle_date,status,passed,scenarios_total,critical_failures").order("cycle_date", { ascending: false }).limit(1).maybeSingle()),
      ]);
      setReadiness((center.data ?? null) as Readiness | null);
      setAiGate((gate.data ?? null) as AiGate | null);
      setPreflight((preflightResult.data ?? null) as Preflight | null);
      setWhatsapp((wa.data ?? null) as WhatsAppAccount | null);
      setApprovedTemplates(templates.error ? null : templates.count ?? 0);
      setConnectedChannels(channels.error ? null : channels.count ?? 0);
      setLastLearning((learning.data ?? null) as LearningCycle | null);
      const failures = [center, gate, preflightResult, wa, templates, channels, learning].filter(result => result.error).length;
      setMessage(failures ? `${failures} verificação(ões) não responderam. Os itens sem dados permanecem pendentes e podem ser atualizados novamente.` : "");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const runSafeOperation = async (operation: "guardian" | "simulation") => {
    const client = getSupabaseBrowserClient(); if (!client) return;
    setLoading(true);
    const rpc = operation === "guardian" ? "run_operational_guardian" : "simulate_omnichannel_preflight";
    const { data, error } = await client.rpc(rpc);
    setLastOperation((data ?? null) as Record<string, unknown> | null);
    setMessage(error ? "Não foi possível concluir o diagnóstico." : operation === "guardian" ? "Diagnóstico operacional concluído." : "Simulação multicanal concluída sem envio externo.");
    await load();
  };

  const emergencyStop = async () => {
    if (!window.confirm("Confirmar parada de emergência? Fluxos serão pausados, campanhas reais serão bloqueadas e as integrações voltarão à simulação.")) return;
    const reason = window.prompt("Informe o motivo operacional da parada (mínimo de 10 caracteres):");
    if (!reason || reason.trim().length < 10) { setMessage("A parada exige um motivo com pelo menos 10 caracteres."); return; }
    const client = getSupabaseBrowserClient(); if (!client) return;
    setLoading(true);
    const { data, error } = await client.rpc("emergency_stop_omnichannel", { stop_reason: reason.trim() });
    setLastOperation((data ?? null) as Record<string, unknown> | null);
    setMessage(error ? "A parada de emergência não foi aplicada." : "Parada de emergência aplicada e registrada.");
    await load();
  };

  const imported = readiness?.imported_contacts ?? {};
  const webhookActive = whatsapp?.metadata?.webhook_subscription === "active";
  const whatsappReady = whatsapp?.status === "ativo" && whatsapp.coexistence_enabled && webhookActive;
  const checks = [
    { label: "Matriz de segurança da IA", ready: aiGate?.release_allowed === true, detail: aiGate ? `${aiGate.passed ?? 0}/${aiGate.total ?? 0} cenários; ${aiGate.critical_failures ?? 0} falha(s) crítica(s)` : "Indicador não consultado" },
    { label: "Canais sociais conectados", ready: connectedChannels !== null && connectedChannels >= 2, detail: connectedChannels === null ? "Indicador não consultado" : `${connectedChannels} conta(s) conectada(s)` },
    { label: "Alertas operacionais", ready: readiness !== null && (readiness.open_health_alerts ?? 0) === 0, detail: readiness ? `${readiness.open_health_alerts ?? 0} alerta(s) aberto(s)` : "Indicador não consultado" },
    { label: "SLA da caixa de atendimento", ready: readiness !== null && (readiness.over_sla ?? 0) === 0, detail: readiness ? `${readiness.over_sla ?? 0} conversa(s) fora do SLA` : "Indicador não consultado" },
    { label: "Contatos importados protegidos", ready: readiness !== null && (imported.consented ?? 0) + (imported.suppressed ?? 0) <= (imported.total ?? 0), detail: readiness ? `${imported.total ?? 0} no CRM; ${imported.consented ?? 0} apto(s) para marketing; demais bloqueados sem consentimento` : "Indicador não consultado" },
    { label: "WhatsApp oficial +55 31 99528-5665", ready: whatsappReady, detail: whatsappReady ? `${whatsapp?.display_phone} conectado e com webhook` : "Número reservado; coexistência aguardando a Meta" },
    { label: "Modelos oficiais do WhatsApp", ready: approvedTemplates !== null && approvedTemplates > 0, detail: approvedTemplates === null ? "Indicador não consultado" : `${approvedTemplates} modelo(s) aprovado(s)` },
    { label: "Validade das credenciais", ready: preflight !== null && (preflight.expired_tokens ?? 0) === 0 && (preflight.tokens_expiring_14d ?? 0) === 0, detail: preflight ? `${preflight.expired_tokens ?? 0} vencido(s), ${preflight.tokens_expiring_14d ?? 0} vencendo em 14 dias` : "Indicador não consultado" },
    { label: "Retentativas e fila de falhas", ready: preflight !== null && (preflight.webhook_dead_letter ?? 0) === 0 && (preflight.queue_stuck ?? 0) === 0, detail: preflight ? `${preflight.webhook_retrying ?? 0} retentativa(s), ${preflight.webhook_dead_letter ?? 0} dead-letter, ${preflight.queue_stuck ?? 0} travado(s)` : "Indicador não consultado" },
    { label: "Envios reais bloqueados", ready: preflight?.simulation_only === true && (preflight?.campaigns_unlocked ?? 0) === 0, detail: preflight?.simulation_only ? "Somente simulação até a liberação" : "Há operação real liberada antes da Meta" },
    { label: "Recuperação operacional", ready: Boolean(preflight?.recovery_snapshot_at), detail: preflight?.recovery_snapshot_at ? `Snapshot ${new Date(preflight.recovery_snapshot_at).toLocaleString("pt-BR")}` : "Snapshot ainda não registrado" },
    { label: "Evolução diária da IA", ready: lastLearning?.status === "completed" && (lastLearning?.critical_failures ?? 1) === 0, detail: lastLearning ? `${lastLearning.cycle_date}: ${lastLearning.passed}/${lastLearning.scenarios_total} aprovados` : "Aguardando o primeiro ciclo registrado" },
  ];
  const readyCount = checks.filter(item => item.ready).length;

  return <section className="crm-panel">
    <div className="crm-panel-head"><div><ShieldCheck/><h2>Prontidão para lançamento</h2><p>Diagnóstico consolidado sem executar mensagens ou ativações externas.</p></div><button onClick={load} disabled={loading}><RefreshCw className={loading ? "spin" : ""}/>Atualizar</button></div>
    {message ? <div className="crm-alert">{message}</div> : null}
    <div className="campaign-rates"><span>Itens prontos <b>{readyCount}/{checks.length}</b></span><span>Não lidas <b>{readiness ? readiness.unread_conversations ?? 0 : "—"}</b></span><span>Modo seguro <b>Ativo</b></span></div>
    <div className="crm-inline-actions"><button onClick={() => void runSafeOperation("guardian")} disabled={loading}><ShieldCheck/>Executar diagnóstico</button><button onClick={() => void runSafeOperation("simulation")} disabled={loading}><FlaskConical/>Simular três canais</button><button onClick={() => void emergencyStop()} disabled={loading}><PauseCircle/>Parada de emergência</button></div>
    <ul className="ai-safety-list">{checks.map(item => <li key={item.label}>{item.ready ? <CheckCircle2/> : item.label.includes("Meta") || item.label.includes("Modelos") ? <Clock3/> : <AlertTriangle/>}<span><b>{item.label}</b><small>{item.detail}</small></span></li>)}</ul>
    {lastOperation ? <details><summary>Resultado da última operação</summary><pre>{JSON.stringify(lastOperation, null, 2)}</pre></details> : null}
    <p className="crm-muted">A aprovação da Meta, a criação de acesso persistente e qualquer envio real continuam exigindo validação no momento da ação.</p>
  </section>;
}
