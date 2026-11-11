import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const clean = (value: unknown, max = 180) => String(value ?? "").trim().slice(0, max);

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

  const { data: platformAdmin } = await admin.from("platform_administrators")
    .select("profile_id,active")
    .eq("profile_id", authData.user.id)
    .eq("active", true)
    .maybeSingle();
  if (!platformAdmin) return json({ error: "Somente administradores da plataforma podem criar empresas." }, 403);

  const body = await request.json().catch(() => ({}));
  const name = clean(body.name, 120);
  const slug = clean(body.slug, 80).toLowerCase();
  const administratorEmail = clean(body.administratorEmail, 254).toLowerCase();
  if (name.length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(administratorEmail)) {
    return json({ error: "Nome, identificador ou e-mail do administrador inválido." }, 400);
  }

  const { data: organizationId, error: createError } = await userClient.rpc("create_tenant_organization", {
    tenant_name: name,
    tenant_slug: slug,
    administrator_email: administratorEmail,
    tenant_legal_name: clean(body.legalName),
    tenant_tax_id: clean(body.taxId, 32),
    tenant_phone: clean(body.phone, 32),
    tenant_city: clean(body.city, 120),
    tenant_state: clean(body.state, 2).toUpperCase(),
  });
  if (createError) return json({ error: createError.message }, 400);

  const { data: existingProfile } = await admin.from("profiles")
    .select("id")
    .eq("organization_id", organizationId)
    .ilike("email", administratorEmail)
    .maybeSingle();
  if (existingProfile) {
    return json({ created: true, organizationId, linkedExistingUser: true });
  }

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(administratorEmail, {
    redirectTo: `${appUrl}/admin/redefinir-senha/`,
  });
  if (inviteError) {
    return json({
      error: `A empresa foi criada, mas o convite não pôde ser enviado: ${inviteError.message}`,
      created: true,
      organizationId,
    }, 502);
  }

  return json({ created: true, organizationId, linkedExistingUser: false });
});
