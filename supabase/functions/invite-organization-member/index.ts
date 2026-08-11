import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appUrl = (Deno.env.get("APP_URL") ?? "https://viagemperfeita.github.io/TURISMO").replace(/\/$/, "");
  const authorization = request.headers.get("Authorization");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return json({ error: "Configuração de autenticação ausente." }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Sessão inválida." }, 401);

  const { data: caller } = await admin.from("profiles")
    .select("organization_id,role,active")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (!caller?.active || caller.role !== "administrador" || !caller.organization_id) {
    return json({ error: "Somente administradores ativos podem convidar integrantes." }, 403);
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = String(body.role ?? "consultor");
  const allowedRoles = ["administrador", "gestor", "consultor", "atendimento", "marketing", "financeiro", "visualizador"];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !allowedRoles.includes(role)) {
    return json({ error: "E-mail ou função inválidos." }, 400);
  }

  const { data: invitationId, error: invitationError } = await userClient.rpc("invite_organization_member", {
    target_email: email,
    target_role: role,
  });
  if (invitationError) return json({ error: invitationError.message }, 400);

  const { data: existingProfile } = await admin.from("profiles")
    .select("id")
    .eq("organization_id", caller.organization_id)
    .ilike("email", email)
    .maybeSingle();
  if (existingProfile) {
    return json({ invited: true, linkedExistingUser: true, invitationId });
  }

  const { error: emailError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/admin/redefinir-senha/`,
    data: { invited_organization_id: caller.organization_id, invited_role: role },
  });
  if (emailError) {
    await admin.from("organization_invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", invitationId);
    return json({ error: `O convite não pôde ser enviado: ${emailError.message}` }, 400);
  }

  return json({ invited: true, linkedExistingUser: false, invitationId });
});
