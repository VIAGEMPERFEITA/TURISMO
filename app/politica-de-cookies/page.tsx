import type { Metadata } from "next";
import { BasicContentPage } from "../../components/basic-content-page";
export const metadata:Metadata={title:"Política de cookies | Viagem Perfeita Turismo",description:"Informações sobre cookies e tecnologias de medição.",alternates:{canonical:"/politica-de-cookies"}};
export default function Page(){return <BasicContentPage eyebrow="Cookies" title="Controle e transparência." description="Como tecnologias de navegação poderão ser utilizadas."><p>Cookies essenciais podem ser usados para funcionamento e segurança. Medições opcionais e publicidade deverão depender das configurações e do consentimento aplicável.</p><p>Não enviamos nome, telefone ou e-mail ao Google Analytics ou Meta Pixel.</p></BasicContentPage>}
