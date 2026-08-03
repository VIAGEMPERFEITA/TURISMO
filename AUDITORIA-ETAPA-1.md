# Auditoria e implementação — Etapa 1

## Preservado

- Identidade visual, paleta, tipografia, animações e estrutura geral da home.
- Fluxo de atendimento com formulário intermediário e WhatsApp oficial.
- Configuração central do contato e rastreamento já existentes.
- Rotas do catálogo, páginas individuais, painel e publicação no GitHub Pages.
- Componentes de FAQ, atendimento e botão flutuante.

## Corrigido

- Dados de caravanas foram centralizados em uma única fonte tipada.
- Status interno e status público agora são campos independentes.
- Somente viagens com `published: true` e status interno `pronto_para_publicar` entram no site público.
- Rascunhos e demonstrações deixaram de aparecer na home e no catálogo.
- Rotas de viagens não publicadas entregam página indisponível, sem conteúdo comercial.
- Textos públicos com “demonstração”, números não confirmados e depoimentos fictícios foram removidos.
- Rota antiga `caminhos-da-fe` passou a retornar ao catálogo, sem apontar para uma viagem não publicada.
- Caminhos internos continuam compatíveis com o subdiretório `/TURISMO`.

## Criado

- Modelo completo e escalável para caravanas, incluindo datas, países, cidades, vagas, preços, roteiro estruturado, serviços, documentação, FAQ e SEO.
- Catálogo com busca, filtros, ordenação, contador de resultados e estado vazio.
- Organização automática por ano e mês, ocultando grupos vazios.
- Painel de filtros recolhível no celular.
- Card reutilizável com informações comerciais e duas chamadas de ação.
- Estrutura enriquecida da página individual e caixa lateral de conversão.
- Barra inferior de conversão para celular.

## Removido da exibição pública

- Seis registros não confirmados, mantidos apenas como dados internos.
- Estatísticas sem fonte confirmada.
- Depoimentos e nomes fictícios.
- Avisos públicos de conteúdo demonstrativo.

## Pendente por falta de informações reais

- Publicação de caravanas: datas, serviços, disponibilidade e condições precisam ser confirmados.
- Logo oficial: ainda não foi localizada nos arquivos do projeto.
- História, equipe, CNPJ, Cadastur, endereço, e-mail e demais dados institucionais.
- Depoimentos autorizados e registros de caravanas realizadas.
- Conteúdo real das páginas institucionais, destinos e blog.
- Supabase e persistência de leads, previstos para a Etapa 2.
- Administração completa de caravanas e CRM, previstos para a Etapa 3.

## Links e páginas identificados para etapas seguintes

- Rodapé ainda possui links provisórios para Documentação, FAQ e Blog.
- Menu principal ainda utiliza algumas âncoras da home.
- O painel atual contém dados de interface e será substituído por dados persistidos na Etapa 3.
- Política de privacidade, termos e cookies ainda não possuem páginas próprias.
