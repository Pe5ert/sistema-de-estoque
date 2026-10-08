# Concorrência do estoque — 08/10/2026

## Ambiente e método

PostgreSQL 17.11 local, restrito a 127.0.0.1:55432, base nova `gavyo_stock_test`. As três migrations existentes foram aplicadas somente nessa base. Nenhum reset, seed, alteração de `.env` ou escrita no Neon. Contas, categorias e produtos fictícios com identificadores únicos; auditoria preservada e fixtures principais inativadas no fim.

NestJS/Prisma reais, endpoints HTTP e duas contas OPERATOR autenticadas por login/cookies distintos. Uma conexão PostgreSQL separada segura o row lock do produto enquanto as solicitações chegam. O teste só prossegue depois de observar ao menos duas sessões esperando por `FOR UPDATE` em `pg_stat_activity`, então libera a linha e confere os resultados. Isso demonstra disputa real, além de iniciar promises simultaneamente.

## Resultados

| Caso | Resultado esperado e verificado |
| --- | --- |
| Saldo 10; duas saídas de 8 | HTTP 201 + 409; saldo final 2; uma saída 10→2 e uma entrada inicial, sem movimento para a rejeição; autor corresponde à sessão vencedora |
| Saldo 10; dez saídas de 2 | Cinco HTTP 201 e cinco 409; saldo final 0; cadeia 10→8→6→4→2→0; cinco saídas na auditoria com IDs correspondentes às respostas aceitas |
| Saldo 0.3; quatro saídas de 0.1 | Três HTTP 201 e um 409; saldo exato 0; cadeia Decimal 0.3→0.2→0.1→0, sem resíduo |
| Dashboard após dez tentativas | Redução de 10 unidades e aumento de cinco saídas; solicitações rejeitadas não entram nos agregados |
| Fluxo persistente | Cadastro com entrada inicial, edição sem mudar saldo, leitura posterior, duplicidades, saída 100→80, saldo insuficiente, logout/login e leitura do saldo preservado |

Não foi encontrada falha de concorrência nas regras de estoque; `FOR UPDATE` e a transação existentes foram preservados. Corrigida somente uma expectativa antiga da suíte: logout retorna HTTP 204 conforme o controller/contrato, e não 200. Adicionada proteção para que esta suíte aceite apenas banco loopback com nome terminado em `_stock_test`.

Gates aprovados: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `git diff --check`. A execução final teve 55 testes API e 7 web aprovados, zero falhas; duas suítes opt-in (backup e importação PostgreSQL) ficaram SKIP. Os três testes reais de estoque foram ativados e passaram. Build conserva os avisos existentes de Zod e bundle web acima de 500 KB. O PostgreSQL usado nesta rodada foi encerrado após a validação.

## Repetição

1. Criar uma base local dedicada terminada em `_stock_test` com ferramentas PostgreSQL disponíveis.
2. No processo de preparação, definir `DATABASE_URL` para essa base e executar `pnpm --filter @stock/api db:deploy`.
3. No processo de teste, definir `TEST_DATABASE_URL` para a base dedicada; não usar a mesma URL em `DATABASE_URL`.
4. Executar `pnpm --filter @stock/api exec tsx --tsconfig tsconfig.test.json --test src/inventory/postgres.spec.ts`, ou `pnpm test` para incluir os demais testes.

Sem `TEST_DATABASE_URL`, o resultado é SKIP e não prova concorrência. Uma máquina nova deve configurar seu próprio PostgreSQL local; as ferramentas do QA desta máquina não são dependências versionadas.

## Limites

Esta rodada verifica concorrência via HTTP/API e banco real, sem interação visual. Não comprova sincronização automática entre telas de usuários, alta carga prolongada, múltiplas réplicas, falha de rede após commit ou idempotência de movimentações. Duas solicitações válidas de saída representam duas operações: o row lock protege o saldo, mas não deduplica reenvios. Importação possui idempotência própria e não foi revalidada nesta rodada. Hardware leitor, leitor de tela e sessão de oito horas permanecem fora deste teste.
