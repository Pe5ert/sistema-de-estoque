# Correções após testes de uso — 02/10/2026

Base: `918feb4`, branch `sistema-de-estoque-v2`. Correção e push autorizados pelo usuário.

## Alterações

- `apps/web/src/styles.css`: a segunda linha da grade cresce com o conteúdo, com 283 px como mínimo. O painel de atenção tem espaço inferior de 16 px. A fila de três produtos fica completamente visível no desktop; o painel passou de 281 px internos/310 px de conteúdo para 326/326 px.
- `apps/web/src/MovementWorkbench.tsx`: o foco na quantidade espera a consulta do produto deixar o estado pendente e não ter erro. Antes, a tentativa ocorria enquanto o campo estava desabilitado.
- `apps/web/src/styles.css`: ao abrir o menu mobile, somente transform é animado. A visibilidade é imediata, permitindo ao efeito existente transferir o foco ao primeiro link. A animação de fechamento permanece.

Diff da aplicação: 2 arquivos, 7 inserções e 5 remoções. Sem alteração de login, API, autenticação ou regras de estoque.

## Verificação

- Lint e typecheck: PASS.
- Build: PASS, com avisos existentes de comentários PURE do Zod e bundle acima de 500 kB.
- Testes: 30 testes da API e 5 testes do frontend PASS com Node 22.23.3. A suíte PostgreSQL opt-in foi ignorada, sem TEST_DATABASE_URL.
- A primeira tentativa da suíte com o runtime disponível Node 24.19.0 falhou com SIGSEGV. Repetição com o Node 22 exigido pelo projeto passou. Lint/typecheck/build usaram Node 24.19.0 e pnpm 11.19.0, com aviso de engines; dependências e lockfile não foram modificados.
- `git diff --check`: PASS.
- UI: 7 verificações em `fix-results.json`: fila completa em 1440 px, foco após busca por Enter, menu por clique e Enter, contenção de foco, Escape e fechamento após navegar.
- Revisão visual em 1440×900, 1024×900 e 390×844. Em 1024 e mobile, largura de rolagem igual à largura disponível, sem overflow horizontal.

Capturas após correção: `fixed-desktop.jpg`, `fixed-1024.jpg`, `fixed-mobile.jpg`. Diagnóstico anterior preservado em `REVIEW.md` e `result.json`.

## Ambiente

Testes UI usaram API isolada em memória e dados fictícios identificados na tela. Os testes automatizados da API também usam repositórios isolados. Isso não confirma PostgreSQL, persistência ou concorrência reais.

Após as capturas, a configuração fornecida pelo usuário foi salva exclusivamente no `.env` local, ignorado pelo Git, com permissões 600. Nenhuma migration, seed ou escrita no banco Neon foi executada. Segredos não fazem parte destas evidências.
