# Clientes nas vendas — 23/10/2026

Escopo aprovado: clientes, venda com identificação opcional explícita e histórico, a partir da auditoria/protótipo operacional. Mantidos formulário B/foto sticky e os trabalhos anteriores da checkout. Sem nova dependência. Contratos em `docs/CLIENTES_V1.md`.

## Entrega

Clientes com nome obrigatório/código automático, busca paginada, ativos/inativos, cadastro/edição/inativação e acesso a saídas por venda. Comprador aparece somente em Saída/Venda; SearchCombobox e cadastro no drawer mantêm a operação. Conferência junto aos campos; leitura de código não registra saída.

Histórico mostra snapshot e distingue legado/anônimo; filtro por cliente permanece após reload. Backend valida motivo/comprador, coordena lock com inativação e protege reenvio por usuário/requestId. ADMIN/MANAGER gerenciam; OPERATOR lê/cria. Sem coleta de documento/contato.

## Verificação

| Verificação | Resultado |
| --- | --- |
| Testes padrão | 82 API + 29 frontend passaram; quatro opt-ins ausentes na rodada padrão |
| Clientes HTTP/PostgreSQL | 7 testes passaram: auth/origem/perfis, busca/homônimos, dados forjados, escolha explícita, snapshot, rename/inativação, reenvio simultâneo/payload conflitante, anonimato, rollback, legado, FK/CHECK e corrida inativação/venda |
| Regressão PostgreSQL | 29 testes passaram: estoque, compras/recebimentos e inventário físico, incluindo concorrência e unidade protegida |
| Gates | lint, typecheck e build da workspace aprovados; build web repetido após ajustes. Aviso preexistente de bundle acima de 500 kB permanece |
| UI isolada | Cadastro rápido manteve quantidade 3, sem criar saída: saldo 25 até confirmar; confirmação reduziu 25 → 22. Anônimo explícito reduziu 22 → 21 |
| Histórico | Nome antigo “Cliente de teste UI” preservado após renomear/inativar; filtro permanece no reload |
| Operador | Criou cliente; consulta com campos desabilitados/sem salvar; backend recusa PATCH |
| Recuperação | Cliente inativado após seleção é recusado, quantidade mantida, seleção/anonimato permite corrigir |
| Modais | Descarte/inativação no mesmo drawer; cancelar mantém dados; fechar libera a página |
| Visual | 1440, 1024 e 390px, claro/escuro; sem overflow horizontal nos estados conferidos |

QA somente em loopback: gavyo_customers_stock_test, gavyo_unit_purchases_test e stock_physical_test. Seleção por Enter/cadastro por Enter conferidos sem enviar venda. Perfil e dados fictícios.

Corrigidos durante QA: confirmação aninhada disputando foco/bloqueando a página (substituída por confirmação no mesmo drawer); submit do cadastro por portal propagando à movimentação (interrompido); mensagem de cliente inativo ocultada pelo ApiError (lista explícita de mensagens); tabela móvel com identificação/ações mais compactas. Fluxos foram repetidos após corrigir; falhas iniciais não contam como PASS.

## Implantação

Migration `20261023000000_customers_sales` validada localmente e aplicada ao banco compartilhado no escopo de clientes. Cópia manual atualizada anterior à migration, SHA-256 conferido, com cópia/fingerprints em `var/backups/customers-deploy-20261023/`, fora do Git.

Campos preexistentes das **13 tabelas de negócio** comparados antes/depois: contagens/fingerprints idênticos. _prisma_migrations excluída porque recebe o registro esperado. Nova Customer vazia: **nenhuma fixture levada ao banco compartilhado**. Campos novos dos movimentos legados nulos, sem reinterpretar vendas antigas.

API normal mantida em snapshot compilado durante desenvolvimento para não consultar colunas ausentes; reiniciada na versão atual após migration. Servidor normal: http://localhost:5173/customers. Conferência final: health HTTP 200 e página Clientes com zero registros, sem erro. Escritas de QA ficaram isoladas. Processos extras de API/web de QA encerrados; servidor normal mantido ativo.

Publicação de todas as alterações autorizada pelo usuário em 23/10/2026 após a entrega. Código/migration/documentação devem ser publicados juntos; não usar checkout antiga para registrar movimentações com o novo contrato. As verificações acima antecedem essa publicação.

## Limites e evidências

Não homologados: leitor físico, leitor de tela, documentos/contatos, vendas multitem, caixa/pagamentos, carga ou restauração de imagens. Reenvio foi testado via HTTP simultâneo/repetido; sem queda física de rede no servidor real. Nenhuma soma de unidades incompatíveis nem agrupamento artificial do legado.

Capturas: sale-desktop.jpg, customers-desktop.jpg, customers-1024.jpg, customers-light-mobile.jpg, customer-history-mobile.jpg, customer-history-desktop.jpg, anonymous-sale-mobile.jpg e inactive-customer-error.jpg. Capturas de QA contêm somente fixtures. customers-normal-empty.jpg registra a página vazia no servidor normal após a implantação.
