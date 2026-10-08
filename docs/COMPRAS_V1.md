# Fornecedores e compras V1 — 08/10/2026

Implementação na branch isolada `feat/suppliers-purchases`, baseada na V2 `ef9168d`. Não amplia o sistema para financeiro, fiscal, contratos, CRM ou ERP. QA usa exclusivamente PostgreSQL loopback e dados fictícios. Evidências: [relatório](../artifacts/purchases-20261008/REVIEW.md).

## Operação

1. Em Fornecedores, cadastrar nome/razão social e contatos; nome fantasia, CPF/CNPJ, endereço e observações são opcionais. Documento é normalizado e único quando informado. Valida-se formato, não existência cadastral nem dígito verificador. Aceita CPF e formato de CNPJ numérico/alfanumérico, sem consulta externa. Inativar preserva relacionamentos e impede novos pedidos/envio de rascunhos.
2. Em Compras, escolher fornecedor ativo, adicionar produtos por nome/SKU/barcode, informar quantidade positiva e custo negociado obrigatório (zero permitido), revisar total e salvar rascunho. Código + Enter usa lookup exato, exige escolha em caso de ambiguidade e foca quantidade; não salva o pedido automaticamente. Até 100 produtos por pedido; produto não pode se repetir. Valores são strings decimais exatas.
3. Editar apenas rascunhos. Revisão otimista impede sobrescrever a edição de outra pessoa. Marcar como enviado fixa a operação; essa ação não manda e-mail/mensagem nem altera saldo.
4. Em pedido enviado/parcial, conferir solicitado/recebido/pendente, digitar as quantidades desta entrega, revisar e confirmar. SKU/barcode + Enter localiza o campo; códigos ambíguos exigem seleção explícita. Não há incremento de quantidade por leitura. Bipador físico é opcional e não foi testado.
5. Entradas aparecem no Histórico existente e no Dashboard. Cada recebimento tem link que filtra exatamente seus movimentos, inclusive entregas com vários produtos.
6. Cancelar rascunho/enviado/parcial encerra somente o restante. Entradas e auditoria já existentes permanecem. Pedidos recebidos/cancelados não podem ser reabertos/editados nem receber uma entrega nova.
7. Dashboard → produtos em atenção permite selecionar até 100 itens e preparar um pedido. Produto é pré-selecionado; fornecedor, quantidade e custo exigem revisão explícita. Não há pedido automático nem custo negociado presumido.

## Modelo e estados

| Entidade | Papel |
| --- | --- |
| Supplier | Cadastro ativo/inativo e contatos. Sem DELETE na API. |
| PurchaseOrder | Número sequencial único `PC-xxxxxx`, fornecedor/autor, revisão, status, notas, datas e total. Nome/documento do fornecedor são snapshots. |
| PurchaseOrderItem | FK do produto, snapshots de nome/SKU/unidade, quantidade, recebido, custo unitário e subtotal. Único por pedido/produto. |
| PurchaseReceipt | UUID da operação informado pelo cliente, pedido, autor da sessão, notas, data e hash do conteúdo. |
| PurchaseReceiptItem | Quantidade, item do pedido e vínculo único com StockMovement. |

Estados: `DRAFT → SENT → PARTIALLY_RECEIVED → RECEIVED`; entrega completa pode ir de `SENT` diretamente a `RECEIVED`. `DRAFT`, `SENT` e `PARTIALLY_RECEIVED` podem ir a `CANCELLED`. Revisão aumenta em cada edição, transição e recebimento.

Quantidade usa Decimal(18,3); custo/subtotal/total Decimal(18,2). Cada subtotal é arredondado para centavos HALF_UP; o total soma subtotais. A interface usa BigInt nas mesmas escalas, inclusive para prévia de saldo. Limites de precisão e totais são conferidos antes de gravar. CHECKs impedem quantidade não positiva, recebimento negativo/acima do solicitado e custos/totais negativos. FKs Restrict preservam registros ligados à auditoria.

Unidade do produto deve corresponder à snapshot para enviar/receber. Se mudou, conferir o cadastro; rascunho pode ser revisado e salvo novamente. Pedido já enviado exige corrigir a divergência de cadastro ou cancelar somente o restante e preparar outro pedido nas unidades corretas. Não há conversão automática entre unidades.

## Integração com o estoque e repetição

O recebimento reutiliza `InventoryService.moveInTransaction`: cria ENTRY/PURCHASE, autor da sessão, referência igual ao UUID de recebimento, identificação do pedido/fornecedor na observação e saldos anterior/resultante. Não existe segunda tabela de saldo. O custo negociado fica no pedido; não sobrescreve `Product.costPrice`, não calcula custo médio nem muda preço de venda. O Dashboard continua usando o custo cadastrado do produto.

Uma única transação envolve cabeçalho do recebimento, linhas, movimentos, estoque, contadores recebidos e status. User é bloqueado para leitura e suas permissões atuais são revalidadas. O UUID do recebimento usa advisory transaction lock global, seguido de lock do pedido. Produtos são bloqueados numa ordem estável por UUID. Erro em qualquer item desfaz tudo. O lock do pedido serializa também recebimentos versus cancelamento/edição.

UUID repetido com conteúdo equivalente retorna o recebimento existente; não grava de novo, mesmo se o pedido estiver recebido/cancelado. Ordem dos itens e formatação decimal equivalente não mudam o hash. Mesmo UUID com outro pedido/quantidades/notas gera 409. UUID novo com quantidade acima do pendente é recusado. Duas entregas legitimamente distintas têm UUIDs distintos.

A interface guarda UUID e payload exato em sessionStorage, por usuário e pedido, **antes** do POST. Duplo clique é bloqueado por ref e estado de gravação. Falha de rede/500 mantém a tentativa: “Conferir recebimento” consulta o servidor; “Tentar novamente” reutiliza a operação. Após reload, essa conferência continua disponível até em pedido finalizado. 400/403/409 são recusas definitivas e liberam correção. Não se mostra sucesso antes da confirmação do servidor. Rascunhos não submetidos têm proteção contra saída; não são persistidos automaticamente.

sessionStorage dura a sessão da aba. Ao encerrar a aba/perder armazenamento, consultar os recebimentos/Histórico antes de criar nova tentativa. A idempotência protege o mesmo UUID; não deduz que um UUID novo representa a mesma entrega física. Auditoria desta V1 registra estado final, autoria do pedido/recebimentos e movimentos; não é um diário completo de cada alteração do rascunho.

## Permissões

ADMIN/MANAGER consultam e gerenciam fornecedores, pedidos e recebimentos. OPERATOR consulta estas duas novas áreas; não cadastra/edita/inativa fornecedor, não cria/envia/cancela pedido nem recebe pela API. Sua permissão anterior de cadastrar produto/movimentar estoque é preservada. A matriz única está no shared; não foram reatribuídos usuários reais. Guards usam perfil atual do banco, e mutações revalidam dentro da transação.

## Direção visual

A [referência aprovada de fornecedores](https://dribbble.com/shots/25174577-Supplier-Management-Overview-Dashboard) foi aberta e a imagem inspecionada antes da implementação. A organização horizontal de resumo, tabela dominante, busca/filtros próximos e ação de cadastro no cabeçalho foi adaptada à identidade existente. Contexto relacionado usa o drawer GAVYO. Gráficos de desempenho, lead time e contratos não foram reproduzidos: faltam dados operacionais que os sustentem. Tipografia, grafite/cobalto, radius, divisores e feedback são do projeto. No mobile, linhas viram blocos com labels; formulários e resumo ficam em uma coluna.

## Migration e implantação

Arquivo: `apps/api/prisma/migrations/20261008000000_suppliers_purchases/migration.sql`. Adiciona enum, cinco tabelas, índices, FKs e CHECKs; não apaga/altera dados operacionais existentes. As quatro migrations foram aplicadas numa base local nova e a integridade foi testada.

**Não foi aplicada no Neon compartilhado.** Antes da implantação: revisar SQL, produzir backup privado com ferramentas compatíveis, conferir o dump, registrar fingerprints/contagens das tabelas operacionais existentes, aplicar `pnpm --filter @stock/api db:deploy`, verificar migrations e fingerprints/contagens. Não usar reset/seed nem fixtures no Neon. Publicar API e frontend coordenadamente após a migration. O schema/client gerado sozinho não confirma implantação. Nenhum `.env`, segredo ou dump é versionado.

## Reproduzir QA

Node 22 e dependências congeladas. Aplicar migrations em uma base local separada terminada em `_purchases_test`; definir `TEST_PURCHASE_DATABASE_URL` explicitamente. A suíte se recusa a usar host externo ou URL igual à DATABASE_URL da aplicação.

```powershell
$env:TEST_PURCHASE_DATABASE_URL='postgresql://SEU_USUARIO@127.0.0.1:55432/gavyo_purchases_test'
pnpm test
```

A suíte retém a auditoria e inativa somente suas próprias fixtures. `apps/api/scripts/purchases-qa-fixtures.ts` prepara contas/produtos fictícios para navegador e possui a mesma proteção loopback. Não é seed de produção. Configure também DATABASE_URL/DIRECT_URL/BACKUP_DATABASE_URL do processo QA para essa base e desative backups automáticos; não alterar `.env` compartilhado.

Para falha de resposta, o proxy de QA em `artifacts/purchases-20261008/response-loss-proxy.mjs` encaminha loopback 3012 → 3011 e descarta uma resposta de recebimento bem-sucedido depois do commit. Vite/preview em 5175 com WEB_ORIGIN correspondente. Nenhum monkey patch de browser ou estado da aplicação foi usado.
