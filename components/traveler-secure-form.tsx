"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { getSupabaseBrowserClient } from "../lib/supabase-client";

type Traveler = {
  full_name: string; birth_date: string; rg: string; cpf: string;
  passport_number: string; address: string; postal_code: string; email: string; phone: string;
};
const emptyTraveler = (): Traveler => ({ full_name: "", birth_date: "", rg: "", cpf: "", passport_number: "", address: "", postal_code: "", email: "", phone: "" });

export function TravelerSecureForm() {
  const [token, setToken] = useState("");
  const [travelers, setTravelers] = useState<Traveler[]>([emptyTraveler()]);
  const [state, setState] = useState<"loading" | "ready" | "sending" | "success" | "invalid">("loading");
  const [message, setMessage] = useState("");
  const client = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    const currentToken = new URLSearchParams(window.location.search).get("token") || "";
    setToken(currentToken);
    if (!client || !currentToken) { setState("invalid"); return; }
    client.functions.invoke("secure-traveler-intake", { body: { action: "context", token: currentToken } }).then(({ data, error }) => {
      if (error || !data?.traveler_count) { setState("invalid"); return; }
      setTravelers(Array.from({ length: Number(data.traveler_count) }, emptyTraveler));
      setState("ready");
    });
  }, [client]);

  function update(index: number, field: keyof Traveler, value: string) {
    setTravelers(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!client || state === "sending") return;
    setState("sending");
    setMessage("");
    const { data, error } = await client.functions.invoke("secure-traveler-intake", { body: { action: "submit", token, travelers } });
    if (error || !data?.success) {
      setMessage("Não foi possível enviar. Confira os campos obrigatórios ou solicite um novo link à equipe.");
      setState("ready");
      return;
    }
    setTravelers([]);
    setState("success");
  }

  if (state === "loading") return <main className="secure-intake"><section><LockKeyhole/><h1>Validando acesso seguro…</h1></section></main>;
  if (state === "invalid") return <main className="secure-intake"><section><LockKeyhole/><h1>Link inválido ou expirado</h1><p>Por segurança, este link é temporário. Solicite um novo link no mesmo atendimento.</p></section></main>;
  if (state === "success") return <main className="secure-intake"><section><CheckCircle2/><h1>Cadastro recebido com segurança</h1><p>Nossa equipe foi avisada e continuará a reserva no mesmo atendimento. Você não precisa reenviar estes dados pelo WhatsApp.</p></section></main>;

  return <main className="secure-intake"><section>
    <div className="secure-intake-head"><ShieldCheck/><div><h1>Cadastro seguro de viajantes</h1><p>Preencha um cadastro por pessoa. Os dados são cifrados antes de serem armazenados e não aparecem na conversa.</p></div></div>
    <form onSubmit={submit}>
      {travelers.map((traveler, index) => <fieldset key={index}>
        <legend>Viajante {index + 1}</legend>
        <label>Nome completo<input required autoComplete="name" value={traveler.full_name} onChange={e => update(index, "full_name", e.target.value)}/></label>
        <label>Data de nascimento<input required type="date" value={traveler.birth_date} onChange={e => update(index, "birth_date", e.target.value)}/></label>
        <label>RG<input value={traveler.rg} onChange={e => update(index, "rg", e.target.value)}/></label>
        <label>CPF<input required inputMode="numeric" value={traveler.cpf} onChange={e => update(index, "cpf", e.target.value)}/></label>
        <label>Número do passaporte<input value={traveler.passport_number} onChange={e => update(index, "passport_number", e.target.value)}/></label>
        <label className="wide">Endereço<input autoComplete="street-address" value={traveler.address} onChange={e => update(index, "address", e.target.value)}/></label>
        <label>CEP<input inputMode="numeric" autoComplete="postal-code" value={traveler.postal_code} onChange={e => update(index, "postal_code", e.target.value)}/></label>
        <label>E-mail<input required type="email" autoComplete="email" value={traveler.email} onChange={e => update(index, "email", e.target.value)}/></label>
        <label>Telefone com DDD<input required type="tel" autoComplete="tel" value={traveler.phone} onChange={e => update(index, "phone", e.target.value)}/></label>
      </fieldset>)}
      <label className="secure-consent"><input required type="checkbox"/> Autorizo o uso destes dados exclusivamente para preparar a reserva, o contrato e a documentação da viagem.</label>
      {message ? <p className="secure-error" role="alert">{message}</p> : null}
      <button type="submit" disabled={state === "sending"}>{state === "sending" ? "Enviando com segurança…" : "Enviar cadastro protegido"}</button>
      <small>Não envie foto de cartão, senha ou código de autenticação. A foto do passaporte será solicitada posteriormente em área privada pela equipe.</small>
    </form>
  </section></main>;
}

