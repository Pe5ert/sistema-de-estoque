# Estado da V2 — 08/10/2026

**Importação — revisão local 08/10/2026:** sobre `ef9168d`, após integrar atualizações remotas de concorrência/permissões. Fluxo Excel/CSV refinado, validação de linhas/fórmulas e testes ampliados. Leia `docs/IMPORTACAO_V1.md` e `artifacts/importacao-revisao-20261008/REVIEW.md`. Publicação na branch V2 autorizada pelo usuário em 08/10/2026, junto com o inventário físico. QA somente em PostgreSQL isolado, sem dados de teste no Neon.

**Permissões — 08/10/2026:** matriz definida com o usuário, centralizada no shared e aplicada em interface/API. OPERATOR pode cadastrar com entrada inicial e registrar entradas/saídas; edição/inativação/categorias/importação/ajustes ficam com ADMIN/MANAGER e backups com ADMIN. Testados os três perfis, chamadas diretas, ausência de escrita em ações negadas e rebaixamento com sessão aberta. Sem migration ou alteração de papéis reais. [Matriz](PERMISSOES.md) e [QA](../artifacts/permissoes-20261008/REVIEW.md).

**Concorrência do estoque — 08/10/2026:** suíte HTTP/PostgreSQL real ativada em base local isolada. Duas sessões distintas disputam o mesmo produto, com espera pelo row lock comprovada no PostgreSQL: saldo 10/duas saídas de 8 → uma aceita, uma recusada, saldo 2; dez saídas de 2 → cinco aceitas, cinco recusadas, saldo 0; quatro saídas de 0.1 com saldo 0.3 → três aceitas, uma recusada, saldo 0. Auditoria, autoria, persistência e agregados conferidos. Nenhuma mudança de regra de estoque ou escrita no Neon. Procedimento e limites: [REVIEW.md](../artifacts/concorrencia-20261008/REVIEW.md).

**Feedback operacional — 07/10/2026:** camada compartilhada de toast, Alert, FieldError e ConfirmDialog publicada em 1308bb4. Corrigidos perda de rascunho na reconexão e fsync de backup no Windows (ac85e7d). QA com PostgreSQL local, desktop/tablet/mobile; [evidências e limites](../artifacts/feedback-20261007/REVIEW.md).

**Inventário físico V1 — 07/10/2026:** implementação local de contagem persistida, divergências, reconferência e ajustes atômicos auditados. Operadores contam; ADMIN/MANAGER concluem/cancelam. Até 500 produtos por sessão, revisão contra sobrescrita e proteção de movimentos concorrentes. Migration validada somente em PostgreSQL isolado; ainda não aplicada ao Neon. Publicação autorizada pelo usuário em 08/10/2026. Leia [INVENTARIO_FISICO.md](INVENTARIO_FISICO.md).

**Importação V1 — 06/10/2026:** integrada e publicada na sistema-de-estoque-v2 em 8c8f718. CSV/XLSX com mapeamento, categorias explícitas, preview, erros, confirmação atômica/idempotente e entradas INITIAL_STOCK. QA em PostgreSQL isolado e navegador. Migration 20261006000000_product_import aplicada ao Neon em 06/10, após backup verificado; Prisma confirmou schema atualizado e fingerprints das quatro tabelas operacionais permaneceram iguais. Sem reset, seed ou importação de fixtures no Neon. Contratos, limites, integração e retomada: [IMPORTACAO_V1.md](IMPORTACAO_V1.md).

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

Neon teve conexão/migrations verificadas; a migration da importação foi aplicada em 06/10 após backup. As rodadas de importação, feedback e concorrência usaram PostgreSQL local e dados fictícios para escrita. O erro de banco indisponível registrado em 02/10 é histórico, não o estado atual. Segredos e `.env` continuam fora do Git.

A concorrência de retiradas foi validada via HTTP e PostgreSQL real em 08/10. Importação tem cobertura própria de transação, repetição e concorrência. Isso não comprova atualização automática entre usuários, bipador físico, nem uma implantação contínua em produção.

## Pendências atuais

1. Definir atualização de dados entre usuários/abas.
2. Implementar upload/storage de imagens, caso solicitado; hoje são URLs persistidas.
3. Preparar implantação contínua, ferramentas de backup e volume privado persistente.
4. Validar bipador físico, leitor de tela real e expiração prolongada da sessão.

## Decisões futuras

Upload/storage de arquivos; atualização entre usuários. Não implementar vendas, clientes, fornecedores, financeiro, NF, pedidos, múltiplos depósitos ou realtime nesta rodada. O seed DEV permanece opcional e explícito; não é fallback da aplicação.

## Polimento operacional — 02/10/2026

Concluída a rodada de interação: estados compartilhados de controles, selects nativos estilizados, linhas com seleção/teclado, drawers modais em todas as larguras, proteção de rascunho em rotas internas e validação de datas antes da API. Painel destaca produtos ativos e usa contagens de movimentos no gráfico, evitando soma de unidades incompatíveis. Movimento mostra saldo previsto diretamente e confirma com um botão. Gates lint/typecheck/test/build/diff passaram; 35 testes locais, 10 grupos de QA mais 3 verificações touch. Consulta real do painel e cinco prints do Neon registrados. Sem escrita de produto/estoque no Neon nesta rodada; concorrência real permanece pendente. Veja frontend/UI_INTERACTION_REVIEW.md e artifacts/ui-interaction-20261002.
