# Estado da V2 — 05/10/2026

**Backups — 05/10/2026:** área exclusiva do ADMIN com cópia completa manual, download e agendamento semanal/mensal persistido. Padrão mensal no primeiro dia, 02:00 America/Fortaleza; retenção 365 dias. Restauração real conferida em PostgreSQL isolado. Neon PostgreSQL 18 exportado nesta máquina com ferramentas 18.6; arquivo privado em var/backups, ignorado pelo Git. Configuração/limites: [BACKUPS.md](BACKUPS.md).

**Leitura por código — 05/10/2026:** Movimentações mantém foco no código após identificar, protege o produto selecionado e prepara automaticamente a próxima leitura após registrar. Digitação/colagem + Enter permite simular sem aparelho. Fluxo, QA e limites de hardware: [frontend/BARCODE_WORKFLOW.md](frontend/BARCODE_WORKFLOW.md).

Guia curto para continuar em outro notebook. Contratos, migrations e procedimento completo: [OPERATIONAL_INTEGRATION.md](OPERATIONAL_INTEGRATION.md). Regras visuais: [frontend/DESIGN.md](frontend/DESIGN.md).

## Implementado

- Monorepo pnpm: React/Vite/Tailwind, NestJS/Prisma/PostgreSQL, shared enums/contratos.
- Auth remoto preservado: Argon2id, cookie JWT HttpOnly de 8h, login/me/logout, guards e RBAC disponível. Não refazer login.
- Categorias reais: listagem, cadastro, edição/inativação; sem DELETE.
- Produtos reais: paginação/busca/filtros no backend, detalhe, cadastro/edição, preços opcionais, URL/null de imagem, estado ativo/inativo, duplicidades 409. PATCH rejeita saldo.
- Entrada inicial cria produto com saldo zero e StockMovement na mesma transação.
- Movimentos atômicos com Decimal, lock por produto, autor da sessão, rejeição de saldo negativo, saldos antes/depois e auditoria.
- Histórico paginado e filtrado; detalhes por clique neutro/Enter. Drawer desktop permite trocar seleção; mobile fullscreen com foco contido e fundo inert.
- Painel agregado: saldo, produtos ativos, normais/baixos/zerados, valor a custo, reposição, atividade, movimentos de hoje e entradas/saídas de 7 dias.
- TanStack Query em todas as telas operacionais; invalidação após mutações sem reload. Arquivos demo-data/catalog e DemoCatalogProvider removidos.
- Identidade visual, sidebar, login e composição do formulário preservados. Imagem agora é URL persistida; não há falso upload de arquivo.

## Validação e limite real

PostgreSQL local não respondeu e usuário não lembra a conexão de casa. Foram preenchidos somente JWT_SECRET (aleatório) e VITE_API_URL locais ausentes; DATABASE_URL e demais valores foram preservados. Sem instalação de Docker/PostgreSQL, migration, seed ou reset. O `.env` não foi versionado.

API iniciada; health real retornou **503 / database down**, `/auth/me` anônimo retornou **401**. Os 35 testes locais de auth/contratos/Decimal/formulário e QA de interação com fixtures passaram. A suíte PostgreSQL de persistência/rollback/concorrência está preparada, mas **não executada** sem `TEST_DATABASE_URL`. Prints/resultados: `artifacts/operational-20261002/`.

## Próxima etapa necessária

1. Recuperar uma conexão PostgreSQL autorizada; configurar `.env` localmente sem versionar segredos.
2. Verificar migrations e `apps/api/prisma/preflight.sql`; revisar/aplicar migration nova via `pnpm --filter @stock/api db:deploy`, sem reset.
3. Subir API/web; `/api/health` deve confirmar banco.
4. Validar login → categoria → produto/entrada 100 → reload → edição → saída 20 → histórico 100→80 → painel → logout/login com persistência.
5. Executar suíte real em uma base de teste separada para comprovar duas saídas simultâneas de 8 com saldo 10.

## Decisões futuras

Matriz de permissões por role; upload/storage de arquivos; atualização entre usuários. Não implementar vendas, clientes, fornecedores, financeiro, NF, pedidos, múltiplos depósitos ou realtime nesta rodada. O seed DEV permanece opcional e explícito; não é fallback da aplicação.

## Polimento operacional — 02/10/2026

Concluída a rodada de interação: estados compartilhados de controles, selects nativos estilizados, linhas com seleção/teclado, drawers modais em todas as larguras, proteção de rascunho em rotas internas e validação de datas antes da API. Painel destaca produtos ativos e usa contagens de movimentos no gráfico, evitando soma de unidades incompatíveis. Movimento mostra saldo previsto diretamente e confirma com um botão. Gates lint/typecheck/test/build/diff passaram; 35 testes locais, 10 grupos de QA mais 3 verificações touch. Consulta real do painel e cinco prints do Neon registrados. Sem escrita de produto/estoque no Neon nesta rodada; concorrência real permanece pendente. Veja frontend/UI_INTERACTION_REVIEW.md e artifacts/ui-interaction-20261002.
