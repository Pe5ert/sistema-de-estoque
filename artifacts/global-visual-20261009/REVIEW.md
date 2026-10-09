# GAVYO Estoque — aplicação global de 2 px

09/10/2026. Branch `sistema-de-estoque-v2`, base integrada `274d1aa`. Direção aprovada de Compras/Novo Pedido aplicada ao produto existente. Nenhuma biblioteca, rota, regra de permissão, endpoint, modelo ou migration foi adicionada nesta rodada. A branch de upload de imagens continua separada.

## Resultado e evidências

Abra `index.html` para comparar antes/depois e protótipo/implementação. Antes: 13 capturas desktop, incluindo Login. Depois: Dashboard, Produtos, cadastro, Movimentações, Histórico, Importação, Fornecedores, cadastro de fornecedor, Compras, Novo Pedido, Inventário físico, Backups e Login em 1440×900, 1024×768 e 390×844. Capturas adicionais mostram pedido preenchido, drawers, categorias, duplicidade, saldo insuficiente, importação concluída, inventário, vazio, erro de consulta e acesso negado.

`measurements.json` registra a primeira inspeção de largura nas 12 rotas autenticadas: nenhuma rolagem horizontal de página nos três tamanhos. Formulário de pedido preenchido e inventário concluído também foram medidos sem overflow. Drawers mobile foram conferidos com retângulo de 390×844, posição 0/0. Capturas finais de modais usam viewport para evitar deslocamentos de elementos fixos na captura de página inteira.

Os prints usam dados fictícios de uma base PostgreSQL local. Quantidades e contagens mudam entre antes/depois como consequência dos testes; não representam novos indicadores ou mudanças nas regras do sistema. Os protótipos usam números demonstrativos. Não copiamos essas métricas para a API real.

## Telas e componentes

Todas as superfícies acima recebem os tokens compartilhados: grafite, tipografia Segoe UI/Arial, hierarquia, espaçamento, marca GAVYO, geometria 2 px, tabelas, campos, botões e feedback. Dashboard mantém composição assimétrica; cadastro de produto mantém identificação/comercial/controle; telas de auditoria e operação mantêm suas composições. Navegação e grupos permanecem iguais.

Compras separa Pedido e Fornecedor na tabela, alinha valores e distingue status com texto/cor. Novo Pedido apresenta documento + resumo lateral no desktop, resumo abaixo dos itens em telas menores e labels curtos com nomes acessíveis completos. A operação continua salvar rascunho → detalhe → enviar → receber com confirmações. Fornecedores usa totais reais em faixa com divisores, sem bloco adicional dominante.

Componentes reutilizados: Field/FieldError, DataState/Pagination, DetailDrawer, ConfirmDialog/Alert/FeedbackProvider e UnsavedForm. Seus comportamentos não foram reescritos. Alterações de produção: `apps/web/src/styles.css`, `App.tsx`, `PurchaseForm.tsx`, `Purchases.tsx`, `auth/LoginPage.tsx`, `auth/ProtectedRoute.tsx` e `apps/web/index.html`. Direção documentada em `docs/frontend/DESIGN.md` e `DECISAO_VISUAL_20261009.md`.

## QA interativo realizado

| Fluxo | Evidência / resultado |
| --- | --- |
| Login e sessão | senha errada gera erro genérico; login ADMIN/MANAGER/OPERATOR funciona; reload restaura sessão; logout retorna ao Login |
| Navegação / responsividade | 12 rotas autenticadas + Login, três tamanhos; menu mobile; tabelas reorganizadas; nenhum overflow de página encontrado |
| Produtos | cadastro e edição persistidos; SKU duplicado e barcode duplicado exibem erro inline e foco correto, sem apagar campos; Enter no barcode segue para Nome |
| Drawers / teclado | Enter na linha abre Produto/Fornecedor; Escape fecha e retorna foco à linha; Categorias abre no drawer compartilhado |
| Fornecedores | criação, reload, edição de contato; consulta de detalhe/pedidos relacionados; busca sem resultado apresenta vazio |
| Pedidos | fornecedor ativo, leitura SKU com Enter, quantidade negativa bloqueada, decimal 2,5 × R$ 5 = R$ 12,50; clique duplo salva um pedido; reload preserva rascunho |
| Proteção de rascunho | Cancelar abre confirmação; continuar preserva quantidade/custo; descarte volta à lista |
| Recebimentos | envio não altera saldo; 3 acima de 2,5 pendentes bloqueia revisão; entrega de 1 muda 100 → 101 e status parcial; histórico exibe a entrada |
| Movimentações | entrada de 5 por clique duplo registra uma entrada; saída de 6 com saldo 5 é desabilitada e apresenta insuficiência; saída de 2 registra 5 → 3 |
| Histórico / Dashboard | Histórico filtrado mostra 0 → 5 e 5 → 3, motivo/responsável; Dashboard reflete entradas, saída e importação; custos desconhecidos permanecem excluídos |
| Importação | CSV fictício enviado/conferido/confirmado; um produto + entrada inicial 2; resultado persiste após reload |
| Inventário físico | início com 4 itens, contagem salva/recarregada, confirmação e conclusão sem ajustes; tela concluída sem overflow mobile |
| Filtros / paginação | Compras página 2/2; filtro Enviado remove page e volta à primeira; busca de fornecedor e filtros de histórico |
| Permissões | OPERATOR vê Novo Produto e não vê Importação/Categorias/Backups; acesso direto a Novo Pedido é negado; MANAGER vê cadastro/importação e não Backups; ADMIN vê Backups |
| Loading / erro / feedback | carregamento observado durante login/consultas/lookup; salvamento desabilita campos/ação; pedido inexistente mostra erro + Tentar novamente; sucessos, erros e confirmação compartilhados preservados |

Consulta independente ao PostgreSQL confirmou: `VISUAL-QA-20261009` com saldo 3 e exatamente duas movimentações (uma entrada, uma saída); `VISUAL-IMPORT-QA-20261009` com saldo 2 e uma entrada; PC-000026 com total 12,50, status parcial e exatamente um recebimento.

## Verificações automatizadas

- `pnpm lint`: passou (lint.log).
- `pnpm typecheck`: passou (typecheck.log).
- `pnpm build`: passou (build.log).
- `pnpm test`: passou na execução padrão.
- `pnpm test` com integração PostgreSQL opt-in: 109 testes da API + 16 do frontend passaram; 0 falhas; 1 teste de backup/restauração ficou sem execução (integration-tests-final.log).
- `git diff --check`: passou.

Integrações de estoque, importação, compras/concorrência e inventário físico executadas em bases dedicadas de loopback. Nenhum teste, seed/reset ou migration no Neon compartilhado. Não foram alterados `.env` ou credenciais.

## Problemas encontrados e tratamento

1. **Contraste (corrigido):** azul aprovado #5275ff com branco tem 3,93:1, insuficiente para labels pequenos. Ações usam #4262e8 (5,07:1), hover #4b6bef (4,52:1); azul de identidade permanece nos acentos. Foco, disabled e reduced-motion existentes mantidos.
2. **Geometria/marca inconsistentes (corrigido):** radius explícito de 3/4 px nos controles/feedback e marca antiga nos estados de sessão. Agora compartilham 2 px e GAVYO.
3. **Base antiga de testes (ambiente):** primeira execução PostgreSQL falhou no CHECK de saldo de PurchaseOrderItem; a base antiga `gavyo_purchases_test` não tinha a constraint, embora sua migration estivesse registrada. Uma base nova, migrada do zero, passou. O banco de QA interativo também possui a constraint. Não se alterou migration aplicada nem se tentou reparar banco compartilhado. O log inicial foi preservado.
4. **P3 — pacote JavaScript grande (pendente):** build gera cerca de 1,09 MB (276 KB gzip) e avisa acima de 500 KB. Reproduzir com `pnpm build`. Recomendação: medir carregamento e separar rotas/dependências com importação dinâmica em uma rodada de performance. Não modificar arquitetura apenas para esta troca visual.

Não apareceu regressão bloqueante nos fluxos executados. Isso não equivale a provar ausência de todos os bugs.

## Limites e pendências

- Backups teve revisão visual, estados vazios e acesso ADMIN. Não foi gerado/restaurado um backup no navegador; a integração de restauração ficou sem execução nesta rodada.
- QA foi na API/DB local com dados fictícios, sem validação destrutiva ou publicação no banco compartilhado.
- Leitor físico não foi testado; SKU/barcode foi simulado como teclado + Enter.
- Não foi feito teste exaustivo com leitor de tela, todos os navegadores, milhares de registros, latência real de produção ou todos os estados intermediários de rede.
- Upload de arquivo de imagem continua fora desta rodada, na branch WIP já existente.
- A galeria compara antes/depois em desktop; tablet/mobile documentam o resultado final.

## Commits incrementais

- `cb09fb3`: identidade, tokens, geometria compartilhada e documentação da decisão.
- `0893760`: integração visual de Compras/Novo Pedido, mantendo lógica operacional.
- `b0796d2`: refinamento de totais, contraste e marca nos estados de sessão.
- Commit final: evidências, comparação e relatório desta rodada.
