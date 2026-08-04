# Relatório de testes reais — Viagem Perfeita Turismo

Data: 03/08/2026

## Escopo executado

- Navegador real controlado com Playwright.
- 45 URLs públicas testadas em 9 resoluções: 1440×900, 1366×768, 1024×768, 768×1024, iPhone 13 (390×844), iPhone SE (375×667), Pixel 7 (412×915), 390×844 e 320×568.
- Total da varredura inicial: 405 combinações de página e viewport.
- Total da nova varredura direcionada após correções: 36 combinações nas páginas que apresentaram falha; nenhuma falha restante.
- 22 testes automatizados do projeto aprovados.
- Build estático do GitHub Pages aprovado, com 84 páginas geradas.

## Páginas verificadas

Home; catálogo de caravanas; oito páginas individuais de caravanas; catálogo de destinos; Israel; Egito; Jordânia; Turquia; Grécia; Itália; Europa; Quem Somos; Histórias; Viagens Personalizadas; Líderes; Caravanas Realizadas; Depoimentos; Blog; quatro artigos; dez categorias; Contato; Documentação; FAQ; Política de Privacidade; Termos; Cookies e página 404.

## Interações reais

- Menu desktop e menu mobile.
- Submenus Caravanas e Destinos, incluindo todas as opções visíveis.
- Todos os 60 controles de FAQ disponíveis nas páginas auditadas.
- Busca do catálogo: “Israel” retornou 5 registros.
- Filtro combinado “Israel + 2026” retornou 1 registro.
- Cards e URLs internas de todas as caravanas, destinos e artigos.
- Seta de retorno: apareceu após 1.500 px e retornou suavemente para o topo (scrollY 0).
- Formulário em 390×844: abertura, rolagem interna, campos, validação, revisão e tentativa de persistência.

## Formulário, CRM, e-mail e WhatsApp

- Validações confirmadas: nome obrigatório, WhatsApp válido, consentimento obrigatório e formato de e-mail.
- O formulário permaneceu integralmente dentro do viewport mobile (15 px de margem superior/inferior) e sem rolagem horizontal.
- A tela de revisão preservou nome, telefone, e-mail, cidade, viajantes e interesse.
- Resultado real em produção: “O registro online ainda não está configurado”.
- Consequência: não foi possível comprovar em produção persistência, deduplicação, criação de interesse/histórico/atividade ou envio de e-mail.
- O fallback para WhatsApp foi exibido corretamente e manteve os dados preenchidos.
- O link oficial continua centralizado em `wa.me/5531999547699`, com mensagem codificada pelo componente compartilhado.

## Problemas encontrados e corrigidos

- Cartão “Precisa de ajuda?” excessivamente grande: reduzido para 330 px no desktop e 296 px no viewport de 320 px, com ícone e tipografia proporcionais.
- Rolagem lateral de 6–16 px na Home em tablet/celular: corrigida.
- Rolagem lateral ocasional de 40 px na Política de Privacidade em 320 px: corrigida.
- Grade de destinos permanecia horizontal no celular: convertida para uma coluna.
- Hero card ultrapassava o viewport: largura e margens corrigidas.
- Seta de retorno não aparecia na Home: movida para o layout global.
- Duas imagens de Quem Somos ignoravam o base path `/TURISMO`: corrigidas.
- Imagem remota de Israel pesada/instável: reduzida e parametrizada.
- Logo de 160 KB: substituída por variante transparente otimizada de 46 KB, com dimensões declaradas.
- Logos institucionais sem largura/altura: dimensões declaradas.
- Imagens dos cards e destinos carregavam todas imediatamente: convertidas para imagens com lazy loading.
- Animação JavaScript da primeira dobra: removida para reduzir bloqueio e JavaScript não utilizado.
- Contrastes insuficientes em textos auxiliares, metadados e selos: corrigidos.
- Ordem de heading do card principal: H3 alterado para H2.
- ARIA inválido no YouTube e nomes acessíveis divergentes em cards, vídeo e WhatsApp: corrigidos.
- Menu e ícones sociais: alinhamento e navegação preservados.

## SEO

- Todas as 45 páginas auditadas têm title, description, canonical, Open Graph e exatamente um H1.
- Breadcrumbs presentes nas páginas internas.
- Sitemap e robots válidos.
- Imagens informativas possuem alt; imagens decorativas permanecem ocultas da árvore acessível.
- Página 404 personalizada testada com três caminhos de saída.

## Lighthouse final — Home

| Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | TBT |
|---|---:|---:|---:|---:|---:|---:|
| Desktop | 97 | 96 | 96 | 100 | 1,3 s | 0 ms |
| Mobile simulado | 76 | 96 | 96 | 100 | 7,2 s | 0 ms |

Comparação mobile inicial → final:

- Performance: 66 → 76.
- Acessibilidade: 91 → 96.
- Peso transferido: 4.038 KiB → 1.759 KiB.
- LCP: 12,9 s → 7,2 s.

O desempenho mobile ainda não atingiu a meta de 90 na simulação severamente limitada do Lighthouse. Não foi ocultado no relatório. A próxima etapa exige substituir/auto-hospedar todas as imagens remotas restantes e reduzir a hidratação dos componentes globais.

## Capturas

- 30 capturas da versão publicada antes das correções em `auditoria-browser/antes`.
- 30 capturas da versão local corrigida em `auditoria-browser/depois`.
- Perfis: desktop, tablet e celular.
- Telas: Home, Caravanas, Caravana Individual, Destinos, Contato, FAQ, Blog, Menu Mobile, Formulário e Rodapé.

## Pendências externas

1. Configurar as variáveis públicas do Supabase no workflow do GitHub Pages.
2. Publicar e validar a função `send-crm-notification` no Supabase.
3. Confirmar as credenciais do provedor de e-mail e executar um teste de entrega real.
4. Repetir o teste de lead duplicado somente depois que o banco estiver conectado em produção.
5. Para atingir Performance 90+ no mobile: eliminar imagens remotas restantes e reduzir JavaScript/hidratação global.
