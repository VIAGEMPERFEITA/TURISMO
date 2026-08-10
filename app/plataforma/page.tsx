import type { Metadata } from "next";
import Link from "next/link";
import {
  Bot,
  Building2,
  CheckCircle2,
  Headphones,
  LockKeyhole,
  MessagesSquare,
  ShieldCheck,
  Users,
} from "lucide-react";
import { BasicContentPage } from "../../components/basic-content-page";
import { siteConfig } from "../../lib/site-config";

export const metadata: Metadata = {
  title: "Plataforma de atendimento e CRM | Viagem Perfeita",
  description:
    "Conheça a plataforma de atendimento compartilhado, CRM e automações desenvolvida pela Viagem Perfeita para empresas de turismo.",
  alternates: { canonical: "/plataforma" },
};

const capabilities = [
  [MessagesSquare, "Caixa de entrada compartilhada", "Organiza conversas autorizadas do WhatsApp Business em um único ambiente para a equipe."],
  [Users, "Distribuição de atendimentos", "Permite atribuir conversas a atendentes e acompanhar responsáveis, status e histórico."],
  [Bot, "Automação assistida por IA", "Apoia respostas, triagem e consultas à base de conhecimento, com possibilidade de intervenção humana."],
  [Headphones, "CRM para turismo", "Relaciona contatos, interesses, caravanas, propostas, reservas, pagamentos, documentos e atividades."],
] as const;

export default function PlataformaPage() {
  return (
    <BasicContentPage
      eyebrow="Tecnologia Viagem Perfeita"
      title="Atendimento compartilhado e CRM para empresas de turismo."
      description="Uma plataforma própria para organizar conversas, oportunidades e jornadas comerciais, preservando o controle de cada empresa sobre seus dados e ativos."
    >
      <section className="institutional-section">
        <p className="eyebrow">O serviço</p>
        <h2>Relacionamento com contexto, segurança e continuidade.</h2>
        <p>
          A plataforma Viagem Perfeita Atendimento conecta, mediante autorização do cliente, contas do
          WhatsApp Business à caixa compartilhada e ao CRM. A solução ajuda empresas de turismo a receber
          contatos, distribuir atendimentos, registrar históricos e acompanhar oportunidades do primeiro
          interesse ao pós-venda.
        </p>
        <div className="value-grid institutional-values">
          {capabilities.map(([Icon, title, description]) => (
            <div key={title}>
              <Icon />
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="institutional-section">
        <p className="eyebrow">Como funciona</p>
        <h2>Cada empresa conecta e controla seus próprios ativos.</h2>
        <div className="process-grid">
          {[
            ["01", "Autorização", "A empresa inicia a conexão e escolhe os ativos que deseja compartilhar."],
            ["02", "Organização", "As conversas autorizadas são vinculadas ao histórico comercial no CRM."],
            ["03", "Atendimento", "A equipe atende em uma caixa compartilhada, com responsáveis e controles de acesso."],
            ["04", "Automação", "Regras e IA apoiam a operação, sempre com supervisão e retomada humana."],
          ].map(([number, title, text]) => (
            <div key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="credibility-card">
        <div>
          <p className="eyebrow light">Privacidade e controle</p>
          <h2>Uso responsável das informações autorizadas.</h2>
          <p>
            A plataforma usa somente os dados necessários para prestar o serviço contratado. Não vende
            informações e não assume a administração dos portfólios empresariais dos clientes.
          </p>
        </div>
        <div className="trust-reasons">
          <p><ShieldCheck /> Conexão iniciada e autorizada pela própria empresa</p>
          <p><LockKeyhole /> Credenciais protegidas no ambiente de servidor</p>
          <p><Building2 /> Ambientes e permissões separados por empresa</p>
          <p><CheckCircle2 /> Atendimento humano disponível durante a automação</p>
        </div>
      </section>

      <section className="institutional-section">
        <p className="eyebrow">Empresa responsável</p>
        <h2>{siteConfig.legalName}</h2>
        <dl className="platform-company-details">
          <div><dt>Nome fantasia</dt><dd>{siteConfig.name}</dd></div>
          <div><dt>CNPJ</dt><dd>{siteConfig.business.cnpj}</dd></div>
          <div><dt>Sede</dt><dd>{siteConfig.business.city} / {siteConfig.business.state}</dd></div>
          <div><dt>E-mail</dt><dd>{siteConfig.business.email}</dd></div>
          <div><dt>WhatsApp</dt><dd>(31) 99528-5665</dd></div>
        </dl>
        <p>
          Consulte também nossa <Link href="/politica-de-privacidade">Política de Privacidade</Link> e os{" "}
          <Link href="/termos-de-uso">Termos de Uso</Link>.
        </p>
      </section>
    </BasicContentPage>
  );
}
