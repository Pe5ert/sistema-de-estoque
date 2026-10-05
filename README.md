# Sistema de Estoque V2

Esta branch é uma reimplementação progressiva do sistema de estoque. A aplicação PHP/MySQL original permanece na branch `master` como referência funcional enquanto a V2 amadurece. Auth, categorias, produtos, inventário, histórico e painel estão integrados à API PostgreSQL. O frontend não possui fallback de dados fictícios. A validação com banco real ainda está pendente nesta máquina; leia `docs/OPERATIONAL_INTEGRATION.md` para retomar com segurança.

## Arquitetura

- Monorepo pnpm, sem Turborepo.
- `apps/web`: React, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, React Hook Form e Zod.
- `apps/api`: monólito NestJS REST, Prisma ORM 7, PostgreSQL, validação de configuração e Swagger.
- `packages/shared`: somente enums e tipos independentes compartilháveis; sem Nest ou Prisma Client.
- `docker-compose.yml`: apenas PostgreSQL local.

O saldo do produto é estado materializado. Mudanças ocorrem pelo domínio de inventário, com transação, lock da linha e registro de `StockMovement`. PATCH de produto rejeita `stock`.

## Pré-requisitos

- Node.js >=22.13 e <23, pnpm 11 (`corepack enable` pode disponibilizar o pnpm).
- PostgreSQL acessível. Docker Compose é opcional para uma base nova de desenvolvimento; não instalar/recriar infraestrutura se já houver uma conexão autorizada.

## Início rápido

Na raiz da branch V2, preserve o `.env` existente:

```powershell
pnpm install --frozen-lockfile
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Preencher ambiente e verificar banco/migrations antes de continuar.
# Revisar apps/api/prisma/preflight.sql e as migrations versionadas.
pnpm --filter @stock/api db:deploy
pnpm dev
```

Revise `.env` antes de iniciar e preencha `JWT_SECRET` com um segredo aleatório de pelo menos 32 caracteres (por exemplo, gerado com `openssl rand -hex 32`). Os valores do exemplo são exclusivos do desenvolvimento local. O seed cria `admin@example.local` com a senha definida em `SEED_ADMIN_PASSWORD` no `.env.example` (`ChangeMe123!` inicialmente); troque-a ao configurar o ambiente. Nunca use essas credenciais em um ambiente compartilhado.

- Frontend: <http://localhost:5173>
- Health da API: <http://localhost:3000/api/health>
- Swagger: <http://localhost:3000/api/docs>

O health retorna `200` com `database: up` quando consegue consultar o PostgreSQL e `503` quando a conexão falha.

`db:deploy` aplica migrations versionadas e gera o Prisma Client. Em banco existente, não usar reset, DROP ou `db push`; primeiro conferir o status das migrations e o preflight somente leitura. `pnpm db:migrate` continua disponível exclusivamente para autoria de novas migrations em desenvolvimento, não para resolver divergência com reset.

O seed é opcional e somente DEV: cria um ADMIN, três categorias, três produtos e seus movimentos iniciais. Rodar novamente atualiza o hash da senha do administrador de `SEED_ADMIN_EMAIL`; não fazê-lo automaticamente em base compartilhada. Recusa execução em produção. Não há importação automática do legado.

## Comandos

| Comando                         | Função                                       |
| ------------------------------- | -------------------------------------------- |
| `pnpm dev`                      | API e frontend com recarga local             |
| `pnpm dev:web` / `pnpm dev:api` | Apenas uma aplicação                         |
| `pnpm db:migrate`               | Migration de desenvolvimento + Prisma Client |
| `pnpm --filter @stock/api db:deploy` | Aplicar migrations versionadas sem reset |
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
    src/             Shell, rotas, queries/mutações REST e tokens visuais
packages/
  shared/            Contratos independentes
docs/
  legacy-diagnosis.md
  frontend/DESIGN.md
```

Leia `AGENTS.md` antes de expandir a arquitetura ou o frontend. O diagnóstico do PHP está em `docs/legacy-diagnosis.md`, o estado em `docs/PROJECT_STATUS.md` e contratos/validação pendente em `docs/OPERATIONAL_INTEGRATION.md`. Telas privadas exigem sessão, API e PostgreSQL. A rota `/login` e a identidade visual foram preservadas.

## Autenticação

- `POST /api/auth/login`: `{ "email": "...", "password": "..." }`; retorna apenas `id`, `name`, `email`, `role`. E-mail é normalizado e credenciais inválidas ou conta inativa recebem o mesmo `401`.
- `GET /api/auth/me`: fonte de verdade da sessão; `401` para cookie ausente, JWT inválido/expirado ou usuário inexistente/inativo. Consulta o role atual no banco a cada requisição.
- `POST /api/auth/logout`: `204`, remove o cookie e funciona mesmo após a sessão expirar.

O JWT HS256 fica exclusivamente no cookie `stock_session`: HttpOnly, SameSite=Lax, Path=/ e duração de 8 horas. Secure é obrigatório em produção e para origens fora do HTTP de loopback. Em produção, use HTTPS e frontend/API no mesmo site (ou reverse proxy); a configuração Lax não atende sites independentes. Não há refresh token nem persistência de token/senha no navegador. Logout remove o cookie do navegador; esta versão usa JWT sem lista de revogação de sessões.

`WEB_ORIGIN` deve ser a origem exata do frontend, sem caminho/barra final. O CORS permite credenciais apenas para ela. Todos os métodos de escrita exigem o header `Origin` igual a `WEB_ORIGIN`, inclusive login/logout, para evitar CSRF. Clientes CLI e chamadas manuais devem enviar esse header. Em Swagger, a documentação está disponível; o Try it out de escrita requer que a documentação seja servida na origem configurada para o frontend (por reverse proxy). Não amplie a lista de origens para contornar essa proteção.

O login limita 8 tentativas por minuto/IP usando o armazenamento em memória do Nest Throttler, sem bloqueio de conta. O limite é por processo e reinicia com ele. O servidor não confia automaticamente em `X-Forwarded-For`; ao publicar atrás de proxy, configure explicitamente os proxies confiáveis no ambiente de implantação para preservar a identificação de IP. Helmet aplica os headers de segurança.

Para proteger um controller, importe `AuthModule` e use `@UseGuards(JwtAuthGuard)`; para RBAC, use `@UseGuards(JwtAuthGuard, RolesGuard)` e `@Roles(UserRole.ADMIN, UserRole.MANAGER)`, importando `UserRole` do Prisma gerado no backend. `@CurrentUser()` entrega apenas o usuário público. Novos endpoints exigem autenticação; a matriz de permissões por role para produtos/estoque ainda não foi definida.

O seed anterior usava bcrypt; o seed atual grava Argon2id. Use somente em base DEV autorizada, quando realmente precisar preparar a conta. A conta DEV padrão é `admin@example.local`; a senha vem de `SEED_ADMIN_PASSWORD`. Não regravar contas existentes automaticamente ao retomar uma checkout.

Variáveis de autenticação:

- `JWT_SECRET`: obrigatório, pelo menos 32 caracteres, sem valor padrão.
- `WEB_ORIGIN`: já existente; origem confiável para CORS e proteção CSRF.
- `VITE_API_URL`: URL pública da API com `/api`, lida pelo Vite no `.env` da raiz; exige rebuild ao mudar em produção.
- `NODE_ENV`: já existente; usar `production` em produção.
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`: já existentes; somente DEV, senha de 8 a 128 caracteres.

`pnpm test` verifica auth existente, Decimal e limites HTTP do inventário sem exigir PostgreSQL. O teste de persistência/rollback/concorrência é opt-in com `TEST_DATABASE_URL` separado e migrations já aplicadas; sem essa variável aparece como SKIP. QA de navegador usa fixtures apenas no script de teste em `artifacts/operational-20261002/`. Consulte o relatório para distinguir testes locais de validação real do banco.

## Backups

ADMIN possui **Administração → Backups**: cópia completa manual, download e agendamento semanal ou mensal. Padrão mensal no primeiro dia às 02:00 (America/Fortaleza), retenção de 365 dias. Exige pg_dump/pg_restore compatíveis com a versão do PostgreSQL e uma pasta privada persistente. Configuração, recuperação e testes isolados: [docs/BACKUPS.md](docs/BACKUPS.md).
