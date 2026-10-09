# Clareza do fluxo — 07/10/2026

Correção focada em PhysicalInventoryDetail.tsx e no manual INVENTARIO_FISICO.md, sem commit/push:

- Encerramento: Concluir inventário substitui Revisar e concluir.
- Conflito: Manter meu preenchimento / Usar valores salvos explicam a escolha. Manter exige confirmação e continua sem salvar automaticamente.
- Orientação contextual informa pendências, necessidade de salvar, conflito ou possibilidade de concluir. Salvar recebe destaque durante o preenchimento; Concluir recebe destaque quando a contagem está completa e salva.
- Inventário vazio não anuncia Contagem salva; mostra Nenhum produto contado.
- Confirmação distingue Aplicar ajustes e concluir de Concluir sem ajustes; ambas explicam o encerramento definitivo da contagem.

QA CUA na base isolada stock_physical_ui_test: escolha de manter rascunho; orientação para salvar; salvamento com pendência resolvida; confirmação com duas divergências; retorno à contagem; contagens iguais aos saldos e confirmação sem ajustes. As confirmações foram fechadas sem concluir: nenhum saldo foi alterado nesta rodada. A prévia ficou no fluxo normal, com todos os produtos contados e sem conflito.

Desktop 1440, intermediária 1024 e mobile 390: sem overflow horizontal. Captura final fluxo-intuitivo-desktop.png; a captura mobile excedeu o tempo de resposta do navegador, sem impedir a verificação de largura. O viewport original foi restaurado.

Lint, typecheck, build e git diff --check: PASS. Após a última alteração de texto, ESLint do componente e build também passaram. Avisos de build existentes: PURE/Zod e bundle acima de 500 kB. Nenhuma alteração no Neon ou no .env.
