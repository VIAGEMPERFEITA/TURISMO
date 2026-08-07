"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { getSupabaseBrowserClient } from "../lib/supabase-client";

const META_APP_ID = "1295731149305805";
const META_CONFIGURATION_ID = "4336542926489080";
const META_SDK_ID = "facebook-jssdk";
const META_SDK_URL = "https://connect.facebook.net/pt_BR/sdk.js";
const LOGIN_TIMEOUT_MS = 20_000;

type SignupSession = { waba_id?: string; phone_number_id?: string };
type FacebookResponse = {
  authResponse?: { code?: string };
  status?: string;
};
type FacebookSdk = {
  init(options: Record<string, unknown>): void;
  login(
    callback: (response: FacebookResponse) => void,
    options: Record<string, unknown>,
  ): void;
};

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  return "falha desconhecida do SDK";
}

export function AdminWhatsAppConnection() {
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const signupSession = useRef<SignupSession | null>(null);
  const loginTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopConnecting() {
    if (loginTimeout.current) clearTimeout(loginTimeout.current);
    loginTimeout.current = null;
    setConnecting(false);
  }

  function initializeSdk() {
    if (!window.FB) return false;
    try {
      window.FB.init({
        appId: META_APP_ID,
        cookie: true,
        xfbml: false,
        version: "v25.0",
      });
      setSdkError(false);
      setSdkReady(true);
      return true;
    } catch (error) {
      setSdkReady(false);
      setSdkError(true);
      setMessage(`Não foi possível iniciar a Meta: ${errorMessage(error)}.`);
      return false;
    }
  }

  function loadSdk(force = false) {
    setSdkReady(false);
    setSdkError(false);
    setMessage("");

    if (force) {
      document.getElementById(META_SDK_ID)?.remove();
      delete window.FB;
    } else if (window.FB && initializeSdk()) {
      return;
    }

    window.fbAsyncInit = initializeSdk;
    const existing = document.getElementById(META_SDK_ID);
    if (existing) return;

    const script = document.createElement("script");
    script.id = META_SDK_ID;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = META_SDK_URL;
    script.onerror = () => {
      setSdkReady(false);
      setSdkError(true);
      setMessage(
        "O navegador não conseguiu carregar a conexão da Meta. Verifique bloqueadores de conteúdo e tente novamente.",
      );
    };
    document.head.appendChild(script);
  }

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    client
      ?.from("whatsapp_accounts")
      .select("status,coexistence_enabled")
      .eq("phone_e164", "5531995285665")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setMessage("Não foi possível consultar o estado atual do WhatsApp.");
          return;
        }
        setConnected(Boolean(data?.coexistence_enabled && data?.status === "ativo"));
      });

    const onMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith("facebook.com")) return;
      let payload = event.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }
      if (payload?.type !== "WA_EMBEDDED_SIGNUP") return;
      if (payload.event === "FINISH") signupSession.current = payload.data ?? null;
      if (payload.event === "CANCEL") {
        stopConnecting();
        setMessage("Conexão cancelada. O WhatsApp do celular não foi alterado.");
      }
      if (payload.event === "ERROR") {
        stopConnecting();
        setMessage("A Meta não concluiu a conexão. Nenhuma conta foi removida.");
      }
    };

    window.addEventListener("message", onMessage);
    loadSdk();
    return () => {
      window.removeEventListener("message", onMessage);
      if (loginTimeout.current) clearTimeout(loginTimeout.current);
    };
  }, []);

  function connect() {
    if (connecting || connected) return;
    if (!window.FB || !sdkReady) {
      setMessage("A conexão da Meta ainda não está pronta. Recarregue e tente novamente.");
      setSdkError(true);
      return;
    }

    setConnecting(true);
    setMessage("");
    signupSession.current = null;
    loginTimeout.current = setTimeout(() => {
      stopConnecting();
      setMessage(
        "A janela da Meta não respondeu. Autorize pop-ups para este site e clique em tentar novamente.",
      );
    }, LOGIN_TIMEOUT_MS);

    try {
      window.FB.login(
        (response) => {
          void (async () => {
          const code = response.authResponse?.code;
          if (!code) {
            stopConnecting();
            setMessage(
              "A autorização não foi concluída. Permita a janela da Meta e tente novamente; nenhuma alteração foi feita no celular.",
            );
            return;
          }

          // The signup session event can arrive just after the OAuth callback.
          for (let attempt = 0; attempt < 40 && !signupSession.current; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
          const session = signupSession.current;
          if (!session?.waba_id || !session?.phone_number_id) {
            stopConnecting();
            setMessage(
              "A Meta autorizou o login, mas não retornou a conta do WhatsApp. Escolha conectar o WhatsApp Business existente e tente novamente.",
            );
            return;
          }

          const client = getSupabaseBrowserClient();
          if (!client) {
            stopConnecting();
            setMessage("Supabase não configurado.");
            return;
          }

          const { data, error } = await client.functions.invoke("whatsapp-embedded-signup", {
            body: { code, ...session },
          });
          stopConnecting();
          if (error || !data?.connected) {
            setMessage(
              data?.error
                ? `Conexão não concluída: ${data.error}`
                : "Não foi possível concluir a conexão.",
            );
            return;
          }
          setConnected(true);
          setMessage(
            "WhatsApp Business conectado em coexistência. O aplicativo do celular permanece ativo.",
          );
          })();
        },
        {
          config_id: META_CONFIGURATION_ID,
          response_type: "code",
          override_default_response_type: true,
          extras: {
            setup: {},
            sessionInfoVersion: "3",
            featureType: "whatsapp_business_app_onboarding",
          },
        },
      );
    } catch (error) {
      stopConnecting();
      setMessage(
        `A janela da Meta não pôde ser aberta (${errorMessage(error)}). Autorize pop-ups e tente novamente.`,
      );
    }
  }

  return (
    <div className="crm-report-grid whatsapp-connection-grid">
      <section className="crm-panel">
        <div className="crm-panel-head">
          <div>
            <h2>WhatsApp Business</h2>
            <p>Conecte o número oficial à caixa compartilhada usando o cadastro incorporado da Meta.</p>
          </div>
          {connected ? <CheckCircle2 aria-label="Conectado" /> : <MessageCircle />}
        </div>
        <div className={`whatsapp-connection-status ${connected ? "connected" : "pending"}`}>
          <strong>{connected ? "Conectado em coexistência" : "Aguardando conexão"}</strong>
          <span>(31) 99528-5665</span>
        </div>
        <button
          className="crm-primary whatsapp-connect-button"
          onClick={sdkError ? () => loadSdk(true) : connect}
          disabled={connecting || connected || (!sdkReady && !sdkError)}
        >
          {connecting ? (
            <LoaderCircle className="spin" />
          ) : connected ? (
            <CheckCircle2 />
          ) : sdkError ? (
            <RefreshCw />
          ) : (
            <MessageCircle />
          )}
          {connecting
            ? "Conectando…"
            : connected
              ? "WhatsApp conectado"
              : sdkError
                ? "Recarregar conexão da Meta"
                : sdkReady
                  ? "Conectar WhatsApp Business"
                  : "Carregando Meta…"}
        </button>
        {message ? (
          <div className="crm-alert" role="status" aria-live="polite">
            {message}
          </div>
        ) : null}
      </section>
      <section className="crm-panel">
        <h2>Proteção do aplicativo móvel</h2>
        <ul className="ai-safety-list">
          <li>
            <Smartphone />
            <span>
              <b>WhatsApp permanece no celular</b>
              <small>Este fluxo usa coexistência e não solicita exclusão do aplicativo.</small>
            </span>
          </li>
          <li>
            <ShieldCheck />
            <span>
              <b>Token protegido</b>
              <small>A credencial é trocada no servidor e armazenada no Vault do Supabase.</small>
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
