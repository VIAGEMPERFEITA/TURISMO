"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import { getSupabaseBrowserClient } from "../lib/supabase-client";

export function AdminPasswordReset() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [validSession, setValidSession] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) { setValidSession(false); return; }
    client.auth.getSession().then(({ data }) => setValidSession(Boolean(data.session)));
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setValidSession(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    if (password.length < 8) return setMessage("A nova senha precisa ter pelo menos 8 caracteres.");
    if (password !== confirmation) return setMessage("As senhas informadas não são iguais.");
    const client = getSupabaseBrowserClient();
    if (!client || !validSession) return setMessage("Este link é inválido ou expirou.");
    const { error } = await client.auth.updateUser({ password });
    if (error) return setMessage("Não foi possível redefinir a senha. Solicite um novo link.");
    await client.auth.signOut(); setDone(true);
  }

  if (done) return <div className="admin-login-card"><CheckCircle2/><p>Senha atualizada</p><h1>Acesso recuperado</h1><button onClick={() => window.location.href = `${base}/admin/login/`}>Entrar no CRM</button></div>;
  if (validSession === null) return <div className="admin-login-card">Validando o link seguro…</div>;
  return <form className="admin-login-card" onSubmit={submit}>
    <div className="admin-login-brand">VP</div><p>Nova senha</p><h1>Redefinir acesso</h1>
    {!validSession ? <div className="admin-message" role="alert">Este link é inválido ou expirou. Solicite uma nova recuperação.</div> : null}
    <label><KeyRound/>Nova senha<input type="password" required minLength={8} autoComplete="new-password" disabled={!validSession} value={password} onChange={event => setPassword(event.target.value)}/></label>
    <label><KeyRound/>Confirmar senha<input type="password" required minLength={8} autoComplete="new-password" disabled={!validSession} value={confirmation} onChange={event => setConfirmation(event.target.value)}/></label>
    {message ? <div className="admin-message" role="alert">{message}</div> : null}
    <button type="submit" disabled={!validSession}>Salvar nova senha</button>
    {!validSession ? <button type="button" className="recover" onClick={() => window.location.href = `${base}/admin/recuperar-senha/`}>Solicitar novo link</button> : null}
  </form>;
}
