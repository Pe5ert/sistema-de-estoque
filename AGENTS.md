# Regras permanentes da V2

## Arquitetura

- Monólito modular: React/TypeScript/Vite no `apps/web`, NestJS/Prisma/PostgreSQL no `apps/api`, contratos independentes no `packages/shared`.
- Sem microsserviços, filas, CQRS complexo, frameworks genéricos de CRUD ou abstrações sem uso concreto.
- Entender o domínio antes de expor CRUD. Não importar Prisma Client no frontend nem código Nest em `shared`.

## Estoque

- `Product.stock` é saldo materializado, nunca campo editável pela UI ou por `PATCH /products/:id`.
- Mudanças de estoque devem criar `StockMovement`, preservar histórico e registrar autor e saldos anterior/resultante.
- Na implementação das mutações, usar transação e proteção contra concorrência, validar saldo e nunca apagar movimentos para desfazer operações.
- Produto é desativado por padrão, não excluído fisicamente.

## Frontend

- Interface operacional densa, organizada e legível; tabelas são elementos centrais. Usar hierarquia, divisores e superfície com intenção, sem transformar tudo em cards.
- Evitar minimalismo vazio, dashboard genérico, métricas falsas, excesso de arredondamento e animações decorativas.
- Tipografia sans-serif forte, estados de foco visíveis, labels e navegação por teclado. Desktop é prioritário; no mobile, reorganizar tarefas em vez de comprimir tabela.
- Referências visuais do usuário são restrições concretas. Não simplificá-las por conta própria.
- Ler `docs/frontend/DESIGN.md` antes de mudanças visuais amplas.

## Processo

1. Entender o requisito e inspecionar o código e o impacto.
2. Implementar apenas o escopo autorizado.
3. Testar lint, typecheck, build e comportamento relevante.
4. Revisar visualmente toda alteração de UI nas larguras desktop e mobile.

O PHP legado permanece na branch principal como referência funcional. Consultar `docs/legacy-diagnosis.md`; não copiá-lo automaticamente.
