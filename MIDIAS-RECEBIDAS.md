# Mídias recebidas — Viagem Perfeita

## Logo oficial integrada

- `IMG_0211.jpg`: versão colorida para fundo claro.
- `IMG_5290.jpg`: versão branca para fundo escuro.
- `IMG_5290 2.jpg`: duplicata exata de `IMG_5290.jpg`, não adicionada novamente.

As versões oficiais foram adicionadas em `public/brand/` e são usadas pelo componente reutilizável de marca.

## Vídeos de Israel recebidos

Os vídeos foram identificados como conteúdo real fornecido pela Viagem Perfeita, mas ainda não foram publicados nem vinculados a uma caravana pública.

- `4757c3413e504dfdb28293b412e38869.MP4` — aproximadamente 70 MB.
- `4757c3413e504dfdb28293b412e38869 2.MP4` — duplicata exata do arquivo anterior.
- `Criativo Israel VP.MP4` — aproximadamente 107 MB.
- `Criativo Israel VP 2.MP4` — duplicata exata do arquivo anterior.
- `ae217037cf234eda81ddd01f8d5d13fe.MOV` — aproximadamente 2,1 MB.
- `151ab68198e2466382949cbec6b6c86f.MP4` — aproximadamente 18 MB.
- `aa53df94648c40ce89aaa10980e05a6d.MP4` — aproximadamente 99 MB.
- `9adc2d72f523499fb2212d1d70b7cc39.MP4` — aproximadamente 194 MB.
- `46c8ecc282ec4ca492e2e506fc39528c.MP4` — aproximadamente 74 MB.
- `c3561427-6ccd-42b2-8947-cd90970c71cc.MP4` — aproximadamente 19 MB.

## Decisão técnica

Os vídeos não devem ser versionados diretamente no GitHub porque alguns ultrapassam o limite recomendado e prejudicariam o carregamento. Na etapa de mídia/persistência, devem ser enviados para Supabase Storage, Cloudflare R2 ou serviço de vídeo, com versões otimizadas para web, poster, carregamento sob demanda e associação administrativa à caravana correta.

## Informação pendente

Antes da publicação, confirmar quais vídeos pertencem a cada caravana e se todos possuem autorização de uso de imagem e áudio.
