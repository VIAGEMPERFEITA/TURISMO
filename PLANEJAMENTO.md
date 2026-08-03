# Planejamento — Viagem Perfeita Turismo

## Posicionamento e proposta

Marca de turismo religioso premium que combina curadoria internacional, acolhimento humano e excelência operacional. A promessa central é: “Mais que uma viagem. Um encontro com a sua fé.”

## Síntese das referências

- Israel com Aline: proximidade pessoal, divisão clara entre modalidades de viagem e contato acessível.
- Terra Santa Viagens: catálogo denso, filtros por destino/período, consistência na apresentação das caravanas e forte percepção de operação consolidada.
- Viagem Perfeita no Instagram: comunidade de mais de 10 mil seguidores, amplitude internacional, conteúdo de equipe, depoimentos e experiências culturais e espirituais.
- Direção própria: linguagem editorial, menos ruído, fotografia imersiva, hierarquia forte, microprovas de confiança e CTAs contextuais.

## Jornada de conversão

1. Impacto emocional no hero.
2. Prova imediata de segurança, curadoria e acompanhamento.
3. Exploração visual das próximas caravanas.
4. Redução de risco com método, depoimentos e FAQ.
5. Captação simplificada e contato por WhatsApp.

## Arquitetura de informação

- Home: hero, confiança, história, caravanas, diferenciais, destinos, depoimentos, FAQ, formulário.
- Caravanas: filtros por destino, data e status.
- Caravana individual: capa, resumo, datas, aéreo, hotéis, inclusões, roteiro diário, galeria, FAQ, depoimentos e reserva.
- Destinos: Israel, Egito, Jordânia, Turquia, Grécia, Europa e Emirados.
- Institucional, Galeria, Depoimentos, Blog, FAQ e Contato.
- Admin protegido: visão geral, viagens, mídia, roteiros, reservas e CRM.

## Modelo de dados

- `trips`: título, slug, resumo, destino, datas, duração, status, vagas, preço, aéreo, hotéis, capa e SEO.
- `itinerary_days`: viagem, dia, título, descrição e refeições.
- `media`: viagem, tipo, URL, legenda e ordem.
- `leads`: nome, telefone, WhatsApp, e-mail, viagem, origem, status, observações e atendente.
- `testimonials`, `posts`, `faqs`, `destinations` e `team_members`.

## Integrações e operação

- Supabase: banco, autenticação administrativa e Storage em produção.
- Formulários: React Hook Form + Zod e captura de UTM/origem.
- Automações: eventos preparados para WhatsApp, e-mail, newsletter, Google Analytics e Meta Pixel.
- SEO: metadados por rota, schema TravelAgency/TouristTrip, Open Graph, sitemap, robots e breadcrumbs.

## Performance e acessibilidade

- Conteúdo server-first, imagens responsivas, carregamento tardio abaixo da dobra, fontes enxutas e animações respeitando `prefers-reduced-motion`.
- Contraste AA, foco visível, semântica correta, alvos de toque adequados e navegação por teclado.
