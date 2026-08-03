/**
 * O CRM utiliza PostgreSQL/Supabase. Este módulo permanece apenas para evitar
 * imports antigos; o acesso no navegador deve usar `lib/supabase-client.ts`.
 */
export function getDb():never { throw new Error("D1 não é utilizado. Configure o Supabase conforme CRM-IMPLANTACAO.md.") }
