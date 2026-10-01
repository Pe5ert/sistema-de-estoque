# Sistema de Estoque V2 — guia para continuar o projeto

Atualizado em **01/10/2026**, após a correção pontual da imagem do produto. Este arquivo reúne as regras permanentes, a configuração e o estado verificado da checkout. Deve ser lido antes de continuar em outro notebook ou em uma nova conversa.

## 1. Contexto, repositório e continuidade

- Repositório: `https://github.com/Pe5ert/sistema-de-estoque.git`.
- Branch de trabalho: `sistema-de-estoque-v2`.
- O PHP/MySQL legado está em `master`, como referência funcional. A V2 é uma reimplementação progressiva; não copiar automaticamente a estrutura antiga.
- Checkout na máquina de origem: `C:/Users/Office Estagio 3/Documents/Workspace/sistema-de-estoque-v2`. O projeto **não** é RoboSimplesn, mesmo que a conversa tenha sido aberta naquele workspace.
- No outro notebook, o diretório pode ser diferente. Confirmar `git rev-parse --show-toplevel`, branch e `git status --short` antes de editar.
- O nome usado para instruções automáticas do agente é **AGENTS.md**, na raiz. Manter este arquivo como guia principal, evitando uma segunda cópia divergente em `agent.md`.
- Na conferência de 01/10/2026, HEAD e a referência local `origin/sistema-de-estoque-v2` apontavam para `0e665c8` (`feat: iniciar V2 do sistema de estoque`), mas os refinamentos de frontend, formulários, SVGs, relatórios e artifacts estavam modificados/não rastreados. Isso é um registro da conferência local, não uma confirmação atual do servidor remoto.
- **Uma nova clonagem só recebe o que foi commitado e enviado.** Para transportar o estado descrito aqui, revisar, commitar e enviar também os arquivos novos e este guia na branch V2. Nunca concluir que um push aconteceu só porque a branch existe.
- O Git não transporta `.env`, dependências, dados em memória da demonstração, banco local ou o histórico desta conversa. Este guia permite retomar o projeto sem depender da conversa anterior.

## 2. O que existe hoje

A V2 tem base técnica e um frontend interativo de demonstração. Ainda não é um sistema de estoque completo com persistência e usuários autenticados.

| Área | Estado atual |
| --- | --- |
| Visão geral | Saldo agregado, atenção, reposição e atividade recente com exemplos locais |
| Produtos | Tabela, busca por nome/SKU, filtros, thumbnails, detalhe em dialog e acesso ao cadastro/edição |
| Novo Produto | Formulário dedicado; salva somente na memória da sessão |
| Editar Produto | Mesmo formulário; mantém o saldo atual, sem editar estoque |
| Imagem principal | Selecionar/arrastar, validar arquivo, preview, trocar e remover; sem upload real |
| Movimentações | Localiza SKU/barcode e calcula prévia de entrada/saída; não grava movimento nem saldo |
| Histórico | Sete registros fictícios, saldos antes/depois, motivo, autor e filtro por tipo |
| API | Nest, configuração, Prisma, health e Swagger; sem endpoints de cadastro/movimentações/login |
| Banco | Schema, migration inicial e seed escritos; execução com PostgreSQL real ainda pendente |
| Login | Outro desenvolvedor está trabalhando nessa área; coordenar antes de alterar autenticação |
| Atualização automática | Cadastro/edição atualizam a apresentação na mesma sessão; sem sincronização entre abas/usuários |

O catálogo inicial tem **7 produtos, 478 unidades, 2 produtos com estoque baixo e 1 sem estoque**. São exemplos, não métricas de operação real. O seed de banco tem outros 3 produtos; não confundir os dois conjuntos.

## 3. Arquitetura e mapa de arquivos

- Monorepo pnpm, sem Turborepo: `apps/web`, `apps/api`, `packages/shared`.
- Backend como monólito modular REST. Sem microsserviços, filas, CQRS complexo, frameworks genéricos de CRUD ou abstrações sem uso concreto.
- Não importar Prisma Client no frontend nem código Nest em `shared`.
- Entender o domínio antes de criar CRUD. Separar apresentação de demonstração dos contratos persistentes futuros.

| Arquivo/pasta | Responsabilidade |
| --- | --- |
| `apps/web/src/main.tsx` | StrictMode, QueryClientProvider e BrowserRouter |
| `apps/web/src/App.tsx` | Shell, navegação/sidebar, rotas, painel, movimentações e histórico |
| `apps/web/src/Products.tsx` | Catálogo, filtros por URL, dialog de detalhe e links de edição |
| `apps/web/src/ProductForm.tsx` | Cadastro/edição, foco, cancelamento, submit e salvar/criar outro |
| `apps/web/src/ProductImageField.tsx` | Validação/seleção/drop e ações da imagem principal |
| `apps/web/src/product-form-model.ts` | Valores padrão, unidades, parsing decimal e validação Zod |
| `apps/web/src/form-controls.tsx` | Field, associações acessíveis e controle de quantidade |
| `apps/web/src/catalog.tsx` | DemoCatalogProvider, estado em memória e URLs de imagem da sessão |
| `apps/web/src/MovementWorkbench.tsx` | Consulta SKU/barcode e prévia de movimento |
| `apps/web/src/inventory-ui.tsx` | Identidade/thumbnail, status, indicador de estoque e delta |
| `apps/web/src/demo-data.ts` | Produtos e movimentos fictícios, tipos de apresentação e status |
| `apps/web/src/styles.css` | Tokens, layout, componentes e responsividade |
| `apps/web/public/products/` | SVGs locais de cabo, mouse, teclado e hub |
| `apps/api/src/` | Bootstrap Nest, configuração, Prisma, health e filtro de erros |
| `apps/api/prisma/` | Schema, migrations e seed |
| `apps/api/prisma.config.ts` | Configuração Prisma 7, caminhos e carregamento do `.env` da raiz |
| `packages/shared/src/index.ts` | Tipos/enums independentes de framework |
| `docs/` | Diagnóstico do legado, estado do projeto e direção/relatórios visuais |
| `artifacts/` | Prints, relatórios e scripts/evidências de QA de cada rodada |

## 4. Ambiente, dependências e configuração

Os arquivos de configuração e `pnpm-lock.yaml` são a fonte de verdade. Não atualizar versões ao configurar outro notebook sem uma tarefa específica para isso.

| Item | Configuração da checkout |
| --- | --- |
| Node | `>=22.13 <23`, conforme `package.json`; usar Node 22 compatível |
| Gerenciador | `pnpm@11.24.0`, fixado em `packageManager` |
| Frontend | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4 via plugin Vite |
| Interface/formulários | React Router 7, React Hook Form 7, Zod 4, Lucide; TanStack Query 5 disponível |
| Backend | NestJS 11, Prisma/Client/adapter-pg 7.10.0, pg, bcryptjs, tsx |
| Banco local opcional | PostgreSQL 17 Alpine em Docker Compose |
| Frontend | Porta Vite 5173; script dev usa `--host 0.0.0.0` |
| API | Porta padrão 3000; prefixo global `/api` |
| Banco | Porta publicada 5432; volume Docker `postgres_data` |

### Arquivos de configuração

- `pnpm-workspace.yaml`: inclui `apps/*` e `packages/*`; permite scripts de build de Prisma/engines/esbuild, bloqueia `@scarf/scarf` e contém exceções específicas de idade de publicação. Preservar essas escolhas; não liberar todos os scripts indiscriminadamente.
- `apps/web/vite.config.ts`: plugins React e Tailwind; porta 5173. Atualmente sem proxy/API URL configurada, porque os fluxos usam memória local.
- TypeScript: `strict: true` nos três pacotes. Web usa ES2022, ESNext/Bundler, JSX React, `noEmit`; API usa ES2022/CommonJS, decorators/metadata, saída `dist`; shared emite JavaScript CommonJS e declarações. Build da API desliga source maps.
- `eslint.config.mjs`: recomendações JS/TypeScript; ignora `dist`, código gerado e `node_modules`.
- `.prettierrc.json`: aspas simples e `trailingComma: all`. Sem script de format global; evitar reformatar arquivos inteiros fora do escopo.
- `.gitignore`: ignora `node_modules`, `dist`, coverage, `.env`/variantes reais, Prisma gerado e `*.tsbuildinfo`; mantém `.env.example` versionável.
- Prisma Client é gerado em `apps/api/src/generated/prisma`, formato CommonJS, com adaptador PostgreSQL. Não editar nem versionar o código gerado.

### Variáveis de ambiente

Usar `.env.example` para criar **um novo `.env` local na raiz**. Não copiar senhas/tokens da máquina anterior para este guia ou para commits. Não exibir `.env` real em logs ou respostas.

| Variável | Uso/regra |
| --- | --- |
| `DATABASE_URL` | Obrigatória para Prisma/API; URL começando com `postgresql://`, banco e credenciais locais |
| `API_PORT` | Inteiro entre 1 e 65535; padrão 3000 |
| `WEB_ORIGIN` | URL permitida no CORS; exemplo local `http://localhost:5173` |
| `NODE_ENV` | `development`, `test` ou `production`; padrão `development` |
| `POSTGRES_USER` | Usuário do contêiner PostgreSQL local |
| `POSTGRES_PASSWORD` | Senha local do PostgreSQL; criar valor próprio para ambientes compartilhados |
| `POSTGRES_DB` | Nome do banco local; exemplo `stock_v2` |
| `SEED_ADMIN_EMAIL` | Email do administrador de desenvolvimento criado pelo seed |
| `SEED_ADMIN_PASSWORD` | Senha do seed, mínimo 8 caracteres; gerar valor próprio |

Nest lê `../../.env` e `.env` a partir da aplicação; Prisma/seed carregam o `.env` da raiz. Executar os comandos pelo pnpm na raiz para manter os caminhos coerentes. Não há variável `VITE_*` exigida pela demonstração atual.

## 5. Abrir em outro notebook

### Somente frontend — caminho recomendado para continuar o visual

Com Git, Node 22 compatível e pnpm 11.24.0 disponíveis, após confirmar que a origem recebeu os commits desejados:

```powershell
git clone --branch sistema-de-estoque-v2 --single-branch https://github.com/Pe5ert/sistema-de-estoque.git sistema-de-estoque-v2
Set-Location sistema-de-estoque-v2
git status --short
pnpm install --frozen-lockfile
pnpm dev:web
```

Abrir `http://localhost:5173`. Esse modo **não exige Docker, PostgreSQL ou `.env`**. Não instalar banco/Docker no notebook da empresa apenas para visualizar/refinar telas. Não transportar `node_modules`; instalar usando o lockfile.

Se já houver checkout local, conferir branch e alterações antes de atualizar. Não clonar sobre uma pasta com trabalho existente nem descartar mudanças para fazer pull.

### API e banco — etapa opcional, ainda precisa de validação real

Somente em ambiente escolhido para desenvolvimento com banco. Criar `.env` sem sobrescrever um existente:

```powershell
if (-not (Test-Path -LiteralPath .env)) { Copy-Item -LiteralPath .env.example -Destination .env }
```

Revisar as variáveis/credenciais no editor antes de executar:

```powershell
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Health: `http://localhost:3000/api/health`; faz `SELECT 1`, retorna 200 com `database: up` ou 503 com banco indisponível.
- Swagger: `http://localhost:3000/api/docs`.
- Compose sobe apenas o PostgreSQL, não toda a aplicação; usa volume persistente e healthcheck `pg_isready`.
- Migration inicial: `apps/api/prisma/migrations/20260930000000_init/migration.sql`.
- Seed cria ADMIN, 3 categorias, 3 produtos e movimentos de saldo inicial, em transação. Upserts não atualizam dados existentes; não recria saldo inicial quando já há referência de seed ou saldo diferente de zero. Não importa o banco legado.
- `pnpm db:migrate` usa `prisma migrate dev`, próprio de desenvolvimento. Não executar contra banco de produção por conveniência.
- `pnpm db:generate`, typecheck e build geram o Client; isso **não** comprova conexão, migration, seed ou persistência.

### Comandos disponíveis na raiz

| Comando | Finalidade |
| --- | --- |
| `pnpm dev:web` | Prévia frontend com recarga |
| `pnpm dev:api` | API com tsx watch |
| `pnpm dev` | API + web usando concurrently |
| `pnpm lint` | ESLint em apps/packages |
| `pnpm typecheck` | TypeScript dos pacotes; API gera Prisma Client |
| `pnpm build` | Builds dos pacotes; web gera `apps/web/dist` e API gera Client/dist |
| `pnpm test` | Testes disponíveis; hoje validação de configuração da API |
| `pnpm db:generate` | Gerar Prisma Client |
| `pnpm db:migrate` | Migration de desenvolvimento + geração do Client |
| `pnpm db:seed` | Seed mínimo de desenvolvimento |

Typecheck/build exigem `DATABASE_URL` para a configuração Prisma: criar `.env` local pelo exemplo mesmo sem banco instalado. A geração não exige um banco acessível. O frontend isolado continua dispensando `.env`.

## 6. Domínio e regras de estoque

- `Product.stock` é **saldo materializado**, nunca campo editável pela UI ou por `PATCH /products/:id`.
- Toda mudança real deve criar `StockMovement` com produto, autor autenticado, tipo, quantidade, motivo, saldo anterior e saldo resultante.
- Usar transação e proteção contra concorrência ao gravar movimentos e saldo. Validar saldo e quantidade; não apagar movimentos para desfazer operações, preservar auditoria.
- Produto é desativado por padrão, não excluído fisicamente. As relações com produto/categoria/usuário usam `onDelete: Restrict`.
- Schema atual: `User`, `Category`, `Product` e `StockMovement`, IDs UUID, datas de criação/atualização quando aplicáveis.
- Valores monetários no banco: `Decimal(18,2)`; estoque/mínimo/quantidade/saldos de movimento: `Decimal(18,3)`. Não levar cálculos financeiros reais para ponto flutuante de apresentação sem contrato adequado.
- SKU obrigatório e único; barcode opcional e único, conceito separado. Categoria é relação obrigatória; não é texto livre no banco.
- Papéis: `ADMIN`, `MANAGER`, `OPERATOR`.
- Unidades: `UNIT`, `BOX`, `PACK`, `KG`, `G`, `LITER`, `ML`, `METER`.
- Tipos de movimento: `ENTRY`, `EXIT`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`.
- Motivos: `PURCHASE`, `SALE`, `INTERNAL_USE`, `RETURN`, `LOSS`, `INVENTORY_ADJUSTMENT`, `OTHER`.
- API atual: ValidationPipe global com whitelist/transform, CORS pelo `WEB_ORIGIN`, shutdown hooks e filtro de erros com status/message/path/timestamp. Não prometer autorização ou endpoints que ainda não existem.

### Diferenças que precisam ser resolvidas na integração

- UI usa categoria pelo nome e unidades curtas (`un/cx/pct/kg/g/l/ml/m`); API precisará de IDs de categoria e mapeamento para os enums acima.
- Custos/venda são opcionais e podem ser `null` na UI, mas o schema Prisma atual os exige. Definir o contrato antes de integrar; não preencher preços fictícios silenciosamente.
- Schema atual não tem campo de imagem nem storage. `imageUrl`/File/URLs temporárias são apresentação, não contrato de upload pronto.
- IDs dos exemplos em memória são os próprios SKUs; novos produtos recebem UUID. Não tratar IDs de demonstração como IDs persistidos.
- UI compara SKU sem distinguir maiúsculas/minúsculas; a unicidade correspondente precisa ser definida na API/banco. Barcode é comparado exatamente. Não deduzir uma regra de unicidade cruzada entre SKU e barcode.
- `initialEntry` é metadado da demonstração, não atributo de saldo nem movimento gravado. Na integração, entrada inicial deve respeitar o mesmo domínio transacional de inventário.

## 7. Padrões do frontend e identidade visual

- Produto operacional de estoque, em português, com leitura densa e clara. Preservar o que já foi refinado; não reconstruir tudo em cada rodada.
- Base grafite escura, azul cobalto como identidade, laranja contido em atenção, verde para disponibilidade e vermelho para estoque zerado/saídas. Não voltar ao tema claro amarelo das primeiras telas.
- Painel assimétrico com saldo dominante, atenção, atividade e reposição. Tabelas são centrais; evitar parede de cards equivalentes, gráficos decorativos, mapas/métricas inventadas e CRUD genérico.
- Sidebar desktop de 204 px, grupos Painel/Operação, estado ativo azul e traço vertical. Mobile usa navegação com foco, Escape e bloqueio do conteúdo de fundo enquanto aberta.
- Uma superfície útil para organização pode permanecer. Não remover caixas/divisores à força nem criar um card por campo.
- Tokens centralizados em `styles.css`; não espalhar cores de interface nos componentes. Principais: background `#151820`, surface `#20242e`, accent `#4162ed`, success `#a5d88d`, warning `#ffb17d`, danger `#ff9696`, info `#a7b8ef`.
- Fonte Arial/Segoe UI/system sans-serif; números tabulares; radius 4 px; ritmo 4/8/12/16/24 px. Títulos 30–38 px, seções 15–24 px, tabelas 12–13 px e metadados 11 px. Sem sombra em superfícies comuns; detalhe sobreposto pode ter sombra.
- Cor nunca é o único indicador de estado: manter texto, sinal, quantidade e rótulo. Preservar contraste, labels associados, foco visível, mensagens inline e feedback honesto.
- Desktop prioritário; no mobile reorganizar a informação sem overflow horizontal. Não apenas comprimir a tabela.
- Referências anteriores orientam decisões concretas: Maruf/Inventory azul-laranja para identidade/assimetria; IronNest para organização/sidebar; tabela verde para thumbnails + nome/SKU/densidade. Referências de formulários (Basit, Muhammadullah, ERP) orientam fluxo/agrupamento/densidade, **não** a troca da identidade atual.
- Imagens de referência originalmente anexadas à conversa têm caminhos privados da máquina de origem e não são garantidas na clonagem. Usar `docs/frontend/DESIGN.md` e os artifacts versionados como orientação portátil.

### Rotas e comportamento

| Rota | Tela |
| --- | --- |
| `/` | Visão geral |
| `/products` | Catálogo; query params `q`, `category`, `stock` |
| `/products/new` | Novo Produto |
| `/products/:id/edit` | Editar Produto da sessão |
| `/movements` | Consulta e prévia de entradas/saídas, mais registros fictícios |
| `/history` | Histórico com filtro local de tipo |

- Catálogo: thumbnail, nome/SKU/categoria, saldo, mínimo, preço quando informado e situação. Busca por nome/SKU; filtros locais por categoria e estoque. Valores de `stock` na URL: `success`, `warning`, `danger` ou `attention` (baixo/zerado). Detail usa `<dialog>`, Escape, foco e link para edição.
- Situação atual: saldo zero = Sem estoque; saldo positivo até o mínimo inclusive = Estoque baixo; acima do mínimo = Em estoque.
- StockMeter marca o mínimo no meio da escala; não é porcentagem de ocupação do depósito.
- DemoCatalogProvider mantém produtos em memória. Cadastro/edição refletem imediatamente no catálogo, painel e consulta local; ao recarregar ou abrir outra aba, os exemplos retornam. Não há localStorage, sessão persistida ou API de produtos nesse fluxo.
- Histórico/atividade/contadores de movimentos usam a lista estática de exemplos. Não passam a registrar alterações de produto ou prévias de movimento.

## 8. Formulário de produto — preservar as decisões atuais

- Página dedicada para cadastro/edição, sem wizard. Grupos semânticos: Identificação, Comercial, Controle de estoque e Detalhes opcionais.
- Código de barras físico é opcional e abre o cadastro com aparência preparada para scanner de teclado. Enter segue para Nome; isso não significa integração com hardware/API.
- Nome, SKU, Categoria e Unidade são obrigatórios. Nome tem mais peso visual; SKU é interno e pode existir sem barcode. Barcode/SKU até 80 caracteres; Nome até 200.
- Tab: barcode → Nome → SKU → Categoria → Unidade → ação da imagem → Comercial/Estoque. Enter no SKU segue para Categoria; demais inputs não submetem prematuramente. Edição começa com foco em Nome.
- Categoria é select nativo com as categorias do catálogo; unidades curtas têm labels em português. Não adicionar tax/account/supplier/wizard apenas porque estavam nos screenshots de referência.
- Preços opcionais: custo e venda próximos; exibir R$ e duas casas na edição. Inputs de números são texto com `inputMode="decimal"`, sem máscara durante digitação.
- Parsing aceita vírgula/ponto decimal e agrupamento monetário pt-BR conforme `parseDecimal`; no máximo 2 casas para preços, 3 para quantidades/mínimo. Valores negativos/inválidos não são aceitos pelo parser; entrada inicial precisa ser maior que zero.
- Mínimo é configuração de reposição. Saldo nunca é editável. Novo cadastro pode preparar entrada inicial com quantidade e motivo fixo Estoque inicial; o produto ainda nasce com saldo zero. Edição mostra saldo somente para consulta e preserva a entrada preparada.
- Salvar produto é primário; Salvar e criar outro é secundário; Cancelar é discreto. Barra sticky compacta; campos/erros focados devem ficar acima dela. Ajuste de rolagem por mouse ocorre depois do clique, para não quebrar a abertura de Detalhes.
- Cancelar com preenchimento pede confirmação inline; continuar mantém o rascunho. Há proteção nativa de saída/reload com alterações pendentes.
- Erros inline preservam valores e focam o primeiro erro na ordem visual. Duplicidade SKU/barcode é conferida na sessão; submit tem trava contra repetição e estado Salvando.
- Salvar e criar outro limpa item, códigos, preços, mínimo, entrada, descrição e imagem; fecha Detalhes; mantém apenas categoria/unidade e retorna o foco ao barcode após o reset.

### Imagem — última correção aprovada

- A imagem é **apoio à identificação**, dentro da mesma seção, ao lado de Nome/SKU e Categoria/Unidade no desktop. Barcode permanece na primeira linha. Sem título/painel independente ou hero de imagem.
- Preview desktop de 104 × 96 px em faixa de apoio de 132 px; mobile de 76 × 70 px, após os campos de identificação. Usar `object-fit: contain`.
- Sem imagem: um botão compacto Adicionar imagem, ícone discreto, sem grande área vazia. Com imagem: Trocar e Remover discretos; sem toolbar, crop, galeria, zoom ou editor.
- Aceita um JPG, PNG ou WEBP até 5 MB e valida decodificação via `createImageBitmap`. Seleção/drop/replacement/removal funcionam apenas localmente.
- Formulário e provider possuem URLs temporárias distintas e as revogam ao substituir/remover/desmontar. Preservar proteção contra resultado atrasado de seleção; não armazenar base64 nem vazar object URLs.
- Thumbnails do catálogo/detalhe têm fallback para imagem ausente/quebrada. Não mostrar sucesso de upload para servidor: upload real ainda não existe.
- A correção de imagem teve somente 3 arquivos de implementação e 20 inserções/20 remoções. Não reverter melhorias legítimas do barcode, ações, estoque ou foco para restaurar a imagem.

## 9. Fluxo de movimentações

- Localizar por SKU (comparação sem distinguir caixa) ou barcode exato da sessão. Se um código corresponder ao barcode de um produto e SKU de outro, exibir opções para escolha explícita.
- Após localizar: quantidade, Entrada/Saída, motivo, prévia e próximo produto. Quantidade positiva, até 3 casas; unidade acompanha o produto.
- Prévia calcula antes/depois e aponta saldo insuficiente quando a saída seria negativa; não grava estoque, movimento, autor ou histórico.
- Próximo produto limpa código, seleção, motivo e prévia, reinicia quantidade em 1, mantém Entrada/Saída e retorna à leitura.
- Não transformar feedback de prévia em confirmação de operação real. Ajustes aparecem no histórico de exemplos, mas o workbench atual só oferece Entrada/Saída.

## 10. Como trabalhar e validar

1. Ler este guia, a solicitação atual, `docs/frontend/DESIGN.md` para trabalho visual e os arquivos realmente envolvidos.
2. Conferir raiz/branch/status. Preservar alterações anteriores; distinguir diff da rodada de todo o trabalho ainda não commitado.
3. Em correções visuais, comparar estado atual e anterior usando Git ou snapshots/prints quando ainda não houver commit intermediário.
4. Fazer uma mudança focada, validar e continuar. Não usar uma correção pontual como autorização para outro redesign, mudança de backend ou novas features.
5. Rodar `pnpm lint`, `pnpm typecheck`, `pnpm build` quando houver alteração de implementação, e comportamento/testes relevantes. Não declarar PASS com erro. Atualização somente documental não exige reconstruir a aplicação.
6. Revisar visualmente desktop aproximadamente 1440 × 900, largura intermediária 1024 e mobile aproximadamente 390 px. Checar overflow, imagem vazia/preenchida, foco, barra sticky, erros, teclado e interações que mudaram.
7. Relatar o que mudou, o que foi preservado, arquivos/diff e resultado de validação. Não avançar para uma etapa diferente sem solicitação.

### Evidência já existente e limites

- Última correção de imagem: lint/typecheck/build e `git diff --check` PASS; **38 verificações UI PASS** com desktop/mobile, seleção/troca/remoção, formato inválido, Tab/Enter, saldo preservado, salvar/criar outro e imagem na edição da sessão.
- Relatório e prints: `artifacts/product-image-correction-20261001/REVIEW.md`; script/resultados em sua subpasta `qa/`.
- Rodadas anteriores: `artifacts/frontend-refinement-20261001/`, `artifacts/forms-20261001/`, `artifacts/product-polish-20261001/`. São histórico; scripts/assertions antigos podem esperar labels/foco anteriores e precisar de ajuste para novo estado.
- Scripts de QA em artifacts foram executados com Chrome/Playwright disponíveis fora do monorepo. Alguns contêm caminhos absolutos da máquina original. No outro notebook, adaptar executablePath e import de Playwright; não presumir que o runtime privado do Codex foi clonado nem que `pnpm test` executa esses scripts.
- A máquina original usou Node 24.19.0/pnpm 11.24.0 e exibiu aviso de engines; comandos passaram. Preferir a faixa Node 22 declarada no projeto no outro notebook. O build também apresentou avisos de comentários PURE da dependência Zod, sem erro de compilação.
- Testes de configuração, Client gerado e frontend validado não substituem teste com banco real. Docker/Compose, migration, seed e health com PostgreSQL acessível ainda precisam ser verificados.
- `README.md` e relatórios de rodadas anteriores descrevem fases anteriores em alguns trechos. Usar o código atual e este guia atualizado para diferenciar o que existe do que é futuro; preservar relatórios históricos como evidência.

## 11. Pendências discutidas — não implementar automaticamente

1. Publicar o estado local completo na branch V2 para que a outra máquina receba também os refinamentos e arquivos novos.
2. Validar migration, seed e health com PostgreSQL real em ambiente escolhido pelo usuário.
3. Integrar cadastro/edição à API, resolvendo contratos de preços opcionais, categorias, unidades e identificação.
4. Definir armazenamento/upload real de imagem principal, sem ampliar para galeria/editor por inércia.
5. Gravar movimentos/entrada inicial com transação, autor, proteção contra concorrência e auditoria; depois integrar histórico/painel reais.
6. Coordenar autenticação/autorização com o outro desenvolvedor.
7. Definir atualização entre usuários/abas após persistência; nenhuma abordagem de realtime foi escolhida.

Não há autorização automática neste checklist para alterar infraestrutura, instalar Docker no notebook da empresa, editar dados reais, implementar login ou executar todas as próximas etapas. Começar pela próxima solicitação concreta do usuário.
