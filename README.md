# Sistema de Estoque V2

Esta branch é uma reimplementação progressiva do sistema de estoque. A aplicação PHP/MySQL original permanece na branch `master` como referência funcional enquanto a V2 amadurece. Esta primeira fase entrega a base técnica, o domínio inicial e o shell visual. A autenticação está integrada. Cadastro/edição estão disponíveis como demonstração em memória; persistência e movimentações completas ficam para fases posteriores.

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

Revise `.env` antes de iniciar e preencha `JWT_SECRET` com um segredo aleatório de pelo menos 32 caracteres (por exemplo, gerado com `openssl rand -hex 32`). Os valores do exemplo são exclusivos do desenvolvimento local. O seed cria `admin@example.local` com a senha definida em `SEED_ADMIN_PASSWORD` no `.env.example` (`ChangeMe123!` inicialmente); troque-a ao configurar o ambiente. Nunca use essas credenciais em um ambiente compartilhado.

- Frontend: <http://localhost:5173>
- Health da API: <http://localhost:3000/api/health>
- Swagger: <http://localhost:3000/api/docs>

O health retorna `200` com `database: up` quando consegue consultar o PostgreSQL e `503` quando a conexão falha.

O comando `pnpm db:migrate` aplica a migration e gera o Prisma Client. O seed é pequeno e idempotente: cria um ADMIN, três categorias, três produtos e suas movimentações de saldo inicial. Rodar o seed novamente não altera saldos existentes; atualiza apenas o hash da senha do administrador identificado por `SEED_ADMIN_EMAIL`, usando Argon2id. O seed recusa execução em produção. Não há importação automática do banco legado.

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

Leia `AGENTS.md` antes de expandir a arquitetura ou o frontend. O diagnóstico do PHP está em `docs/legacy-diagnosis.md` e o estado da implementação em `docs/PROJECT_STATUS.md`. As telas operacionais usam exemplos de `apps/web/src/demo-data.ts` e cadastro/edição em memória para prévia visual. Ainda não existem consultas reais de produtos, cadastro persistente ou mutações de estoque. As telas privadas agora exigem uma sessão real; inicie a API e o PostgreSQL para acessá-las. A rota `/login` mantém os tokens e a identidade visual da aplicação.

## Autenticação

- `POST /api/auth/login`: `{ "email": "...", "password": "..." }`; retorna apenas `id`, `name`, `email`, `role`. E-mail é normalizado e credenciais inválidas ou conta inativa recebem o mesmo `401`.
- `GET /api/auth/me`: fonte de verdade da sessão; `401` para cookie ausente, JWT inválido/expirado ou usuário inexistente/inativo. Consulta o role atual no banco a cada requisição.
- `POST /api/auth/logout`: `204`, remove o cookie e funciona mesmo após a sessão expirar.

O JWT HS256 fica exclusivamente no cookie `stock_session`: HttpOnly, SameSite=Lax, Path=/ e duração de 8 horas. Secure é obrigatório em produção e para origens fora do HTTP de loopback. Em produção, use HTTPS e frontend/API no mesmo site (ou reverse proxy); a configuração Lax não atende sites independentes. Não há refresh token nem persistência de token/senha no navegador. Logout remove o cookie do navegador; esta versão usa JWT sem lista de revogação de sessões.

`WEB_ORIGIN` deve ser a origem exata do frontend, sem caminho/barra final. O CORS permite credenciais apenas para ela. Todos os métodos de escrita exigem o header `Origin` igual a `WEB_ORIGIN`, inclusive login/logout, para evitar CSRF. Clientes CLI e chamadas manuais devem enviar esse header. Em Swagger, a documentação está disponível; o Try it out de escrita requer que a documentação seja servida na origem configurada para o frontend (por reverse proxy). Não amplie a lista de origens para contornar essa proteção.

O login limita 8 tentativas por minuto/IP usando o armazenamento em memória do Nest Throttler, sem bloqueio de conta. O limite é por processo e reinicia com ele. O servidor não confia automaticamente em `X-Forwarded-For`; ao publicar atrás de proxy, configure explicitamente os proxies confiáveis no ambiente de implantação para preservar a identificação de IP. Helmet aplica os headers de segurança.

Para proteger um futuro controller, importe `AuthModule` no módulo da feature e use `@UseGuards(JwtAuthGuard)`; para RBAC, use `@UseGuards(JwtAuthGuard, RolesGuard)` e `@Roles(UserRole.ADMIN, UserRole.MANAGER)`, importando `UserRole` do Prisma gerado no backend. `@CurrentUser()` entrega apenas o usuário público. Nenhuma autorização de produto/estoque foi implementada nesta etapa.

O seed anterior usava bcrypt; como a V2 ainda não tinha autenticação funcional, o seed agora regrava a senha DEV em Argon2id. Execute `pnpm db:seed` ao atualizar uma base de desenvolvimento anterior. A conta DEV permanece `admin@example.local`; a senha vem de `SEED_ADMIN_PASSWORD` (o exemplo público é apenas local). Nunca utilize essa senha em produção ou ambiente compartilhado.

Variáveis de autenticação:

- `JWT_SECRET`: obrigatório, pelo menos 32 caracteres, sem valor padrão.
- `WEB_ORIGIN`: já existente; origem confiável para CORS e proteção CSRF.
- `VITE_API_URL`: URL pública da API com `/api`, lida pelo Vite no `.env` da raiz; exige rebuild ao mudar em produção.
- `NODE_ENV`: já existente; usar `production` em produção.
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`: já existentes; somente DEV, senha de 8 a 128 caracteres.

`pnpm test` verifica DTOs, Argon2id, login/cookie, sessão inválida/expirada, inativação, RBAC, logout, CORS, Origin, Swagger e rate limit por HTTP, com repositório de usuários isolado e sem exigir PostgreSQL. Não havia infraestrutura de testes frontend; não foi adicionada uma nova stack. Valide a UI com API/banco reais: acesso sem sessão, campos inválidos, senha errada, login, F5, `/login` autenticado, logout, rota privada bloqueada e usuário desativado. Verifique desktop/mobile e feedback de servidor indisponível.
