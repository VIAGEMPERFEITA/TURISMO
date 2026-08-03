import { AdminShell } from "../../../../components/admin-shell";
import { AdminPlaceholder } from "../../../../components/admin-placeholder";
export const dynamicParams=false;
export function generateStaticParams(){return[{id:"registro"}]}
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;return <AdminShell title="Perfil do lead"><AdminPlaceholder title="Resumo, histórico, notas e tarefas" description={`Registro ${id}. A leitura e as alterações dependem da sessão e das políticas RLS.`}/></AdminShell>}
