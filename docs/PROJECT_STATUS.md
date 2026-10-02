# Estado da V2

Resumo para continuar o trabalho em outra máquina. Esta branch contém a base técnica e uma prévia visual; ainda não é um sistema de estoque completo.

## Entregue

- Monorepo pnpm com React/Vite/Tailwind em `apps/web`, NestJS/Prisma em `apps/api` e tipos independentes em `packages/shared`.
- Schema inicial de usuários, categorias, produtos e movimentos; migration e seed de desenvolvimento.
- API com `/api/health` e documentação Swagger em `/api/docs`.
- Autenticação integrada: login Argon2id, JWT em cookie HttpOnly de 8 horas, usuário atual, logout, proteção de rotas e infraestrutura RBAC. Tela de login inspirada na organização operacional da referência Dribbble aprovada (Alex Tsibulski / Dopamine), usando os tokens escuros da V2.
- Rotas visuais: visão geral, produtos, novo produto, editar produto, movimentações e histórico. A sessão começa com os exemplos de `apps/web/src/demo-data.ts`; cadastro/edição usam somente memória local e são identificados como demonstração.
- Direção visual em `docs/frontend/DESIGN.md` e diagnóstico do legado em `docs/legacy-diagnosis.md`.
- Refinamento frontend: catálogo com busca/filtros locais, thumbnails opcionais e detalhe de leitura; consulta por SKU com prévia de entrada/saída sem gravação; histórico com motivo, autor e saldos antes/depois. Os exemplos existentes foram preservados, sem preços inventados.
- Formulários: Novo Produto dedicado, edição compartilhada, SKU/barcode separados, custo/venda opcionais, mínimo, imagem principal com seleção/drop/preview/substituir/remover, descrição secundária e Save-and-new. Consulta de movimentos encontra também barcode cadastrado na sessão; aceita quantidades decimais e prepara a próxima consulta pelo teclado. Relatório em `docs/frontend/FORMS_REVIEW.md`.

## Pendente

- A migration e o seed ainda precisam ser executados e validados com PostgreSQL real. A máquina de desenvolvimento usada até aqui não tinha Docker nem PostgreSQL; não foi feita instalação no sistema.
- Não há persistência de cadastro/edição, upload real de imagens, integração de barcode com API, endpoints de movimentos ou atualização entre usuários. A entrada inicial é preparada na UI, mas não cria movimento nem altera saldo. Recarregar a página restaura o catálogo de exemplos.
- O saldo de `Product` não deve ser editado diretamente. Cada alteração precisa criar um `StockMovement` em transação, com proteção contra concorrência e saldos anterior e resultante.

## Próximas decisões discutidas

Continuam pendentes: integrar cadastro/edição à API, armazenamento de imagem principal, gravação de movimentos/entrada inicial e atualização entre usuários. Os fluxos de adicionar/editar e imagem principal estão disponíveis na camada de apresentação, sem persistência. A autenticação já está integrada; permissões de produtos/estoque serão definidas com os endpoints reais.

## Como abrir a prévia

Use Node.js 22.13+ e pnpm 11. Na raiz do repositório, execute `pnpm install` e `pnpm dev:web`. Abra `http://localhost:5173/`. As rotas privadas exigem sessão real: configure `.env`, inicie PostgreSQL/API e execute migration/seed conforme o README. O catálogo continua sendo uma demonstração em memória após o login.

Para validar todo o workspace, use `pnpm lint`, `pnpm typecheck` e `pnpm build`. O guia completo de ambiente está no `README.md`.
