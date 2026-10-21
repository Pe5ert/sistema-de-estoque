# GAVYO — revisão de erros, 20/10/2026

Revisão do commit 5e1469c. Navegador no servidor normal localhost:5173; gravações exclusivamente na API local 3012, banco fictício gavyo_images_stock_test. Nenhum dado de estoque do Neon foi alterado. Não foram implementadas correções nesta revisão.

## P1 — Alterar unidade reinterpreta saldo e histórico (reproduzido pela API isolada)

1. Cadastrar produto em KG, com entrada inicial de 10.
2. Editar somente a unidade para BOX.
3. Consultar produto e suas movimentações.

Resultado: saldo continua 10, agora BOX; a entrada inicial também retorna product.unit=BOX. Não há conversão nem nova movimentação: total continua 1. Produto fictício da evidência: a12674d7-f980-4f92-9080-fc6220ccd759. Isso permite reinterpretar quantidades e compromete a leitura da auditoria.

Recomendação: bloquear troca de unidade após primeira movimentação, ou implementar conversão explícita e auditada. Preservar a unidade histórica na movimentação.

Código: apps/api/src/inventory/inventory.service.ts:122–136; ProductPatch permite unit em inventory.dto.ts:43.

## P2 — Filtro de produto fica invisível no Histórico (reproduzido no navegador)

1. Produtos → detalhes de Caixa organizadora M → Consultar histórico completo.
2. Na página de Histórico, buscar QA-20261002-01.
3. A interface mostra zero registros. O productId da caixa continua na URL, mas não aparece como filtro identificado na tela.
4. Na página de Histórico geral, fazer a mesma busca: aparecem 4 registros.

Recomendação: mostrar chip com nome do produto e ação para remover esse filtro individualmente. Ao pesquisar outro produto, esclarecer que a busca está restrita ou permitir trocar o produto filtrado.

Código: apps/web/src/History.tsx:31–51. Evidências: historico-filtro-oculto.jpg e historico-busca-geral.jpg.

## P2 — Risco de rascunho duplicado após perda de resposta (revisão de código)

PurchaseForm.tsx:75–82 envia criação sem identificador de tentativa. Se a gravação terminar e a resposta se perder, o formulário oferece tentar novamente. purchases.service.ts:90–103 cria novo pedido em cada POST, sem deduplicar a tentativa. A proteção saving.current evita clique simultâneo, mas não resolve repetição após resposta perdida.

Recomendação: chave de idempotência persistida no formulário e restrição única no servidor, retornando o pedido original ao repetir a mesma tentativa. Ainda falta reproduzir a perda de resposta ponta a ponta; não houve duplicação observada no servidor real. Rascunho não movimenta estoque.

## P3 — Listagem de compras busca detalhes completos (risco de desempenho)

purchases.service.ts:11,53–60 usa o mesmo include da tela de detalhes: todos os itens, produtos/categorias, recebimentos e movimentos para cada pedido da página. O volume cresce com itens e recebimentos.

Recomendação: projeção resumida para a listagem e detalhes sob demanda. Medir tamanho da resposta e tempo com volume representativo. Esta revisão não comprova que esse seja o motivo da lentidão percebida.

## Validação e limites

- Testes automatizados: 82 da API e 29 do frontend aprovados; 3 suites de integração PostgreSQL ignoradas pela configuração padrão. Não equivalem a cobertura completa de QA.
- Testes adicionais HTTP no banco isolado: senha errada → 401; SKU duplicado → 409; saída 11 com saldo 10 → 409.
- Histórico geral e histórico filtrado comparados no navegador; nenhum erro de console capturado nessa sessão.
- A mudança de unidade foi reproduzida por HTTP, não pelo formulário.
- Não concluídos nesta rodada: regressão completa de todas as páginas, todos os perfis, mobile, upload, barcode duplicado, concorrência e double submit, recuperação de resposta perdida e falhas de rede em todas as operações.
- Arquivos de aplicação não alterados. Prioridade sugerida: unidade; filtro oculto; idempotência de pedidos; payload da listagem.
