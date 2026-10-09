# Simplificação da interface de importação — 08/10/2026

Mudança local sobre ef9168d, sem commit/push. Somente ProductImport.tsx e estilos da importação nesta rodada de implementação. Inventário físico e alterações anteriores preservados.

## Comportamento

Erros agrupados pela linha original da planilha, com detalhes ao abrir a linha. Até cinco grupos inicialmente; expansão até cinquenta e relatório CSV completo preservado. Colunas recolhidas e abertas automaticamente quando uma coluna obrigatória não está associada. Categorias aparecem quando há escolhas; prévia opcional nos estados com erros/alterações. Upload de substituição, instruções e importações recentes recolhidos. Removidos avisos repetidos da validação. Botão de arquivo corrigido abre a seleção e leva o foco ao campo.

A correção distingue os dados corrigidos no Excel das associações feitas na aplicação. Confirmação antes da importação, proteção de saída e revisão concorrente preservadas. Nenhuma alteração de API, permissões, saldo ou migrations nesta rodada.

## Validação

- Lint e typecheck passaram (logs neste diretório).
- Build passou com pnpm -r --workspace-concurrency=1 build, reduzindo a carga nesta máquina. Primeira tentativa em paralelo terminou por SIGTERM/143; não tratada como sucesso. Avisos existentes de Zod e tamanho do bundle permanecem.
- 14 testes existentes do frontend passaram: web-tests.log. Testes de backend da rodada anterior não foram repetidos para esta mudança de apresentação.
- Conferência interativa: dez erros em duas linhas; expansão individual; editor recolhido; Enter/Espaço nos detalhes; escolha de categoria; atualizar preserva rascunho; sair pede confirmação; validar SKU sem coluna aponta erro e mantém editor aberto; nova planilha válida mostra prévia, quantidade 2,5 e confirmação cancelável antes de gravar. Nenhum produto adicionado nesta rodada.
- Desktop 1440, intermediário 1024 e mobile 390 verificados sem overflow horizontal. Prints de erros e prévia neste diretório.

Dados inteiramente fictícios na base loopback stock_ui_import_test, porta 5549, API 3211 e web 5175. A API e o Vite encerraram por SIGTERM durante os gates; foram reiniciados para a conferência. Banco Neon, .env real, seeds e migrations reais não alterados. Esta conferência do agente não substitui observação de uso por clientes leigos.
