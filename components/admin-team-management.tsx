"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Building2, LoaderCircle, MailPlus, ShieldCheck, UserRoundCheck } from "lucide-react";
import { getSupabaseBrowserClient } from "../lib/supabase-client";
import { crmRoles, roleLabel, type CrmRole } from "../lib/crm-auth";

type Member = { id: string; full_name: string; email: string; role: string; active: boolean };
type Invitation = { id: string; email: string; role: string; expires_at: string; accepted_at: string | null };
type Organization = { id: string; name: string; slug: string; active: boolean };

const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

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
    const form = event.currentTarget;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const values = new FormData(form);
    setBusy(true); setMessage("");
    const { data, error } = await client.functions.invoke("invite-organization-member", {
      body: {
        email: String(values.get("email") ?? ""),
        role: String(values.get("role") ?? "consultor"),
      },
    });
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    form.reset();
    setMessage(data?.linkedExistingUser
      ? "Usuário existente vinculado à empresa com sucesso."
      : "Convite enviado por e-mail. O acesso será ativado após a confirmação.");
    await load();
  }

  async function createTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const values = new FormData(form);
    setBusy(true); setMessage("");
    const { data, error } = await client.functions.invoke("create-tenant-organization", {
      body: {
        name: String(values.get("name") ?? ""),
        slug: String(values.get("slug") ?? ""),
        administratorEmail: String(values.get("administrator_email") ?? ""),
        legalName: String(values.get("legal_name") ?? ""),
        taxId: String(values.get("tax_id") ?? ""),
        phone: String(values.get("phone") ?? ""),
        city: String(values.get("city") ?? ""),
        state: String(values.get("state") ?? ""),
      },
    });
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    form.reset();
    setMessage(data?.linkedExistingUser
      ? "Empresa criada e vinculada ao administrador existente."
      : "Empresa criada com pipeline e fila. O convite de acesso foi enviado ao administrador.");
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
        <label>Função<select name="role" defaultValue="consultor">{crmRoles.map(role=><option key={role} value={role}>{roleLabel(role as CrmRole)}</option>)}</select></label>
        <button className="crm-primary" disabled={busy}>{busy?<LoaderCircle className="spin"/>:<ShieldCheck/>}Criar convite</button>
      </form>
      {invitations.length?<div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>E-mail</th><th>Função</th><th>Situação</th></tr></thead><tbody>{invitations.map(item=><tr key={item.id}><td>{item.email}</td><td>{item.role}</td><td>{item.accepted_at?"Aceito":new Date(item.expires_at)<new Date()?"Expirado":"Pendente"}</td></tr>)}</tbody></table></div>:null}
    </section>
    {platformAdmin?<section className="crm-panel tenant-company-panel">
      <div className="crm-panel-head"><div><h2>Nova empresa na plataforma</h2><p>Provisiona ambiente isolado, pipeline, fila e administrador inicial.</p></div><Building2/></div>
      <form className="crm-form tenant-form" onSubmit={createTenant}>
        <div className="tenant-form-section">
          <h3>Identificação da empresa</h3>
          <div className="tenant-form-grid">
            <label>Nome da empresa<input name="name" required maxLength={120} placeholder="Nome usado no painel" onBlur={event=>{const slug=event.currentTarget.form?.elements.namedItem("slug") as HTMLInputElement|null;if(slug&&!slug.value)slug.value=slugify(event.currentTarget.value)}}/></label>
            <label>Identificador interno<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="rede-asas"/><small>Use apenas letras minúsculas, números e hífen. Não coloque o endereço do site.</small></label>
            <label className="wide">Razão social<input name="legal_name" placeholder="Razão social completa"/></label>
            <label>CNPJ<input name="tax_id" inputMode="numeric" placeholder="00.000.000/0000-00"/></label>
          </div>
        </div>
        <div className="tenant-form-section">
          <h3>Contato e localização</h3>
          <div className="tenant-form-grid">
            <label>Telefone<input name="phone" type="tel" placeholder="DDD + número"/></label>
            <label>Cidade<input name="city" placeholder="Cidade"/></label>
            <label>UF<input name="state" maxLength={2} placeholder="MG"/></label>
          </div>
        </div>
        <div className="tenant-form-section tenant-access-section">
          <h3>Acesso inicial</h3><p>Este e-mail receberá o convite para criar a senha de administrador.</p>
          <div className="tenant-form-grid"><label className="wide">E-mail do administrador<input name="administrator_email" type="email" required placeholder="administrador@empresa.com.br"/></label></div>
        </div>
        <div className="tenant-form-actions"><span>Os dados e atendimentos ficarão isolados das demais empresas.</span><button className="crm-primary" disabled={busy}>{busy?<LoaderCircle className="spin"/>:<Building2/>}Cadastrar empresa</button></div>
      </form>
      {organizations.length?<p className="crm-muted">{organizations.length} empresa(s) cadastrada(s) na plataforma.</p>:null}
    </section>:null}
    {message?<div className="crm-alert" role="status" aria-live="polite">{message}</div>:null}
  </div>;
}
