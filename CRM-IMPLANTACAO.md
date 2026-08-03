# Implantação do CRM — Viagem Perfeita Turismo

## Arquitetura

- Site público: Next.js, compatível temporariamente com GitHub Pages.
- Aplicação completa: Vercel, sem `basePath`.
- Banco, autenticação e arquivos privados: Supabase/PostgreSQL.
- Segurança: Supabase Auth + Row Level Security. A proteção visual do frontend não concede acesso a dados.

## 1. Criar o Supabase

1. Crie um projeto vazio no Supabase.
2. Abra **SQL Editor**.
3. Execute `supabase/migrations/202608030001_crm_base.sql`.
4. Em **Authentication > URL Configuration**, informe o domínio da Vercel e, depois, o domínio oficial.
5. Não torne o bucket `private-documents` público.

## 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` apenas no computador de desenvolvimento. Na Vercel, cadastre:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — somente no servidor; nunca expor com prefixo `NEXT_PUBLIC_`
- `NEXT_PUBLIC_SITE_URL=https://www.viagemperfeitaturismo.com.br`

O anon key pode estar no navegador porque o acesso real é limitado pelas políticas RLS. A service role é secreta.

## 3. Primeiro administrador

1. Em **Authentication > Users**, crie o usuário com e-mail verificado e senha temporária segura.
2. O gatilho criará o perfil como `visualizador`.
3. No SQL Editor, execute, substituindo o e-mail:

```sql
update public.profiles
set role = 'administrador', active = true
where email = 'EMAIL_DO_ADMINISTRADOR';
```

4. Entre em `/admin/login` e troque a senha quando necessário.

## 4. Publicar na Vercel

1. Importe o repositório `VIAGEMPERFEITA/TURISMO` na Vercel.
2. Framework: Next.js. Build command: `next build`.
3. Cadastre as variáveis acima para Production e Preview.
4. Faça o primeiro deploy e teste login, RLS, formulário e documentos.
5. O GitHub Pages pode continuar exibindo o institucional enquanto a migração é validada. O CRM não deve ser usado ali para dados reais.

## 5. Domínio oficial

O código usa `https://www.viagemperfeitaturismo.com.br` em canonical, sitemap e schema. Depois da validação na Vercel, configure o domínio no painel da Vercel e então altere o DNS no provedor. O DNS não foi alterado por este projeto.

## 6. Backup e recuperação

- Ative os backups disponíveis no plano Supabase.
- Faça exportação periódica do PostgreSQL e teste restauração em outro projeto.
- Mantenha as migrações SQL versionadas no repositório.
- Arquivos do bucket privado exigem política própria de cópia/backup.
- Antes de aplicar futuras migrações, gere backup e valide em staging.

## 7. Checklist de produção

- Criar primeiro administrador e revisar papéis.
- Testar que um consultor só vê leads atribuídos.
- Testar deduplicação por telefone e e-mail.
- Confirmar consentimento e política de privacidade.
- Testar URLs assinadas do bucket privado.
- Confirmar que nenhuma chave secreta entrou no GitHub.
- Informar CNPJ, Cadastur, cidade/UF, e-mail e canal de privacidade antes de publicá-los.
