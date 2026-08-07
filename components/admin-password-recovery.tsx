"use client";

import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { getSupabaseBrowserClient } from "../lib/supabase-client";

export function AdminPasswordRecovery() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage("");
    const client = getSupabaseBrowserClient();
    if (!client) { setMessage("A autenticação ainda não foi conectada ao Supabase."); setBusy(false); return; }
    const redirectTo = `${window.location.origin}${base}/admin/redefinir-senha/`;
    const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
    setBusy(false);
    if (error?.code === "over_email_send_rate_limit" || error?.status === 429) {
      setMessage("Muitas solicitações foram realizadas. Aguarde uma hora antes de tentar novamente.");
      return;
    }
    setMessage(error ? "Não foi possível solicitar a recuperação agora." : "Se o e-mail estiver cadastrado, enviaremos um link seguro para redefinir a senha.");
  }

  return <form className="admin-login-card" onSubmit={submit}>
    <div className="admin-login-brand">VP</div><p>Recuperação segura</p><h1>Esqueceu a senha?</h1>
    <label><Mail/>E-mail<input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)}/></label>
    {message ? <div className="admin-message" role="status">{message}</div> : null}
    <button type="submit" disabled={busy}><Mail/>{busy ? "Enviando…" : "Enviar link seguro"}</button>
    <button type="button" className="recover" onClick={() => window.location.href = `${base}/admin/login/`}><ArrowLeft/>Voltar ao login</button>
  </form>;
}
