import type { Session, SupabaseClient } from "@supabase/supabase-js";

export const crmRoles = ["administrador", "gestor", "consultor", "visualizador"] as const;
export type CrmRole = (typeof crmRoles)[number];

export type CrmProfile = {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  role: CrmRole;
  active: boolean;
};

export type AuthenticatedCrmUser = { session: Session; profile: CrmProfile };

const roleLabels: Record<CrmRole, string> = {
  administrador: "Administrador",
  gestor: "Gestor",
  consultor: "Consultor",
  visualizador: "Visualizador",
};

const moduleRoles: Record<string, readonly CrmRole[]> = {
  equipe: ["administrador"],
  configuracoes: ["administrador"],
  pagamentos: ["administrador", "gestor"],
  relatorios: ["administrador", "gestor"],
  ia: ["administrador", "gestor"],
  "ia-logs": ["administrador", "gestor"],
  "ia-configuracoes": ["administrador", "gestor"],
  precos: ["administrador", "gestor"],
  simulador: ["administrador", "gestor", "consultor"],
  propostas: ["administrador", "gestor", "consultor"],
  aprovacoes: ["administrador", "gestor"],
  "base-de-conhecimento": ["administrador", "gestor"],
  google: ["administrador", "gestor"],
  caravanas: ["administrador", "gestor"],
  experiencias: ["administrador", "gestor"],
  reservas: ["administrador", "gestor", "consultor"],
  documentos: ["administrador", "gestor", "consultor"],
  clientes: ["administrador", "gestor", "consultor", "visualizador"],
  leads: ["administrador", "gestor", "consultor", "visualizador"],
  pipeline: ["administrador", "gestor", "consultor", "visualizador"],
  tarefas: ["administrador", "gestor", "consultor", "visualizador"],
  dashboard: crmRoles,
  atendimento: ["administrador", "gestor", "consultor"],
  campanhas: ["administrador", "gestor", "consultor"],
};

export function roleLabel(role: CrmRole) {
  return roleLabels[role];
}

export function moduleFromPath(pathname: string) {
  const segment = pathname.split("/").filter(Boolean)[1] ?? "dashboard";
  return segment === "login" || segment === "recuperar-senha" || segment === "redefinir-senha" ? null : segment;
}

export function canAccessModule(role: CrmRole, module: string | null) {
  if (!module) return true;
  return (moduleRoles[module] ?? ["administrador"]).includes(role);
}

export async function getAuthenticatedCrmUser(client: SupabaseClient): Promise<AuthenticatedCrmUser | null> {
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError || !sessionData.session) return null;
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id,organization_id,full_name,email,role,active")
    .eq("id", sessionData.session.user.id)
    .single<CrmProfile>();
  if (profileError || !profile?.active || !crmRoles.includes(profile.role)) {
    await client.auth.signOut();
    return null;
  }
  return { session: sessionData.session, profile };
}
