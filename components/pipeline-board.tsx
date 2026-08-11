"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase-client";

type Stage = { id: string; name: string; code: string; position: number; color: string };
type PipelineStageRow = Omit<Stage, "position"> & { stage_position: number };
type Lead = { id: string; name: string; status: string; temperature: string; source: string; pipeline_stage_id: string | null };
type TransitionResult = { ok: boolean; unmet_requirements?: Array<{ id: string; label: string }> };

const statusByStage: Record<string, string> = {
  novo_lead: "novo_lead", primeiro_contato: "primeiro_contato", qualificacao: "em_atendimento",
  proposta: "proposta_enviada", negociacao: "negociacao", reserva: "reserva_iniciada",
  pagamento: "aguardando_pagamento", ganho: "reserva_confirmada", convertido: "reserva_confirmada", perdido: "perdido",
};

export function PipelineBoard() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const [{ data: stageData, error: stageError }, { data: leadData, error: leadError }] = await Promise.all([
      client.rpc("crm_pipeline_board"),
      client.from("leads").select("id,name,status,temperature,source,pipeline_stage_id").is("deleted_at", null).limit(200),
    ]);
    if (stageError || leadError) { setMessage("Não foi possível carregar o pipeline."); return; }
    setStages(((stageData ?? []) as PipelineStageRow[]).map(stage => ({ ...stage, position: stage.stage_position })));
    setLeads((leadData ?? []) as Lead[]);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function leadsForStage(stage: Stage) {
    return leads.filter(lead => lead.pipeline_stage_id === stage.id || (!lead.pipeline_stage_id && lead.status === (statusByStage[stage.code] ?? stage.code)));
  }

  async function transition(lead: Lead, stage: Stage, overrideReason?: string) {
    const client = getSupabaseBrowserClient();
    if (!client) return null;
    const { data, error } = await client.rpc("transition_lead_stage", { target_lead_id: lead.id, target_stage_id: stage.id, override_reason: overrideReason ?? null });
    if (error) { setMessage(`A etapa não foi alterada: ${error.message}`); return null; }
    return data as TransitionResult;
  }

  async function drop(leadId: string, stage: Stage) {
    const lead = leads.find(item => item.id === leadId);
    if (!lead || lead.pipeline_stage_id === stage.id || busy) return;
    if (stage.code === "perdido") { setMessage("Para marcar como perdido, abra o lead e registre o motivo da perda."); return; }
    setBusy(true); setMessage("");
    const result = await transition(lead, stage);
    if (result?.ok) {
      setLeads(current => current.map(item => item.id === lead.id ? { ...item, pipeline_stage_id: stage.id, status: statusByStage[stage.code] ?? item.status } : item));
      setMessage(`Lead movido para ${stage.name}.`);
    } else if (result?.unmet_requirements?.length) {
      const requirements = result.unmet_requirements.map(item => `• ${item.label}`).join("\n");
      const reason = window.prompt(`Movimentação bloqueada. Requisitos pendentes:\n${requirements}\n\nGestores podem justificar uma exceção (mínimo de 10 caracteres):`);
      if (reason) {
        const override = await transition(lead, stage, reason);
        if (override?.ok) { await load(); setMessage(`Lead movido para ${stage.name} com exceção auditada.`); }
        else setMessage("A exceção não foi autorizada para este perfil.");
      } else setMessage("Movimentação cancelada: conclua os requisitos obrigatórios.");
    }
    setBusy(false);
  }

  if (!stages.length) return <div className="crm-alert">Nenhum pipeline padrão ativo foi encontrado.</div>;
  return <>
    {message ? <div className="crm-alert" role="status">{message}</div> : null}
    <div className="pipeline-board" aria-busy={busy}>
      {stages.map(stage => <section key={stage.id} onDragOver={event => event.preventDefault()} onDrop={event => drop(event.dataTransfer.getData("lead-id"), stage)}>
        <header style={{ borderTopColor: stage.color }}><b>{stage.name}</b><span>{leadsForStage(stage).length}</span></header>
        {leadsForStage(stage).map(lead => <article draggable={!busy} onDragStart={event => event.dataTransfer.setData("lead-id", lead.id)} key={lead.id}>
          <strong>{lead.name}</strong><small>{lead.temperature} · {lead.source}</small>
        </article>)}
      </section>)}
    </div>
  </>;
}
