import type { Metadata } from "next";
import { BasicContentPage } from "../../components/basic-content-page";
export const metadata:Metadata={title:"Termos de uso | Viagem Perfeita Turismo",description:"Condições gerais de uso do site.",alternates:{canonical:"/termos-de-uso"}};
export default function Page(){return <BasicContentPage eyebrow="Termos" title="Uso responsável das informações." description="Condições gerais para navegar e solicitar atendimento."><p>As informações do site apresentam as experiências disponíveis. Somente propostas e contratos oficiais confirmam preços, serviços, disponibilidade e condições comerciais.</p><p>Regras de fronteira, saúde, voos e fornecedores podem mudar. O visitante deve confirmar informações oficiais antes de tomar decisões.</p></BasicContentPage>}
