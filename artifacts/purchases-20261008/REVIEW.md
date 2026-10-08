# Compras/fornecedores V1 — evidência de entrega

08/10/2026. Branch `feat/suppliers-purchases`, base remota `ef9168d`. Escritas exclusivamente em PostgreSQL local isolado; nenhuma operação desta rodada no Neon. Modelagem, regras e implantação: [COMPRAS_V1.md](../../docs/COMPRAS_V1.md).

## Verificações técnicas

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| pnpm lint | PASS | lint.log |
| pnpm typecheck | PASS | typecheck.log |
| pnpm test com TEST_PURCHASE_DATABASE_URL | PASS, 68 testes API + 8 web | test.log |
| pnpm build | PASS, com avisos de bundle/Zod | build.log |
| git diff --check | PASS | diff-check.log |
| Migration completa em base nova | PASS, quatro migrations aplicadas | `gavyo_final_purchases_test`, evidência JSON |
| Upgrade de base local preenchida | PASS, dados anteriores iguais | migration-upgrade.log, migration-before.json, migration-after.json |

O comando padrão executou 70 testes de API: 68 passaram e dois opcionais de PostgreSQL (backup/restauração e importação) foram ignorados porque suas variáveis específicas não foram ativadas. A suíte antiga de concorrência de saídas também ficou ignorada nesta execução. Ela já tem evidência própria de 08/10; não foi contada como validação nova. Os seis testes PostgreSQL de compras desta entrega foram executados, não ignorados. Os oito testes web incluem precisão de subtotal, arredondamento HALF_UP e valores máximos. A suíte de permissões usa controllers/guards/DTOs/cookies HTTP reais com persistência substituída; a suíte de compras PostgreSQL usa persistência real.

Upgrade: cópia local de `gavyo_stock_test`, sem modificar a origem. Antes/depois: User 9, Category 7, Product 15, StockMovement 44; quatro fingerprints idênticos. A migration adiciona cinco tabelas/enum/FKs/índices/CHECKs e não contém DROP. Isso não substitui backup/validação da implantação compartilhada.

## Integridade real via HTTP e PostgreSQL

- Fornecedor: cadastrar, editar contato, normalizar documento, recusar duplicidade, paginar/buscar e negar escrita ao OPERATOR.
- Pedido: subtotal 1.125 × 1.23 = 1.38; criação/envio sem alterar estoque; edição de rascunho e recusa de revisão antiga.
- Entregas 0.625 + 0.5: saldo 1.125, dois movimentos, status recebido, autor da sessão, referência vinculada, custo cadastrado 9.99 preservado e Dashboard com incremento exato. Consulta do Histórico pela referência retorna apenas o movimento esperado.
- Repetir o primeiro recebimento após a conclusão retorna `repeated: true`, sem nova escrita. Mesmo UUID com outras notas é recusado.
- Duas sessões MANAGER reais com mesmo UUID/60: duas respostas aceitas, uma operação nova e uma repetida; saldo 60 e um movimento.
- Duas sessões com UUIDs diferentes/60 cada e pendente 100: uma 201, outra 409; saldo 60. O teste mantém um lock externo e observa duas sessões esperando no PostgreSQL antes de liberá-lo, provando sobreposição real.
- Cancelar esse parcial mantém 60, impede novo recebimento e ainda permite reconhecer a repetição da entrega já existente.
- Dois itens, segundo produto inativo: primeira entrada chega a ser tentada, mas a falha desfaz estoque de ambos, movimentos, cabeçalho/linhas de recebimento e contadores. Pedido permanece enviado.
- Fornecedor inativo, produto repetido, quantidade zero, item de outro pedido, recebimento por OPERATOR e UPDATE SQL acima do solicitado são recusados.
- Mudança da unidade do produto após envio bloqueia recebimento: não se soma mercadoria com uma unidade diferente da snapshot. Envio também exige revisar o rascunho se a unidade mudou.
- ADMIN/MANAGER/OPERATOR nas 12 rotas novas, usuário sem sessão/inativo, precisão inválida e tentativa de fornecer autor pelo body: bloqueios antes do serviço quando aplicável. Autor nunca é aceito do cliente.

## QA no navegador

Aplicação local em 5175, API 3011; fase final no preview do build. Contas/produtos fictícios preparados pelo script protegido `apps/api/scripts/purchases-qa-fixtures.ts`. CUA controlou interface real, sem chamadas de API ou alteração de estado dentro do browser.

1. Login ADMIN, persistência após reload, logout, senha errada com e-mail preservado e login OPERATOR.
2. Fornecedor “Tecidos Horizonte QA”: documento inválido com erro/foco, valores mantidos, confirmação de descarte/continuar preenchendo, duplo clique em salvar sem duplicidade, drawer por Enter, editar/inativar, filtro inativos, estado vazio dos ativos, reativar e pedido relacionado. Escape fecha drawer e devolve foco à linha.
3. Dashboard → filtro atenção → checkbox de Tecido azul QA → preparar pedido. Checkbox não abre drawer. Quantidade e custo começam vazios. Pedido PC-000009 de 100 m × R$ 2,50, salvar com duplo clique, reload e envio com confirmação: estoque segue zero.
4. Barcode `7890000000011` + Enter no recebimento foca quantidade. 101 para pendente 100 gera erro inline e bloqueia revisão. Confirmar 60 com duplo clique gera uma entrada, pendente 40 e histórico 0 → 60.
5. Proxy loopback descartou a resposta de uma entrega de 40 **após o backend confirmar o commit**. Tela apresentou erro de rede, manteve os campos e UUID. Reload mostrou pedido recebido/100 e aviso “Conferir tentativa anterior” com o mesmo UUID. Conferir reconheceu a operação; não houve nova entrada. Evidência de banco: dois recebimentos, dois movimentos, saldo 100.
6. Criar pedido de Botões QA por barcode + Enter: item adicionado e foco em quantidade, sem submissão prematura. Quantidade -1 e custo 2,999 geram erros inline. Pedido PC-000025 salvo com 10 × 0,25; editar para 20, enviar, receber 5 e cancelar restante 15. Saldo permanece 5 e registro 0 → 5 fica no histórico.
7. Link do recebimento de Botões no Histórico mostra exatamente um registro. Dashboard mostra os dois produtos ativos com saldo 100/5 e valor a custo R$ 1.048,95, usando custo cadastrado 9.99. Auditoria de fixtures inativas das suítes continua no Histórico, por desenho.
8. OPERATOR consulta e abre pedido por Enter, sem ações de escrita. Acesso direto a `/purchases/new` é recusado sem montar formulário; novo produto continua disponível.
9. Desktop 1440×900, tablet 1024×768, mobile 390×844: resumo, tabelas/detalhes e navegação conferidos. Medições de scrollWidth não excederam o viewport nos pontos verificados; formulário mobile também sem overflow. Loading observado em listagens/drawers; estados vazios e falha de rede testados. Avisos das novas áreas no mobile ficam na parte inferior (topo medido 774, base 828, viewport 844), preservando ações superiores.

## Problemas encontrados e tratados

| Prioridade | Reprodução / problema | Correção |
| --- | --- | --- |
| P1 | Primeiro recebimento real retornava 500: PostgreSQL retorna `void` no advisory lock, que o Prisma não desserializa. | SELECT de escalar a partir do lock; transação/concorrência reais passaram. |
| P1 | Resposta perdida em entrega final + reload podia desmontar o formulário e ocultar a tentativa pendente. | Conferência independente do status aberto; payload/UUID persistidos antes do POST; cenário real validado. |
| P1 | Alterar unidade do produto entre pedido e entrega permitiria interpretar quantidade com outra unidade. | Bloqueio no envio/recebimento e teste sem alteração do saldo. |
| P2 | Link do pedido com `q` abria Histórico sem aplicar parâmetro. | Inicialização dos filtros pela URL e filtro exato por referência do recebimento, incluindo todos os seus produtos. |
| P2 | Enter no campo de adicionar produto podia submeter um pedido já preenchido. | Lookup explícito por código, recusa de ambiguidade, foco no item e Enter em inputs sem submissão automática. |
| P2 | Busca de fornecedor podia remover a opção selecionada da lista e confundir o select. | Opção selecionada preservada pela consulta de detalhe. |
| P2 | Aviso com ação encobria Cancelar no topo do mobile após rolagem. | Posicionamento inferior restrito às novas áreas, mantendo o componente compartilhado. |
| P2 | Linha mobile de cancelado chamava o restante de “Pendente”. | Label “Encerrado sem receber”, em acordo com status/alerta. |
| P2 | Barra sticky herdada encobria parte de Observações no formulário mobile. | Ações em fluxo normal somente nos novos formulários, após total/revisão, sem cobrir campos. |

## Limites e pendências reais

- **Implantação compartilhada pendente:** migration não aplicada ao Neon e feature isolada da V2. Fazer backup/revisão/deploy coordenado antes de uso na base compartilhada.
- Bipador físico, ambiente hospedado, carga prolongada e sincronização contínua entre usuários não foram validados. Duas sessões reais de concorrência foram testadas via HTTP/banco; não se tratou de duas pessoas clicando em notebooks físicos.
- Idempotência identifica operação por UUID, não a entrega física. Aba encerrada/perda de sessionStorage exige consultar histórico antes de criar nova operação. Não há deduplicação automática por nota fiscal.
- Estado/autoria do pedido e recibos/movimentos são auditados; não há diário de todas as versões de cada rascunho. Não há reversão de recebimento por este módulo.
- Avisos existentes de bundle (~1,03 MB JS antes de gzip, ~267 KB gzip), comentários PURE/Zod e depreciação de consultas enfileiradas do driver pg permaneceram sem erro. Separação de rotas por import dinâmico é uma melhoria posterior; não foram atualizadas dependências.
- Durante edição de componente compartilhado, Fast Refresh apresentou “AuthProvider ausente”; reload restaurou a aplicação. A revisão final utilizou preview compilado. Não foi feita uma revisão geral da arquitetura de atualização a quente/autenticação.
- Nenhuma alteração em `.env`, segredo, usuário real, backup compartilhado ou arquivo anterior `docs/EQUIPE_ONBOARDING.md`.

## Imagens

- [Fornecedores desktop](suppliers-desktop.jpg), [mobile](suppliers-mobile.jpg), [drawer mobile](supplier-drawer-mobile.jpg).
- [Pedido desktop](purchase-desktop.jpg), [tablet](purchase-tablet.jpg), [mobile](purchase-mobile.jpg), [formulário mobile](purchase-form-mobile.jpg).
- [Resposta perdida](receipt-response-lost.jpg), [recovery após reload](receipt-recovered-after-reload.jpg), [Histórico exato](history-receipt-desktop.jpg), [Dashboard](dashboard-after-receipts.jpg).
- [OPERATOR consulta](operator-read-only.jpg), [rota negada](operator-route-denied.jpg), [aviso mobile](suppliers-mobile-toast.jpg).
- [Dados fictícios no PostgreSQL](database-evidence.json).
