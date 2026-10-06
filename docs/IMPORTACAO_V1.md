# Importação de produtos V1 — 06/10/2026

Entrada em **Produtos → Importar planilha** (`/products/import`). A V1 cria produtos novos; não atualiza cadastros existentes e não inicia o módulo Lavanderia/EPI.

## Fluxo e uso

1. Baixe o modelo CSV ou XLSX e preencha os produtos abaixo do cabeçalho.
2. Envie o arquivo, confira as sugestões de colunas e ajuste o mapeamento.
3. Para categorias desconhecidas/inativas/ambíguas, selecione uma categoria ativa ou escolha criar uma nova. A criação exige autorização explícita antes de validar.
4. Clique em **Validar e revisar**. Corrija todos os erros na planilha e envie novamente, ou ajuste o mapeamento. O relatório CSV informa linha, campo e erro.
5. Confirme somente um preview válido. O servidor revalida as condições atuais do catálogo e da conta.
6. Consulte o resultado na mesma URL ou na lista das suas últimas 20 importações. O parâmetro `job` permite retomar a operação após reload.

Nenhum produto, categoria ou movimento é criado durante upload/preview. Apenas a operação de importação e seus dados normalizados são persistidos nessa etapa. O preview mostra até 50 produtos, mas valida todas as linhas do lote. Os primeiros 50 erros aparecem na tela; o relatório inclui todos.

## Arquivos e valores

| Regra | Comportamento |
| --- | --- |
| Tipos | CSV UTF-8, com ou sem BOM; XLSX com exatamente uma aba preenchida |
| Separador CSV | Vírgula, ponto e vírgula ou tabulação, detectado pelo cabeçalho; separador ambíguo é rejeitado |
| Limites | 2.000 produtos, 5 MB enviados, 30 colunas e 10.000 linhas físicas |
| XLSX compactado | Até 20 MB efetivamente descompactados e 1.000 entradas ZIP; arquivos cifrados/inválidos são rejeitados |
| Cabeçalho | Colunas preenchidas, diferentes, até 120 caracteres; primeira linha preenchida |
| Campos obrigatórios | Nome, SKU, categoria e unidade |
| SKU/barcode | Texto, até 80 caracteres. Zeros e códigos longos são preservados. Código numérico no XLSX gera erro, mesmo se a exibição no Excel usar zeros |
| Decimais | Vírgula ou ponto, sem agrupamento de milhar, moeda ou notação científica |
| Estoque | Não negativo, até 3 casas decimais; mínimo/saldo inicial vazio vira zero |
| Preços | Não negativos, até 2 casas decimais; vazio permanece null |
| Unidade | UN, CX, PCT, KG, G, L, ML, M e seus nomes/enums correspondentes |
| Imagem | URL HTTP(S) opcional, validada pelas regras atuais de produto |
| Fórmulas | Nunca executadas. Aceita apenas resultado já calculado em texto/número; ausência de resultado, erro e referência externa são rejeitados |
| Categorias | Até 100 decisões explícitas por lote. Se exceder, divida a planilha |
| Linhas vazias | Ignoradas; erros usam o número da linha original |

Formatar como Texto **depois** de o Excel remover zeros/arredondar dígitos não recupera o original. A aplicação informa o problema e não tenta reconstruir o código. O modelo XLSX fornece colunas com formato Texto.

## Transação, saldo e recuperação

O lote inteiro roda em uma transação PostgreSQL, sem chamadas HTTP por produto. A criação em lote reutiliza DTOs de produto e o cálculo Decimal do domínio de estoque. Cada produto nasce com saldo zero. Saldos iniciais positivos geram `StockMovement` com `ENTRY`, **`INITIAL_STOCK`**, responsável da sessão, saldo anterior zero, saldo resultante e referência ao UUID da importação. Zero não gera movimento. Produtos existentes não são alterados.

O servidor confere novamente duplicidades, categorias ativas e permissão na confirmação. Constraints únicas de SKU/barcode são a última proteção contra cadastros concorrentes. As categorias utilizadas ficam bloqueadas para alteração durante a gravação. Uma falha desfaz produtos, novas categorias, movimentos e saldos do lote.

`ImportJob` contém autor, arquivo, datas, revisão, contagens, dados de revisão e resultado. Estados:

| Estado | Significado |
| --- | --- |
| PREVIEW | Lote em revisão; nenhuma escrita de catálogo |
| PROCESSING | Estado interno da transação de confirmação |
| COMPLETED | Resultado persistido e reutilizado em confirmações repetidas |
| FAILED | Falha após início da gravação; lote revertido, erro seguro e zero importados |

O lock `FOR UPDATE` no UUID da operação serializa confirmações simultâneas. Clique duplo, retry e resposta perdida reutilizam a mesma operação; não criam outro lote. A revisão evita confirmar um mapeamento antigo. Uma operação FAILED retorna o resultado da falha em novos retries; é necessário **Validar e revisar** para gerar uma nova revisão antes de tentar novamente.

PROCESSING está dentro da mesma transação e não fica visível em outra conexão antes do commit. Enquanto ela roda, a UI mostra **Importando lote…**. Se o processo cair antes do commit, o PostgreSQL desfaz a transação e a operação permanece PREVIEW; o mesmo UUID pode ser confirmado novamente com segurança. Não há fila ou worker externo.

Após timeout/desconexão, consulte primeiro o UUID da operação. COMPLETED já contém o resultado. Enviar o arquivo outra vez cria uma operação de preview diferente; códigos de produtos já importados serão recusados na confirmação.

## API e permissões

Todos os endpoints exigem sessão HttpOnly e ação central **`product.import`**. Regra provisória: ADMIN e MANAGER permitidos; OPERATOR bloqueado, inclusive por acesso direto. A conta/papel atual do banco é usado pelos guards; a confirmação revalida a permissão. Cada autor consulta e altera somente suas próprias operações.

| Método / rota sob `/api` | Uso |
| --- | --- |
| GET `/imports/template?format=csv\|xlsx` | Modelo autenticado, Content-Disposition attachment |
| POST `/imports` | Multipart com um campo file, até 5 MB |
| GET `/imports` | Últimas 20 operações do autor |
| GET `/imports/:id` | Preview atualizado ou resultado persistido |
| PATCH `/imports/:id` | `{ revision, mapping, categoryMappings }` |
| POST `/imports/:id/confirm` | `{ revision }` |

`mapping` associa campos a índices de coluna começando em zero. Não permite mapear a mesma coluna para campos diferentes. Decisões de categoria: `{ source, action: 'map', categoryId }` ou `{ source, action: 'create', name }`. Contratos ficam em `packages/shared/src/imports.ts`, sem dependência de Nest/Prisma.

Origin/CORS e autenticação existentes foram preservados. Importação não exige nova sidebar nem altera enums de movimentação. Mensagens de falha não expõem SQL ou credenciais. O relatório de erros neutraliza conteúdo que poderia virar fórmula ao abrir um CSV no Excel.

## Integração com a equipe

Branch de implementação: **feat/importacao-v1**, baseada em f6b486c. Mudanças mínimas de contrato: export de imports no shared, relação User.importJobs e enum/tabela ImportJob no Prisma. Coordenar a regra de `product.import` e esses arquivos com a frente RBAC **antes do merge**. Não presumir que a regra provisória é a definitiva.

Migration nova: `20261006000000_product_import`. Ela foi aplicada somente no PostgreSQL temporário de QA. **Não foi aplicada ao Neon compartilhado.** Não executar reset, seed ou migrate dev no banco compartilhado. Após revisão/integração da equipe e backup, aplicar `pnpm --filter @stock/api db:deploy` usando a conexão correta do ambiente. O código requer essa migration antes de utilizar a tela.

Para iniciar uma checkout já migrada: Node 22 compatível com package.json e pnpm 11.24.0, `pnpm install --frozen-lockfile`, `pnpm --filter @stock/shared build`, `pnpm db:generate` e `pnpm dev`. Configure DATABASE_URL, JWT_SECRET, WEB_ORIGIN e VITE_API_URL conforme README; nunca versionar os valores reais do .env.

Antes de commit: confira branch/status, selecione somente arquivos desta demanda, execute os gates e revise o diff. Evite git add . em uma checkout com trabalho alheio. Não fazer reset/rebase/force-push para resolver conflitos da equipe. O arquivo local docs/EQUIPE_ONBOARDING.md pertence a trabalho anterior e não foi alterado por esta demanda.

## Validação reproduzível

`pnpm test` inclui testes de parser/normalização/serviço e mantém os testes existentes. Testes reais de importação são opt-in: configure **TEST_IMPORT_DATABASE_URL** para banco local separado, com nome terminando em `_import_test`. O teste recusa outro host ou nome. Aplique migrations nesse banco antes de rodar; não usa DATABASE_URL/.env como destino dos dados de QA.

A suíte real cria somente fixtures identificadas por prefixo UUID e preserva o rastro de auditoria. Não limpa tabelas existentes. Use um banco temporário e descarte o ambiente após o teste.

Cobertura: 10/100/1.000 linhas em PostgreSQL, até 2.000 no parser, confirmações simultâneas/repetidas, persistência, auditoria Decimal, rollback após escritas reais, duplicidades antes/depois do preview, constraint concorrente após validação, categoria inativada, Origin, sessão, papel atual, propriedade da operação, multipart e modelos. QA de tela e evidências: [REVIEW.md](../artifacts/importacao-20261006/REVIEW.md).

Gates aprovados: pnpm lint, pnpm typecheck, pnpm test, pnpm build, git diff --check. Foram 65 testes aprovados, incluindo os testes reais desta importação; suítes PostgreSQL antigas de backup/estoque não foram ativadas. Um bloqueio transitório de rename de metadata de backup no Windows foi reproduzido durante os gates e corrigido com retry limitado, sem remover o arquivo anterior; há teste de regressão. Build mantém avisos não impeditivos de Zod/chunk web. A validação física do leitor USB continua pendente e não faz parte desta entrega.

Dependências específicas fixadas no lock: [ExcelJS](https://github.com/exceljs/exceljs) 4.4.0, [csv-parse](https://csv.js.org/parse/options/) 6.1.0 e [yauzl](https://github.com/thejoshwolfe/yauzl) 3.2.0. XLS/XLSM, várias abas preenchidas, atualização de produtos existentes, importação parcial e fila assíncrona ficam fora da V1.
