# Sistema de Estoque V2

Esta branch é uma reimplementação progressiva do sistema de estoque. A aplicação PHP/MySQL original permanece na branch `master` como referência funcional enquanto a V2 amadurece. Esta primeira fase entrega a base técnica, o domínio inicial e o shell visual. Cadastro, autenticação e movimentações completas ficam para fases posteriores.

## Arquitetura

- Monorepo pnpm, sem Turborepo.
- `apps/web`: React, TypeScript, Vite, Tailwind CSS 4, React Router. TanStack Query, React Hook Form e Zod já estão disponíveis para as próximas telas.
- `apps/api`: monólito NestJS REST, Prisma ORM 7, PostgreSQL, validação de configuração e Swagger.
- `packages/shared`: somente enums e tipos independentes compartilháveis; sem Nest ou Prisma Client.
- `docker-compose.yml`: apenas PostgreSQL local.

O saldo do produto é estado materializado. Qualquer mudança futura deve ocorrer pelo domínio de inventário, com transação, proteção contra concorrência e registro de `StockMovement`. Não haverá endpoint que aceite `stock` em uma atualização comum de produto.

## Pré-requisitos

- Node.js 22.13+ LTS e pnpm 11 (`corepack enable` pode disponibilizar o pnpm).
- Docker com Compose para PostgreSQL local.

## Início rápido

Na raiz da branch V2:

```powershell
pnpm install
Copy-Item .env.example .env
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Revise `.env` antes de iniciar. Os valores do exemplo são exclusivos do desenvolvimento local. O seed cria `admin@example.local` com a senha definida em `SEED_ADMIN_PASSWORD` no `.env.example` (`ChangeMe123!` inicialmente); troque-a ao configurar o ambiente. Nunca use essas credenciais em um ambiente compartilhado.

- Frontend: <http://localhost:5173>
- Health da API: <http://localhost:3000/api/health>
- Swagger: <http://localhost:3000/api/docs>

O health retorna `200` com `database: up` quando consegue consultar o PostgreSQL e `503` quando a conexão falha.

O comando `pnpm db:migrate` aplica a migration e gera o Prisma Client. O seed é pequeno e idempotente: cria um ADMIN, três categorias, três produtos e suas movimentações de saldo inicial. Rodar o seed novamente não altera saldos existentes. Não há importação automática do banco legado.

## Comandos

| Comando                         | Função                                       |
| ------------------------------- | -------------------------------------------- |
| `pnpm dev`                      | API e frontend com recarga local             |
| `pnpm dev:web` / `pnpm dev:api` | Apenas uma aplicação                         |
| `pnpm db:migrate`               | Migration de desenvolvimento + Prisma Client |
| `pnpm db:generate`              | Geração manual do Prisma Client              |
| `pnpm db:seed`                  | Dados mínimos de desenvolvimento             |
| `pnpm lint`                     | ESLint do workspace                          |
| `pnpm typecheck`                | TypeScript strict                            |
| `pnpm build`                    | Builds da API, web e shared                  |
| `pnpm test`                     | Testes disponíveis nos pacotes               |

## Estrutura

```text
apps/
  api/
    prisma/          Schema, migration e seed
    src/             Configuração, Prisma, health e base Nest
  web/
    src/             Shell, rotas, dados locais de demonstração e tokens visuais
packages/
  shared/            Contratos independentes
docs/
  legacy-diagnosis.md
  frontend/DESIGN.md
```

Leia `AGENTS.md` antes de expandir a arquitetura ou o frontend. O diagnóstico do PHP está em `docs/legacy-diagnosis.md` e o estado da implementação em `docs/PROJECT_STATUS.md`. Nesta fase, as quatro telas usam dados fictícios locais de `apps/web/src/demo-data.ts` para prévia visual. Ainda não existem consultas reais de produtos, cadastro, autenticação ou mutações de estoque. Para ver somente a interface, rode `pnpm dev:web`; isso não exige PostgreSQL.
