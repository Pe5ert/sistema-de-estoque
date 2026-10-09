# Correção do botão Atualizar dados — 07/10/2026

O botão consultava a API sem indicar carregamento ou conclusão quando o resultado permanecia igual. A correção em PhysicalInventoryDetail.tsx mostra Atualizando…, impede ações repetidas durante a consulta, confirma ausência de alterações ou carregamento de informações recentes e trata rejeições da consulta. Não altera saldos nem salva rascunhos.

Verificado interativamente via CUA na prévia localhost:5175, API localhost:3211 e PostgreSQL loopback:5549, base isolada stock_physical_ui_test:

- Inventário encerrado: consulta sem alterações mostra confirmação.
- Novo inventário de QA: quantidade 13,125 e observação local preservadas após consulta.
- Indisponibilidade simulada exclusivamente na base isolada: erros visíveis; quantidade e observação preservadas; controles liberados ao terminar. Base restaurada na porta 5549 e health HTTP 200.
- Outro operador salva uma contagem pela API: Atualizar dados carrega o valor 77,000, preserva o rascunho de outro produto e apresenta a proteção de revisão já existente.
- Desktop 1440, intermediária 1024 e mobile 390: sem overflow horizontal.
- Lint, typecheck, build, git diff --check e 11 testes do frontend: PASS. Build mantém os avisos conhecidos de anotação PURE do Zod e bundle acima de 500 kB.

Capturas: atualizar-dados-desktop.png e atualizar-dados-mobile.png. Sem commit/push. Nenhuma alteração no Neon ou no .env.
