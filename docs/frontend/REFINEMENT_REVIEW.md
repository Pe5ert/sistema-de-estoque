# Refinamento frontend — 01/10/2026

## Diagnóstico

A base já possuía painel assimétrico, estoque visual e cor funcional. O catálogo não tinha identificação por imagem nem filtros; o scanner era um campo desativado; o histórico omitia motivo e não tinha cabeçalhos de auditoria. Havia numeradores e títulos repetidos, status em caixas e cores fora dos tokens. A tipografia e a metadata precisavam de consistência.

## Direção

Mantida a direção escura, com azul mais vivo como identidade e laranja em atenção. A referência azul/laranja de Maruf orientou hierarquia e pesos distintos. IronNest orientou organização da sidebar; a tabela verde orientou a célula thumbnail + nome/SKU. Sem gráficos, KPIs ou registros novos.

## Dashboard

Preservados saldo dominante, alertas, reposição e atividade. Thumbnails ajudam a identificar a fila de reposição. Links de atenção abrem o catálogo já filtrado. O laranja permanece em quantidade, borda e ação do alerta; o azul é o protagonista.

## Produtos

Busca local por nome/SKU, filtros de categoria e situação, contagem e recuperação do estado vazio. Tabela central com thumbnail, nome/SKU/categoria, saldo, barra, mínimo, preço opcional e status. Totais no cabeçalho substituem a faixa que repetia o título. Detalhe de leitura em dialog nativo, sem cadastro/edição.

## Imagens

`ProductThumbnail` aceita `imageUrl?: string | null`, tamanho fixo e `object-fit: contain`. Ausência ou erro da imagem mostra placeholder acessível. Quatro SVGs próprios ilustram os produtos de exemplo; os outros itens demonstram imagem ausente. Sem base64, galeria, storage ou alteração de banco.

## Movimentações

Posto de consulta por SKU com estados aguardando, encontrado e não encontrado. Produto identificado com thumbnail, SKU/categoria, saldo e status. Quantidade com controles −/+, entrada/saída por radio, motivo e prévia de saldo. Feedback mostra antes/depois ou saldo insuficiente. É uma simulação local explícita: não grava movimentos nem altera o catálogo/histórico. Código de barras não está integrado.

## Histórico

Tabela de auditoria com produto/ID/SKU, data/hora, quantidade/tipo, saldo antes/depois, motivo e responsável. Trilhos de cor e labels preservam a rastreabilidade. Filtro local por movimento; sete registros existentes preservados.

## Sidebar/Header

Dois grupos de trabalho: Painel e Operação. Histórico fica junto de Produtos e Movimentações. Marca e item ativo usam azul. Header comunica contexto e demonstração, sem ações fictícias. Menu mobile com Escape, foco contido e retorno ao botão; link de salto para o conteúdo.

## Design system

Tokens em `styles.css`, incluindo superfícies elevadas, contexto/scanner, hover e cores dos campos. Tipografia sans-serif, números tabulares, metadata legível e status com marca + texto. Radius de 4px em superfícies/controles; divisores nas tabelas; sombra somente no detalhe sobreposto. Regras consolidadas no arquivo existente, sem UI kit paralelo.

## Removido

Numerador por página, grupo isolado de rastreio, banner repetido do catálogo, caixas de status e CSS dos elementos substituídos. A decoração de barras, mapas e gráficos fictícios não foi adicionada.

## Reutilizado

Shell, navegação/rotas, dashboard, tabelas, dados locais, Status e StockMeter. React Router, QueryClient, Tailwind e Lucide preservados. RHF + Zod usados na prévia do posto de operação.

## Criado

ProductThumbnail, ProductIdentity e MovementAmount reutilizados entre superfícies; Products e MovementWorkbench extraídos do App para concentrar seus estados. Contrato de apresentação opcional para imagem/preço. Nenhuma mudança em `apps/api` ou `packages/shared`.

## Responsividade

Desktop revisado em 1440×900; mobile em 390×844, com capturas completas das quatro rotas. Tabelas reorganizam linhas com labels no mobile. Produto precede metadata em Movimentações; preço ausente é omitido no catálogo mobile. Reposição precede atividade no dashboard mobile. Sem overflow horizontal nas oito combinações rota/largura.

## Validação técnica

- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS.
- `pnpm build`: PASS.
- Testes frontend existentes: não há suíte existente afetada. Verificação de navegador com Playwright: PASS, 27 checagens, sem exceções. Busca, filtros, recuperação do vazio, imagem quebrada, dialog/Escape, consulta por teclado, motivo, prévia de saldo, saída insuficiente, invalidação da seleção, filtro de histórico e menu móvel.
- `git diff --check`: PASS.
- Ambiente atual: Node 24.19.0; o manifesto recomenda Node 22.13+. Os comandos passam, mas emitem aviso de versão. Build também emite aviso de anotação de comentário da dependência Zod; sem falha de compilação. Dependências não foram alteradas.

## Git

Branch: `sistema-de-estoque-v2`. Alterações desta rodada estão locais, sem novo commit/push. Diff restrito a frontend, documentação e artefatos de revisão. Arquivos existentes alterados: App, demo-data, styles, DESIGN e PROJECT_STATUS. Novos: três módulos frontend, quatro SVGs, este relatório e o pacote visual. `git diff --stat` não inclui arquivos novos ainda não rastreados.

```text
git diff --stat
 apps/web/src/App.tsx      | 150
 apps/web/src/demo-data.ts |  21
 apps/web/src/styles.css   | 415
 docs/PROJECT_STATUS.md    |   5
 docs/frontend/DESIGN.md   |  14
 5 files changed, 358 insertions(+), 247 deletions(-)

git status --short
 M apps/web/src/App.tsx
 M apps/web/src/demo-data.ts
 M apps/web/src/styles.css
 M docs/PROJECT_STATUS.md
 M docs/frontend/DESIGN.md
?? apps/web/public/
?? apps/web/src/MovementWorkbench.tsx
?? apps/web/src/Products.tsx
?? apps/web/src/inventory-ui.tsx
?? artifacts/
?? docs/frontend/REFINEMENT_REVIEW.md
```

## Pendências

Cadastro/edição, armazenamento de imagens, dados reais/API, leitura integrada de código de barras e gravação/atualização do estoque continuam em fases futuras. Login é responsabilidade do outro desenvolvedor. O refinamento visual desta rodada está completo; não houve avanço ao backend.

## Pacote visual

`artifacts/frontend-refinement-20261001/7-prints.zip` contém exatamente sete imagens: três referências na ordem Maruf → Beadaptify → Axel e quatro capturas desktop da aplicação após esta rodada. A galeria `index.html` exibe a mesma sequência. Capturas mobile e resultados das verificações ficam em `qa/`, fora do ZIP de sete prints.
