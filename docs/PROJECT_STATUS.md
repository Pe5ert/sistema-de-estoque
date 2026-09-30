# Estado da V2

Resumo para continuar o trabalho em outra máquina. Esta branch contém a base técnica e uma prévia visual; ainda não é um sistema de estoque completo.

## Entregue

- Monorepo pnpm com React/Vite/Tailwind em `apps/web`, NestJS/Prisma em `apps/api` e tipos independentes em `packages/shared`.
- Schema inicial de usuários, categorias, produtos e movimentos; migration e seed de desenvolvimento.
- API com `/api/health` e documentação Swagger em `/api/docs`.
- Quatro rotas visuais: visão geral, produtos, movimentações e histórico. Os valores vêm exclusivamente de `apps/web/src/demo-data.ts` e são identificados como fictícios.
- Direção visual em `docs/frontend/DESIGN.md` e diagnóstico do legado em `docs/legacy-diagnosis.md`.

## Pendente

- A migration e o seed ainda precisam ser executados e validados com PostgreSQL real. A máquina de desenvolvimento usada até aqui não tinha Docker nem PostgreSQL; não foi feita instalação no sistema.
- Não há autenticação, cadastro ou edição de produtos, upload de imagens, detalhe clicável, leitura real de código de barras, endpoints de movimentos ou atualização entre usuários.
- O saldo de `Product` não deve ser editado diretamente. Cada alteração precisa criar um `StockMovement` em transação, com proteção contra concorrência e saldos anterior e resultante.

## Próximas decisões discutidas

Foram levantadas como possibilidades futuras, sem implementação: foto principal do produto, fluxo de adicionar/editar, painel de detalhe ao selecionar uma linha, atualização da interface após salvar e atualização entre usuários. Definir escopo e prioridade antes de começar essas funcionalidades.

## Como abrir a prévia

Use Node.js 22.13+ e pnpm 11. Na raiz do repositório, execute `pnpm install` e `pnpm dev:web`. Abra `http://localhost:5173/`. O frontend de demonstração não precisa de banco de dados.

Para validar todo o workspace, use `pnpm lint`, `pnpm typecheck` e `pnpm build`. O guia completo de ambiente está no `README.md`.
