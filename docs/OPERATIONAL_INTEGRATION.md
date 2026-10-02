# Integração operacional — 02/10/2026

## Banco e ambiente verificados

Esta checkout foi atualizada do remoto até `7e6d463` antes das alterações. O auth existente foi preservado. O PostgreSQL configurado no `.env` não respondeu ao teste de conexão; a API estava desligada e faltavam `JWT_SECRET` e `VITE_API_URL`. O usuário não lembra a conexão de casa. Ao final, somente essas duas variáveis ausentes foram preenchidas localmente: segredo de sessão aleatório e URL da API de desenvolvimento. DATABASE_URL e demais valores existentes foram preservados; nenhuma senha/segredo foi exibida ou versionada.

Não foram instalados Docker/PostgreSQL no notebook da empresa, nem executados migration, seed, reset, DROP ou limpeza. **O código está integrado à API, mas persistência, migração, auth com banco e concorrência real ainda não foram validados neste ambiente.**

A API foi iniciada após completar as duas variáveis locais. Verificação real: `/api/health` retornou **503 / database: down** e `/api/auth/me` sem cookie retornou **401**. Isso confirma servidor e rejeição de acesso anônimo, não login/persistência com PostgreSQL.

### Retomar com acesso ao PostgreSQL

1. Atualize a branch com `git pull --ff-only origin sistema-de-estoque-v2`, após conferir alterações locais.
2. Use Node 22.13 até 22.x e pnpm 11; execute `pnpm install --frozen-lockfile`.
3. Preencha o `.env` local sem enviá-lo ao Git: `DATABASE_URL`, `JWT_SECRET` aleatório (mínimo 32 caracteres), `WEB_ORIGIN=http://localhost:5173`, `VITE_API_URL=http://localhost:3000/api` e demais chaves do `.env.example`. A conexão e as credenciais devem vir do ambiente autorizado; não deduzir senhas do exemplo.
4. Confira migrations existentes com `pnpm --filter @stock/api exec prisma migrate status`. Revise e execute as consultas **somente leitura** de `apps/api/prisma/preflight.sql` na base já existente. Se houver resultados, revisar os registros antes de migrar; nunca corrigi-los automaticamente.
5. Revise `20261002000000_operational_inventory/migration.sql`. Para aplicar migrations versionadas, use `pnpm --filter @stock/api db:deploy`. Não use `migrate reset`, nem aceite reset oferecido por `migrate dev`.
6. Reinicie API/Vite (`pnpm dev`) depois de alterar o ambiente. Confira `/api/health` com `database: up`; a documentação está em `/api/docs`.
7. Use uma conta existente. O seed é somente DEV, adiciona exemplos persistidos e atualiza o hash da conta DEV; **não é necessário para retomar uma base existente**. Não rodar automaticamente em banco compartilhado.
8. Execute o cenário manual ao final deste documento. Registre resultados reais antes de declarar o sistema validado.

### Migration nova

Adiciona `Product.imageUrl` nullable, torna custo/venda nullable, adiciona motivo `INITIAL_STOCK`, índice único de SKU sem diferenciar maiúsculas/minúsculas e constraints para quantidades/saldos/preços não negativos. Mantém os registros existentes. Duplicidades de SKU por caixa, valores negativos ou movimentos com quantidade zero impedem a aplicação das constraints; `preflight.sql` identifica esses casos. O índice de expressão e as constraints são mantidos pelo SQL versionado, não por `db push`.

## Auth e autorização

Login, cookie HttpOnly, JWT, `/auth/me`, logout, guards, Argon2id e tela de login não foram reimplementados. Todos os novos controllers usam `JwtAuthGuard`; o `OriginGuard` existente protege escritas. O autor vem de `CurrentUser`, nunca do body. Nesta etapa qualquer usuário autenticado pode cadastrar, editar e movimentar; regras específicas para ADMIN/MANAGER/OPERATOR permanecem uma decisão de produto.

A validação global agora também rejeita propriedades desconhecidas. Pipes de DTO explícitos preservam essa proteção em `tsx watch`, que não emite metadata. Assim `stock` no PATCH e `userId` no movimento retornam 400.

## Contratos e endpoints

Prefixo `/api`, credenciais enviadas por cookie. Decimal é serializado como **string decimal com ponto**, inclusive stock/quantity/preços; datas são ISO UTC. Valores nulos permanecem nulos; não inventar preço zero. DTOs limitam comprimentos, precisão, paginação e URLs HTTP(S).

| Área | Endpoint / comportamento |
| --- | --- |
| Categorias | GET/POST `/categories`, PATCH `/categories/:id`; nome, descrição, ativo; sem DELETE |
| Catálogo | GET `/products?page&limit&search&category&stockStatus&active`; busca nome/SKU/barcode, paginação e filtros no servidor |
| Situação de estoque | OUT: saldo ≤ 0; LOW: 0 < saldo ≤ mínimo; NORMAL: saldo > mínimo; ATTENTION: saldo ≤ mínimo |
| Situação de cadastro | `active=true` (padrão), `false` ou `all` |
| Produto | GET `/products/:id`, POST `/products`, PATCH `/products/:id`; PATCH não aceita stock nem initialEntry |
| Consulta de código | GET `/products/lookup?code=...`; SKU sem distinguir caixa ou barcode exato, somente ativos; códigos ambíguos exigem seleção na UI |
| Inventário | POST `/stock-movements`; productId, type, quantity, reason, reference?, notes? |
| Auditoria | GET `/stock-movements?page&limit&productId&type&reason&from&to&search`, GET `/stock-movements/:id`; mais recentes primeiro |
| Painel | GET `/dashboard/summary`; uma consulta agregada com saldo, cadastros ativos, situação, valor a custo, prioridades, atividade, contagens de hoje e entradas/saídas de 7 dias |

Produtos de categoria inativa não podem ser criados/movidos para ela; manter a categoria atual ao editar um produto existente é permitido. Produtos inativos não podem ser movimentados. Nome da categoria e barcode são únicos conforme as constraints; SKU também é único por caixa. Conflitos retornam 409, dados inválidos 400, inexistentes 404. A UI traduz erros HTTP e conserva os campos em falhas de gravação.

## Inventário e concorrência

Cadastro cria `stock=0`; `initialEntry.quantity` opcional cria ENTRY/INITIAL_STOCK na **mesma transação**. Falha na entrada inicial reverte também o produto. INITIAL_STOCK não é aceito no POST comum de movimento.

Cada movimento abre transação, executa `SELECT id FROM Product WHERE id = ... FOR UPDATE`, lê o saldo após obter o lock, calcula com Prisma Decimal, rejeita resultado negativo, grava movimento com autor/saldos e atualiza produto. O lock cobre apenas o produto movimentado e dura até commit/rollback. PATCH de dados também obtém esse lock para não concorrer com inativação/alteração do produto durante um movimento. Não há endpoints de edição/exclusão de movimentos.

O painel usa uma transação RepeatableRead para um snapshot consistente. Valor a custo soma stock × costPrice de produtos ativos com custo; produtos sem custo são explicitamente excluídos. Contagens do dia e gráfico usam `America/Sao_Paulo`; ajustes ficam nas contagens próprias e não entram nas barras ENTRY/EXIT. O total de quantidades soma unidades de diferentes tipos, como solicitado; não representa uma unidade física homogênea.

## Frontend e detalhes

React/TanStack Query substituem o catálogo em memória. Keys: `products`, `product`, `categories`, `movements`, `movement`, `dashboard`. Sucesso de mutação invalida essas queries; não há `window.location.reload()` para atualizar dados. Não existe atualização por WebSocket/polling entre usuários; as queries também revalidam conforme a política existente de TanStack Query.

Mantidos paleta, tipografia, sidebar, login e organização dos formulários aprovados. Produtos e histórico abrem por clique neutro ou Enter; botões internos continuam independentes. Drawer desktop permite selecionar outra linha. No celular é fullscreen, com foco contido, fundo inert e Escape/Fechar. Detalhes mostram os campos persistidos e movimentos recentes. Cadastro possui estado ativo no grupo opcional.

Imagem agora é URL HTTP(S) ou null persistida; Adicionar/Trocar/Remover continuam no espaço compacto. Arquivo local não é apresentado como upload concluído: sem storage, uma URL temporária de arquivo se perderia ao recarregar. Ausência/falha da imagem usa placeholder. Nenhum base64/BLOB é armazenado. Upload definitivo permanece fora desta rodada.

## Auditoria de mocks

- Removidos `apps/web/src/demo-data.ts`, `apps/web/src/catalog.tsx` e `DemoCatalogProvider`; nenhuma tela decide conteúdo por arrays locais de exemplo.
- Busca em `apps/web/src` e `apps/api/src` (excluindo Prisma gerado) por demo-data/DemoCatalogProvider/mock/fictício/demonstração/exemplo: sem ocorrências na aplicação operacional.
- **Testes HTTP** de auth/inventário usam repositórios/services isolados para validar sessão, DTOs e autoria sem banco. Não entram no build de produção.
- **QA de navegador** em `artifacts/operational-20261002/check.cjs` intercepta HTTP com fixtures para verificar layout/interações. `result.json` e prints são evidências de apresentação, não de PostgreSQL.
- **Seed DEV** em `apps/api/prisma/seed.ts` conserva exemplos persistidos, somente por execução explícita. Não é fallback do frontend e não foi executado nesta rodada.
- SVGs de `apps/web/public/products` são ilustrações antigas, mantidas como assets; não são associados automaticamente aos produtos reais.
- Documentos/prints/scripts anteriores permanecem como evidência histórica; menções antigas à demonstração não descrevem a fonte de dados atual.

## Testes e limites

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `git diff --check` são as verificações do workspace. A execução local usou Node 24.19.0 e produziu aviso de engine; a versão prevista continua Node 22.x. Build pode emitir avisos de annotations de dependência e bundle acima de 500 kB; não impedem geração.

Os 35 testes locais cobrem auth existente, Decimal exato, zero/negativo/limite/estoque insuficiente, mapeamento de duplicidades, endpoints protegidos, origem, sessão como autora, rejeição de stock/userId, precisão/URL/paginação e normalização de preços/quantidades do formulário sem perda de precisão. O runner de formulário reutiliza o tsx já instalado da API, sem uma nova stack. Esses testes **não comprovam** locks, rollback ou agregação em PostgreSQL.

`apps/api/src/inventory/postgres.spec.ts` é opt-in: informe `TEST_DATABASE_URL` de uma base **separada**, já migrada. Sem essa variável a suíte aparece como SKIP; a ausência de banco não deve virar aprovação do teste. Ela testa criação/edição/leitura, duplicidades de SKU/barcode, saída 100→80, autor, rollback do cadastro inicial inválido, duas saídas simultâneas de 8 com saldo 10 (uma 201/uma 409, saldo final 2), agregados reais e logout/login com dados preservados. Não reseta/apaga a base: mantém auditoria e inativa somente seus próprios fixtures ao terminar. `TEST_DATABASE_URL` nunca usa fallback para `DATABASE_URL`; conexões idênticas são recusadas. Prepare a base de teste fora desta execução e guarde suas credenciais localmente.

QA de navegador: `node artifacts/operational-20261002/check.cjs`, com `PLAYWRIGHT_MODULE` apontando para uma instalação autorizada de Playwright se não estiver no node_modules. Vite deve estar rodando; `QA_BASE_URL` opcional. `CHROME_PATH` opcional. Não adiciona dependência de browser à aplicação.

### Cenário manual pendente com banco real

Login → criar categoria → cadastrar produto com entrada inicial 100 → F5 → abrir drawer por linha → editar → F5 → saída 20 → saldo 80 → histórico 100→80 e autor correto → painel atualizado → logout → acesso privado bloqueado → login → dados preservados. Verificar também lookup barcode, URL/null, cadastro ativo/inativo, categoria inativa, erro de duplicidade e estoque insuficiente.

Não declarar essa validação concluída apenas por existir código ou por passar QA com fixtures.
