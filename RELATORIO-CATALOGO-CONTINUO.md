# Relatório — Catálogo contínuo de caravanas confirmadas

## Caravanas cadastradas

| Prioridade | Caravana | Período | Duração | Rota | Status |
|---:|---|---|---|---|---|
| 1 | Egito, Jordânia e Israel | Novembro de 2026 | Não informada | `/caravanas/egito-jordania-israel-novembro-2026/` | Disponível |
| 2 | Paris, Egito e Israel | Março de 2027 | Não informada | `/caravanas/paris-egito-israel-marco-2027/` | Disponível |
| 100 | Turquia e Grécia — Passos de Paulo | Março de 2027 | 14 dias | `/caravanas/turquia-grecia-2027/` | Disponível |
| 100 | Jordânia e Israel — Jornada da Promessa | Maio de 2027 | 13 dias | `/caravanas/jordania-israel-2027/` | Disponível |
| 100 | Itália — Caminhos de São Francisco | Junho de 2027 | 10 dias | `/caravanas/italia-2027/` | Disponível |
| 100 | Israel — Caminhos da Fé | Setembro de 2027 | 11 dias | `/caravanas/israel-2027/` | Disponível |
| 100 | Emirados e Egito — Entre História e Futuro | Outubro de 2027 | 13 dias | `/caravanas/emirados-egito-2027/` | Disponível |
| 100 | Israel e Egito — Raízes do Êxodo | Novembro de 2027 | 12 dias | `/caravanas/israel-egito-2027/` | Disponível |

## Implementação

- Todas as oito caravanas estão com status interno `confirmada`, status público `disponivel` e publicação ativa.
- As duas saídas principais permanecem primeiro por `priority`, inclusive em buscas e ordenações.
- O catálogo é agrupado automaticamente por ano e mês e não renderiza grupos vazios.
- Cards padronizados mostram status, destaque, nome, destinos, período, duração quando informada, embarque quando informado, descrição e ações.
- Cada card abre uma página individual com Hero, apresentação, informações rápidas, roteiro, inclusões/exclusões confirmadas, documentação, galeria, FAQ, valores e navegação relacionada.
- Todos os botões comerciais abrem primeiro o formulário contextual, depois a revisão e somente então o WhatsApp.
- A mensagem central inclui caravana, destinos, período, duração e status, omitindo campos vazios.
- O painel de caravanas permite cadastrar, editar, duplicar, publicar/despublicar, priorizar e alterar os principais campos cronológicos e comerciais.
- A migração `202608030003_continuous_caravan_catalog.sql` adiciona os campos comerciais e a tabela relacional de roteiro diário.

## Roteiros cadastrados

As seis caravanas anteriormente existentes preservam as etapas resumidas que já estavam cadastradas. As duas novas saídas não receberam atrações, serviços ou dias inventados; suas páginas apresentam um caminho para solicitar o roteiro oficial.

## Informações ainda incompletas

### Egito, Jordânia e Israel — Novembro de 2026

- datas exatas de saída e retorno;
- duração e noites;
- cidade/aeroporto de embarque;
- roteiro diário;
- companhia aérea, hotéis, alimentação, guia e acompanhamento;
- inclusões, vagas, líder/coordenador;
- valores e condições.

### Paris, Egito e Israel — Março de 2027

- datas exatas de saída e retorno;
- duração e noites;
- cidade/aeroporto de embarque;
- roteiro diário;
- companhia aérea, hotéis, alimentação, guia e acompanhamento;
- inclusões, vagas, líder/coordenador;
- valores e condições.

As demais caravanas ainda precisam de datas exatas, serviços confirmados, vagas, responsáveis e valores. Nenhum dado ausente foi inventado.

## Logo

A marca original foi preservada. Foram melhorados tamanho, proporção, recorte, respiro e leitura responsiva. As aplicações estão documentadas em `LOGO-APLICACOES.md`.

## Testes

- 9 testes automatizados aprovados.
- Build GitHub Pages aprovado: 81 páginas.
- Build Vercel aprovado: 81 páginas.
- TypeScript aprovado.
- Sitemap sem rotas administrativas.
- Duas prioridades e slugs exatos validados.
- WhatsApp oficial único validado.
- Formulário e revisão contextual validados no código.

## Dependência de infraestrutura

No GitHub Pages, o catálogo e os formulários funcionam, mas a gravação no CRM oferece continuação segura sem registro quando o Supabase não está configurado. A confirmação da gravação real, RLS e administração exige aplicar as três migrações no Supabase e publicar a aplicação dinâmica na Vercel.
