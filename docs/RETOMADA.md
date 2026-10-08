# Retomar no outro notebook

Atualizado em 08/10/2026. Branch: `sistema-de-estoque-v2`.

Importação V1 e feedback operacional estão publicados. Concorrência do estoque validada em PostgreSQL local isolado com duas sessões, disputa comprovada pelo row lock, saídas inteiras/fracionárias, auditoria e dashboard. Leia [PROJECT_STATUS.md](PROJECT_STATUS.md) e [relatório de concorrência](../artifacts/concorrencia-20261008/REVIEW.md) para o estado atual; as evidências anteriores continuam históricas.

## Backups — nova funcionalidade

Área Administração → Backups exclusiva do ADMIN. Cópia completa manual + download e escolha semanal/mensal com horário, persistida em pasta privada. Padrão mensal no primeiro dia às 02:00; retenção 365 dias. Instalar/configurar ferramentas PostgreSQL compatíveis (Neon atual: 18), preservar o volume de BACKUP_DIRECTORY e ler [BACKUPS.md](BACKUPS.md). Caminhos de ferramentas e .env são locais, não viajam pelo Git. Um backup real inicial foi gerado nesta máquina sem modificar os dados do Neon.

## Estado entregue

- Frontend integrado à API: login, categorias, produtos, movimentos, histórico e dashboard.
- Polimento de controles, filtros, navegação por teclado, drawers modais e proteção de formulário com alterações.
- Dashboard usa contagem de produtos e movimentos, com alerta positivo quando não há reposição necessária.
- Último ajuste: ações do dashboard 12 px mais acima; cards mantêm a posição. Conferido em 1366 px e 390 px, sem overflow.
- Imagens de produto persistem por URL. Upload/storage e atualização entre usuários continuam futuros.
- Neon: projeto `sistema-de-estoque-dev`. Conexão e migrations validadas nesta máquina. A conexão foi definida somente no processo da API; não está transportada pelo Git.
- Lint, typecheck, testes e build passaram nas rodadas registradas. Concorrência real foi validada em 08/10: para repetir, `TEST_DATABASE_URL` deve apontar para uma base loopback separada terminada em `_stock_test`, já migrada.

## Atualizar uma checkout existente

Antes de atualizar, conferir alterações locais. Se houver trabalho não salvo no Git, preservá-lo antes do pull; não usar reset/clean para facilitar a atualização.

```powershell
git status --short
git switch sistema-de-estoque-v2
git pull --ff-only origin sistema-de-estoque-v2
pnpm install --frozen-lockfile
```

Para uma nova checkout:

```powershell
git clone --branch sistema-de-estoque-v2 --single-branch https://github.com/Pe5ert/sistema-de-estoque.git sistema-de-estoque-v2
Set-Location sistema-de-estoque-v2
pnpm install --frozen-lockfile
```

Usar Node `>=22.13 <23` e pnpm `11.24.0`, conforme package.json.

## Configuração privada e execução

Git não transporta `.env`, credenciais, banco nem dependências. Criar `.env` a partir de `.env.example` somente se não existir:

```powershell
if (-not (Test-Path -LiteralPath .env)) { Copy-Item -LiteralPath .env.example -Destination .env }
```

Preencher no editor `DATABASE_URL` com a conexão autorizada do Neon, `JWT_SECRET` com um segredo local e conferir `WEB_ORIGIN=http://localhost:5173`, `VITE_API_URL=http://localhost:3000/api` e `API_PORT=3000`. Não colocar credenciais em commits, screenshots ou relatórios. Não precisa instalar Docker/PostgreSQL local para usar Neon.

```powershell
pnpm db:generate
pnpm dev
```

Abrir `http://localhost:5173`. Conferir `http://localhost:3000/api/health`: deve retornar `status: ok` e `database: up`. O frontend operacional exige API/banco; iniciar só Vite não substitui a integração por dados fictícios.

No mesmo banco Neon, migrations já foram aplicadas; não executar reset ou seed para retomar. Se usar outro banco, revisar `docs/OPERATIONAL_INTEGRATION.md` antes de aplicar migrations. A conta do aplicativo é diferente do usuário PostgreSQL; usar o login existente, sem recriar usuários por conveniência.

## Continuidade do desenvolvimento

Ler `AGENTS.md`, `docs/OPERATIONAL_INTEGRATION.md`, `docs/frontend/DESIGN.md` e `docs/frontend/UI_INTERACTION_REVIEW.md`. Preservar identidade e composição atuais; fazer alterações pequenas conforme a próxima solicitação. Não editar saldo por PATCH, remover auditoria ou alterar auth por efeito colateral de ajustes visuais.

Próximas possibilidades discutidas, sem implementação automática: upload real de imagem, matriz de permissões, sincronização entre usuários e implantação contínua. Validação física do bipador, leitor de tela e expiração prolongada continuam pendentes.
