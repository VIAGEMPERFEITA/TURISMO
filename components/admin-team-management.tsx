"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Building2, LoaderCircle, MailPlus, ShieldCheck, UserRoundCheck } from "lucide-react";
import { getSupabaseBrowserClient } from "../lib/supabase-client";

type Member = { id: string; full_name: string; email: string; role: string; active: boolean };
type Invitation = { id: string; email: string; role: string; expires_at: string; accepted_at: string | null };
type Organization = { id: string; name: string; slug: string; active: boolean };

const roles = ["administrador", "gestor", "consultor", "visualizador"];
const errorText = (error: unknown) => error instanceof Error ? error.message : "Não foi possível concluir a operação.";

export function AdminTeamManagement() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [platformAdmin, setPlatformAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const [memberResult, inviteResult, platformResult] = await Promise.all([
      client.from("profiles").select("id,full_name,email,role,active").order("full_name"),
      client.from("organization_invitations").select("id,email,role,expires_at,accepted_at").order("created_at", { ascending: false }),
      client.rpc("is_platform_administrator"),
    ]);
    setMembers((memberResult.data ?? []) as Member[]);
    setInvitations((inviteResult.data ?? []) as Invitation[]);
    const isPlatform = platformResult.data === true;
    setPlatformAdmin(isPlatform);
    if (isPlatform) {
      const result = await client.from("organizations").select("id,name,slug,active").order("name");
      setOrganizations((result.data ?? []) as Organization[]);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const values = new FormData(event.currentTarget);
    setBusy(true); setMessage("");
    const { data, error } = await client.functions.invoke("invite-organization-member", {
      body: {
        email: String(values.get("email") ?? ""),
        role: String(values.get("role") ?? "consultor"),
      },
    });
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    event.currentTarget.reset();
    setMessage(data?.linkedExistingUser
      ? "Usuário existente vinculado à empresa com sucesso."
      : "Convite enviado por e-mail. O acesso será ativado após a confirmação.");
    await load();
  }

  async function createTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const values = new FormData(event.currentTarget);
    setBusy(true); setMessage("");
    const { error } = await client.rpc("create_tenant_organization", {
      tenant_name: String(values.get("name") ?? ""),
      tenant_slug: String(values.get("slug") ?? ""),
      administrator_email: String(values.get("administrator_email") ?? ""),
      tenant_legal_name: String(values.get("legal_name") ?? ""),
      tenant_tax_id: String(values.get("tax_id") ?? ""),
      tenant_phone: String(values.get("phone") ?? ""),
      tenant_city: String(values.get("city") ?? ""),
      tenant_state: String(values.get("state") ?? ""),
    });
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    event.currentTarget.reset();
    setMessage("Empresa criada com pipeline, fila e convite do administrador.");
    await load();
  }

  return <div className="crm-report-grid">
    <section className="crm-panel">
      <div className="crm-panel-head"><div><h2>Equipe da empresa</h2><p>Usuários e permissões isolados nesta organização.</p></div><UserRoundCheck/></div>
      <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Função</th><th>Status</th></tr></thead><tbody>
        {members.map(member=><tr key={member.id}><td>{member.full_name}</td><td>{member.email}</td><td>{member.role}</td><td>{member.active?"Ativo":"Inativo"}</td></tr>)}
      </tbody></table></div>
    </section>
    <section className="crm-panel">
      <div className="crm-panel-head"><div><h2>Convidar integrante</h2><p>O e-mail confirmado determina a empresa e a função.</p></div><MailPlus/></div>
      <form className="crm-form" onSubmit={invite}>
        <label>E-mail<input name="email" type="email" required autoComplete="email"/></label>
        <label>Função<select name="role" defaultValue="consultor">{roles.map(role=><option key={role}>{role}</option>)}</select></label>
        <button className="crm-primary" disabled={busy}>{busy?<LoaderCircle className="spin"/>:<ShieldCheck/>}Criar convite</button>
      </form>
      {invitations.length?<div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>E-mail</th><th>Função</th><th>Situação</th></tr></thead><tbody>{invitations.map(item=><tr key={item.id}><td>{item.email}</td><td>{item.role}</td><td>{item.accepted_at?"Aceito":new Date(item.expires_at)<new Date()?"Expirado":"Pendente"}</td></tr>)}</tbody></table></div>:null}
    </section>
    {platformAdmin?<section className="crm-panel">
      <div className="crm-panel-head"><div><h2>Nova empresa na plataforma</h2><p>Provisiona ambiente isolado, pipeline, fila e administrador inicial.</p></div><Building2/></div>
      <form className="crm-form" onSubmit={createTenant}>
        <label>Nome da empresa<input name="name" required maxLength={120}/></label>
        <label>Identificador na URL<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="empresa-exemplo"/></label>
        <label>E-mail do administrador<input name="administrator_email" type="email" required/></label>
        <label>Razão social<input name="legal_name"/></label><label>CNPJ<input name="tax_id"/></label>
        <label>Telefone<input name="phone" type="tel"/></label><label>Cidade<input name="city"/></label>
        <label>UF<input name="state" maxLength={2}/></label>
        <button className="crm-primary" disabled={busy}>{busy?<LoaderCircle className="spin"/>:<Building2/>}Cadastrar empresa</button>
      </form>
      {organizations.length?<p className="crm-muted">{organizations.length} empresa(s) cadastrada(s) na plataforma.</p>:null}
    </section>:null}
    {message?<div className="crm-alert" role="status" aria-live="polite">{message}</div>:null}
  </div>;
}
