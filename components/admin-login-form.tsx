"use client";

import { useState } from "react";
import { KeyRound, LogIn, Mail } from "lucide-react";
import { getSupabaseBrowserClient } from "../lib/supabase-client";

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  async function login(event: React.FormEvent) {
    event.preventDefault();
    const client = getSupabaseBrowserClient();
    if (!client) return setMessage("A autenticação ainda não foi conectada ao Supabase.");
    const { error } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return setMessage("Acesso não autorizado ou credenciais inválidas.");
    window.location.href = `${base}/admin/dashboard/`;
  }

  return <form className="admin-login-card" onSubmit={login}>
    <div className="admin-login-brand">VP</div><p>Área protegida</p><h1>CRM Viagem Perfeita</h1>
    <label><Mail/>E-mail<input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)}/></label>
    <label><KeyRound/>Senha<input type="password" required minLength={8} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)}/></label>
    {message ? <div className="admin-message" role="alert">{message}</div> : null}
    <button type="submit"><LogIn/>Entrar</button>
    <button type="button" className="recover" onClick={() => window.location.href = `${base}/admin/recuperar-senha/`}>Esqueci minha senha</button>
  </form>;
}
