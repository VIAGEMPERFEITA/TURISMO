"use client";

import { Bot, ChevronDown, LoaderCircle, MessageCircle, Send, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase-client";
import { useWhatsAppContact } from "./whatsapp-contact-provider";

type ChatMessage = { id: string; role: "assistant" | "user"; text: string };
const initialMessage = "Olá! Sou o Assistente Virtual da Viagem Perfeita Turismo. Como posso ajudar com sua próxima viagem?";

function sessionId() {
  const key = "vp_ai_session";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(key, created);
  return created;
}

export function AiSiteAssistant() {
  const { openContact } = useWhatsAppContact();
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: "welcome", role: "assistant", text: initialMessage }]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    client.rpc("public_ai_status").then(({ data }) => setAvailable(Boolean(data?.enabled)));
  }, []);
  useEffect(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), [messages, busy]);
  if (!available) return null;

  async function send() {
    const text = input.trim().slice(0, 1000);
    if (text.length < 2 || busy) return;
    setInput("");
    setMessages(current => [...current, { id: crypto.randomUUID(), role: "user", text }]);
    setBusy(true);
    const client = getSupabaseBrowserClient();
    const correlationId = crypto.randomUUID();
    const { data, error } = client ? await client.functions.invoke("ai-commercial-assistant", { body: { message: text, sessionId: sessionId(), correlationId } }) : { data: null, error: new Error("offline") };
    setBusy(false);
    setMessages(current => [...current, {
      id: crypto.randomUUID(),
      role: "assistant",
      text: !error && data?.message ? String(data.message) : "O atendimento virtual está temporariamente indisponível. Você pode falar agora com um consultor.",
    }]);
  }

  function finish() {
    setOpen(false);
    setMessages([{ id: "welcome", role: "assistant", text: initialMessage }]);
    window.localStorage.removeItem("vp_ai_session");
  }

  return <div className={open ? "ai-chat is-open" : "ai-chat"}>
    {open ? <section className="ai-chat-panel" role="dialog" aria-label="Assistente Virtual da Viagem Perfeita Turismo">
      <header><span><Bot aria-hidden="true" /><b>Assistente Virtual</b><small>Viagem Perfeita Turismo</small></span><button type="button" onClick={() => setOpen(false)} aria-label="Minimizar atendimento"><ChevronDown /></button><button type="button" onClick={finish} aria-label="Encerrar atendimento"><X /></button></header>
      <div className="ai-chat-messages" ref={listRef} aria-live="polite">{messages.map(message => <div key={message.id} className={`ai-message ${message.role}`}><span>{message.role === "assistant" ? <Bot /> : <UserRound />}</span><p>{message.text}</p></div>)}{busy ? <div className="ai-message assistant typing"><span><Bot /></span><p><LoaderCircle className="spin" /> Consultando informações aprovadas…</p></div> : null}</div>
      <div className="ai-chat-human"><button type="button" onClick={() => openContact({ buttonText: "Falar com um consultor", initialInterest: "Atendimento pelo assistente virtual" })}><MessageCircle /> Falar com uma pessoa</button></div>
      <form onSubmit={event => { event.preventDefault(); void send(); }}><label className="sr-only" htmlFor="ai-message">Digite sua mensagem</label><textarea id="ai-message" rows={1} maxLength={1000} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Digite sua dúvida…" /><button type="submit" disabled={busy || input.trim().length < 2} aria-label="Enviar mensagem"><Send /></button></form>
      <small className="ai-chat-notice">Não envie documentos, senhas ou dados de cartão.</small>
    </section> : <button className="ai-chat-trigger" type="button" onClick={() => setOpen(true)} aria-label="Abrir Assistente Virtual"><Bot /><span>Assistente Virtual</span></button>}
  </div>;
}
