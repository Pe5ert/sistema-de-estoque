# Aplicação da direção aprovada - 09/10/2026

Base: `sistema-de-estoque-v2`, trazendo a integração validada `274d1aa`. Upload WIP excluído. Banco de QA: loopback, `gavyo_final_purchases_test`; nenhum teste no Neon. Direção: protótipo de Compras/Novo Pedido, grafite/azul, sans-serif e 2 px. Sem bibliotecas novas ou mudanças de domínio.

## Inventário funcional antes das alterações

| Superfície existente | Recursos preservados | Perfis / estados / responsividade |
| --- | --- | --- |
| Dashboard | indicadores, gráfico, prioridades, reposição e atividade | todos consultam; reposição depende de purchase.manage; DataState e estados sem alertas; grade responsiva |
| Produtos / formulários / detalhes | busca, filtros, paginação, seleção, drawer, criação/edição, duplicidade, imagem URL, saldo inicial | todos leem/criam; ADMIN/MANAGER editam; FieldError/dirty/blocker/save-and-new; tabela reorganizada no mobile, drawer modal |
| Categorias (dentro de Produtos) | consulta, formulário, edição/inativação | ADMIN/MANAGER gerenciam; estados compartilhados; nenhuma rota nova |
| Movimentações | SKU/barcode, Enter, entrada/saída, ajustes, saldo previsto, confirmação | todos movimentam; ADMIN/MANAGER ajustam; erros e trava de repetição; ação acessível mobile |
| Histórico | filtros, paginação, referência/recebimento, drawer de auditoria | todos consultam; DataState/erro de período; linhas clicáveis por teclado |
| Importação | CSV/XLSX, erros linha/campo, relatório, reenvio corrigido, confirmação e idempotência | ADMIN/MANAGER; loading/error/resultados preservados; controles/paginação mobile |
| Fornecedores | filtros, paginação, detalhe, contatos, formulário e inativação | todos consultam; ADMIN/MANAGER gerenciam; dirty/form/erros intactos |
| Compras / Novo Pedido / recebimento | filtros, paginação, draft/edição, fornecedor, lookup/SKU, 100 linhas, decimal, envio, parcial, cancelamento e tentativa persistida | todos consultam; ADMIN/MANAGER gerenciam/recebem; recapitulativo lateral visual; sequência e confirmação iguais |
| Inventário físico | abrir, contar, salvar, divergências, revisão/recontagem, concluir/cancelar | OPERATOR conta; ADMIN/MANAGER concluem/cancelam; estados/conflitos e contagem em lotes intactos |
| Backups | listagem, download, agendamento, operação manual e progresso | ADMIN; sem gerar/restaurar backup real nesta revisão visual; loading/feedback preservados |
| Login / sessão | login, mostrar senha, erro genérico, cookie e logout | fluxo sensível intacto; marca/campos harmonizados, nenhum novo controle |

## Componentes compartilhados

Reutilizar styles.css (tokens/shell/tabela/campos), Field/QuantityInput, DataState/Pagination, feedback/ConfirmDialog, DetailDrawer e UnsavedForm. Alterações predominantemente CSS e JSX de apresentação; lógica das páginas permanece.

## Verificação planejada

Antes/depois em 1440x900, 1024x768 e 390x844; navegação, teclado, foco/drawers, filtros/paginação, cadastro/erros, entradas/saídas, importação, pedidos/recebimentos e permissões na base local. Lint, typecheck, test, build e diff --check. Executar suites PostgreSQL em bancos dedicados conforme as proteções dos testes. Registrar cobertura real e limitações sem equiparar teste automatizado à validação visual.
