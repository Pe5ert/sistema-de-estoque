# GAVYO Estoque — contexto completo para continuidade em outra IA

Data de preparação: **23/10/2026**, America/Sao_Paulo. Linguagem do produto e da equipe: português do Brasil.

Este documento foi preparado a pedido do responsável pelo projeto para transferir contexto a outra IA. É um retrato com referências verificáveis, não autorização para executar todas as pendências. Leia a solicitação atual do usuário antes de agir. Diferencie implementação existente, validação passada, observação atual, hipótese e proposta.

## 1. Comece por aqui

Você está continuando o **GAVYO Estoque**, um produto existente de estoque para pequenas e médias empresas. Não está começando do zero e não deve reconstruí-lo por preferência de arquitetura ou aparência.

- Repositório: https://github.com/Pe5ert/sistema-de-estoque.git
- Branch de desenvolvimento: `sistema-de-estoque-v2`.
- Commit atual confirmado em 23/10: **`c8364eb45d3be066e42982b92d1ff9f33f5f75f2`**.
- Git remoto consultado por fetch: **0 commits de diferença entre HEAD e origin/sistema-de-estoque-v2**.
- Última entrega: `fix(inventory): proteger unidade apos movimentacoes`, publicada em 21/10.
- Checkout da máquina atual: `C:\Users\Office Estagio 3\Documents\Workspace\sistema-de-estoque-v2`.
- O diretório do chat é outro. Sempre conferir a raiz do Git antes de editar.
- Sistema operacional atual: Windows / PowerShell. Os caminhos absolutos desta máquina não são requisitos portáveis.
- Credenciais, configurações privadas e banco **não viajam pelo Git**. Este material não contém senhas, tokens, dumps nem conexões reais.

**Ponto de retomada recomendado:** a correção de unidade está pronta e publicada. A próxima rodada proposta é recuperação de dados/backups, com escopo aprovado antes de configurar destinos ou operar no banco compartilhado. Depois: criação idempotente de pedido, diagnóstico de desempenho e protótipos de UX.

## 2. Objetivo comercial e fronteiras

O produto busca controle simples, confiável e rastreável: localizar/cadastrar produtos, registrar entradas e saídas, acompanhar saldo, comprar mercadorias e realizar inventários. O diferencial pretendido é clareza operacional e suporte próximo, não quantidade de módulos.

Primeiro cliente potencial: **lavanderia industrial que vende e aluga EPI**. Estratégia: núcleo genérico de estoque reutilizável e módulo específico separado no futuro.

Ainda não entregar/promover como concluídos: locação completa, peças individuais, clientes/funcionários da lavanderia, lavagem, entrega/devolução, manutenção, descarte, extravio, ciclos por peça, financeiro, faturamento fiscal, múltiplos depósitos e multiempresa.

Antes do módulo EPI: entrevistar cliente sobre identificação das peças, venda versus aluguel, retorno, lavagem, responsabilidade, perdas, descarte, quantidade de usuários e tecnologia de etiquetas/leitores. Não inventar essas regras nem colocá-las no cadastro genérico por suposição.

## 3. Estado real e documentos contraditórios

O código atual prevalece para dizer o que existe. Documentos antigos registram fases intermediárias e devem ser lidos com suas datas.

- Login real, API e PostgreSQL estão integrados. Não é mais demonstração em memória.
- Fornecedores/compras estão integrados na V2. Não é necessário retomar a antiga branch isolada para usar o recurso.
- Upload real via Cloudinary existe. Não afirmar que fotos são apenas prévia local ou URL manual.
- Importação, inventário, compras e imagens têm migrations presentes. Notas de 15/10 registram aplicação das migrations pendentes no Neon com autorização e backup. Não reaplicar, fazer reset ou marcar migration só porque um parágrafo antigo diz “pendente”. Conferir o ambiente de destino.
- A falha de unidade do relatório de 20/10 foi corrigida no commit c8364eb. Não reabri-la como pendência sem achar regressão.
- Backups têm implementação e testes históricos, mas o ambiente normal mostrou falha de ferramentas em 21/10. Existência da tela ou de um dump antigo não prova recuperação operacional atual.
- O dossiê de 41 páginas usa base dc0466a, anterior à proteção de unidade. O relatório de mudanças de 7 páginas usa c8364eb e complementa o dossiê.

Há seções desatualizadas em AGENTS, PROJECT_STATUS, RETOMADA, contratos de compras/inventário e DESIGN. Preserve as regras permanentes e as evidências; use atualizações datadas/código para resolver diferenças. Uma consolidação documental é desejável, mas não foi feita como redesign desses documentos.

## 4. Arquitetura e ferramentas

Monorepo pnpm:

```text
apps/web       React 19 + Vite + TypeScript
apps/api       NestJS + Prisma + PostgreSQL
packages/shared enums, contratos e política de permissões
docs           contratos, decisões, implantação e continuidade
artifacts      relatórios e capturas de rodadas de QA
var/backups    arquivos privados locais; ignorados pelo Git
output         PDFs e outros materiais locais; não presumir versionamento
```

- Node declarado: `>=22.13 <23`. pnpm fixado: `11.24.0`.
- API usa Prisma 7.10.0 com adaptador PostgreSQL. Client gerado em `apps/api/src/generated/prisma`.
- Web: React Router, TanStack Query, React Hook Form, Zod, Lucide e CSS/tokens existentes. Há configuração Tailwind/Vite, mas não substituir CSS operacional por outra base sem motivo.
- **TanStack Query está instalado; TanStack Table não consta nas dependências web.** As tabelas existentes não exigem instalar Table para editar duas células.
- Gráficos usam implementação existente em SVG/CSS, com dados auditados. Não trocar biblioteca apenas por estética.
- Banco atual de desenvolvimento: Neon. Fotos: Cloudinary. Frontend/API normalmente iniciados no computador.
- Sem infraestrutura comercial implantada por esta sequência de trabalho.

## 5. Ambiente, inicialização e diagnóstico

Endereços normais esperados:

- Frontend: http://localhost:5173/
- Login: http://localhost:5173/login
- API: http://localhost:3000/api
- Saúde: http://localhost:3000/api/health
- Documentação Swagger: http://localhost:3000/api/docs

Último health consultado em 21/10: HTTP 200, banco disponível. **Não foi novamente testado em 23/10 durante esta preparação.** Revalidar processos e health antes de dizer “está rodando”. Não iniciar uma segunda instância se as portas já estiverem ocupadas.

Para checkout existente, primeiro verificar trabalho local. A atualização abaixo pressupõe que a branch já é a correta e não há conflito com alterações locais:

```powershell
git status --short
git branch --show-current
git fetch origin
git rev-list --left-right --count HEAD...origin/sistema-de-estoque-v2
# Somente depois de revisar o estado:
git pull --ff-only origin sistema-de-estoque-v2
pnpm install --frozen-lockfile
pnpm --filter @stock/shared build
pnpm db:generate
pnpm dev
```

Separado: `pnpm dev:api` e `pnpm dev:web`. Isso é servidor de desenvolvimento, não implantação de produção.

Configurar `.env` local autorizado conforme `.env.example` e validação em `apps/api/src/config/env.ts`. Vite lê o ambiente da raiz via `envDir: '../../'`. A configuração Prisma carrega o `.env` da raiz e usa **DATABASE_URL** como datasource. Não presumir que DIRECT_URL altere o destino do migrate; conferir `apps/api/prisma.config.ts`.

Variáveis relevantes, sem valores privados:

| Nome | Uso |
|---|---|
| DATABASE_URL | PostgreSQL da API e Prisma |
| API_PORT | Porta da API, padrão 3000 |
| WEB_ORIGIN | Origem exata autorizada, sem caminho/barra final |
| JWT_SECRET | Segredo local forte, mínimo de 32 caracteres |
| NODE_ENV | Ambiente; influencia cookies e execução |
| VITE_API_URL | Endereço público da API usado pelo frontend |
| CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET | Conjunto das três variáveis somente na API |
| BACKUP_DIRECTORY | Pasta privada persistente |
| BACKUP_DATABASE_URL / DIRECT_URL | Conexão de exportação, conforme serviço de backup |
| BACKUP_PG_DUMP_PATH / BACKUP_PG_RESTORE_PATH | Ferramentas PostgreSQL |
| BACKUP_AUTO_ENABLED / BACKUP_HOUR / BACKUP_TIME_ZONE | Padrões iniciais da agenda |
| BACKUP_RETENTION_DAYS / BACKUP_TIMEOUT_SECONDS | Retenção/timeout |

Nunca expor chaves em `VITE_`, copiar `.env` para documentos, usar segredo de exemplo em produção nem inventar credencial. Solicitar ao responsável configuração segura no destino quando necessário.

Problemas anteriores: processos de desenvolvimento paravam ao fechar sessão/terminal; um preview em outra porta não era o servidor normal visto pelo usuário. Nesta máquina há helper privado `var/backups/start-normal-server.ps1`; não presumir que exista em outra máquina. Reinício de serviços, armazenamento e deploy definitivo seguem pendentes.

## 6. Modelo de dados e invariantes

Modelos atuais: User, Category, Product, StockMovement, ProductImage, Supplier, PurchaseOrder, PurchaseOrderItem, PurchaseReceipt, PurchaseReceiptItem, ImportJob, PhysicalInventory e PhysicalInventoryItem. Conferir `apps/api/prisma/schema.prisma` antes de mexer.

Regras fundamentais:

1. `Product.stock` é saldo materializado. Nunca permitir edição direta pelo cadastro/PATCH.
2. Toda alteração de saldo cria StockMovement com produto, autor da sessão, tipo, quantidade, motivo e saldo anterior/resultante.
3. Movimentos e saldo são gravados em transação com row lock por produto. Não remover locks, transações ou validação Decimal.
4. Quantidades/saldos/mínimo: Decimal(18,3). Valores monetários: Decimal(18,2). Contratos transportam decimais como strings. Cálculos de compras no frontend usam escala inteira/BigInt; não substituir por ponto flutuante.
5. SKU obrigatório e único; barcode opcional e único. Não são o mesmo conceito. Existem proteções de unicidade na API/banco; SKU tem tratamento de caixa no domínio. Não inventar unicidade cruzada SKU versus barcode: lookup ambíguo exige escolha.
6. Categoria é relação por ID; não nome livre persistido. Imagens são opcionais. Preços podem ser null; não preencher custo fictício.
7. Inativar produto preserva relações e histórico. Não apagar movimentos para desfazer uma operação.
8. FKs/restrições do banco são parte da proteção; não removê-las para “facilitar”.

Unidades: UNIT, BOX, PACK, KG, G, LITER, ML, METER; UI: un/cx/pct/kg/g/l/ml/m.

Tipos: ENTRY, EXIT, ADJUSTMENT_IN, ADJUSTMENT_OUT. Motivos incluem INITIAL_STOCK, PURCHASE, SALE, INTERNAL_USE, RETURN, LOSS, INVENTORY_ADJUSTMENT, OTHER. Conferir enums compartilhados.

### Proteção de unidade — já concluída

- Após qualquer movimentação ou com saldo diferente de zero, unidade diferente é recusada por PATCH, HTTP 409.
- A mesma unidade pode ser enviada junto com edição de nome/preços/etc.
- Produto virgem, sem saldo/histórico, pode trocar unidade.
- Saldo voltar a zero não libera troca. Entrada inicial conta como movimento.
- Checagem transacional sob o mesmo FOR UPDATE usado pelos movimentos.
- GET de detalhe fornece `unitLocked` opcional, informativo e não persistido; servidor de escrita revalida independentemente da tela.
- Formulário mostra campo desabilitado e orientação. Não converte automaticamente nem repara unidades historicamente reinterpretadas.
- Casos concorrentes com primeira entrada foram testados em PostgreSQL real.

## 7. Autenticação e permissões

Autenticação existente: Argon2id, cookie JWT HttpOnly de oito horas, login/me/logout, validação de origem, limite de tentativas e guards. Cookie Secure em produção conforme config, SameSite Lax. Perfil e usuário ativo são consultados no banco; papel antigo de token não deve manter privilégio após mudança. Não refazer login como parte de UX.

Fonte da política: `packages/shared/src/permissions.ts`; consultar também helpers de inventário físico. Autorização precisa existir na API, não só ocultar botões.

| Ação | ADMIN | MANAGER | OPERATOR |
|---|---|---|---|
| Consultar dashboard, catálogo, histórico, custos/preços | Sim | Sim | Sim |
| Cadastrar produto, inclusive entrada inicial | Sim | Sim | Sim |
| Editar/inativar produto e gerenciar categorias | Sim | Sim | Não |
| Registrar entrada/saída comum | Sim | Sim | Sim |
| Ajustar estoque e importar | Sim | Sim | Não |
| Consultar fornecedores/pedidos/recebimentos | Sim | Sim | Sim |
| Gerenciar fornecedor/pedido e receber compra | Sim | Sim | Não |
| Abrir/preencher inventário | Sim | Sim | Sim |
| Concluir/cancelar inventário | Sim | Sim | Não |
| Backups | Sim | Não | Não |

OPERATOR pode cadastrar produtos por decisão explícita do usuário. Não retirar esse direito. Custos/preços continuam visíveis aos três perfis; qualquer mudança exige decisão de produto. Gestão completa de contas, recuperação e revogação individual de sessões ainda precisam de proposta; não estão prontas como módulo administrativo.

## 8. Catálogo, formulário e movimentações

Produtos: busca/filtros/ordenação/paginação remotos, thumbnails, saldo/mínimo/status, categorias e drawer. Estoque baixo é saldo positivo até o mínimo, inclusive; zero é sem estoque. StockMeter não é porcentagem de ocupação de depósito.

Formulário atual: começa pelo Nome; identificação → estoque → preços opcionais, foto/barcode opcionais. Não reverter para layouts antigos só porque um documento descreve barcode como primeiro campo. SKU explicado como código interno. Sem wizard novo por padrão.

Novo produto pode registrar entrada inicial na mesma transação. Edição exibe saldo apenas para consulta. Campos/erros preservam rascunho; foco no primeiro erro; duplicidades vêm da API. Salvar e criar outro limpa o novo item e mantém categoria/unidade conforme comportamento atual. Navegação interna/reload têm proteção de alterações não salvas.

Movimentação: localizar por SKU/barcode → identificar produto → quantidade/tipo/motivo → conferir saldo previsto → confirmar → próxima leitura. Bipador é leitor que digita como teclado e encerra com Enter. Não requer câmera por padrão. Leitor físico ainda não homologado.

Frontend oferece motivos contextuais a entrada/saída e limpa motivo incompatível ao mudar tipo. RETURN/OTHER e ajustes têm regras próprias; preservar contratos e permissões. Não dar confirmação antes de resposta real. Não repetir POST automaticamente após falha de rede. Row lock evita saldo negativo concorrente, mas não significa que toda movimentação avulsa tenha chave de idempotência.

## 9. Histórico, dashboard, pesquisa e atualização

Histórico real e paginado: produto, tipo, motivo, período, autoria, antes/depois, referência e detalhe. Filtro por productId precisa continuar identificado e removível na interface. PeriodSelector tem atalhos e período personalizado; limites do dia em São Paulo são tratados, inclusive casos históricos de horário de verão.

Dashboard: atenção/reposição, ativos, status, valor a custo, atividades, movimentos hoje, área interativa 7/30/90 dias, categorias e links para filtros reais. Conta registros/produtos onde indicado; **não somar kg, litros e unidades como uma quantidade física homogênea**. Falta de movimentos no período curto não comprova bug: conferir data/período.

Saldo do produto: série auditada própria da API, representação em degraus, inspeção por teclado/ponteiro e links ao movimento. Não construir série a partir de uma página recente. Se sequência inconsistente/ambígua ou acima de 5.000 movimentos, mostrar aviso e Histórico completo em vez de gráfico parcial enganoso.

Busca global na barra superior: produtos e funções; Ctrl K, teclado e Escape. Não inventar atalhos que não funcionam.

TanStack Query gerencia consulta/invalidação. Listas/painel têm revalidação periódica conforme implementação; não é WebSocket/realtime garantido. Refetch não deve desmontar formulário e perder rascunho. Cache antigo após falha deve ser identificado; reconectar refaz consultas, sem repetir mutações.

## 10. Importação de produtos V1

CSV UTF-8/XLSX; cria novos produtos, não atualiza cadastros existentes. Até 2.000 produtos e 5 MB; categorias ativas precisam existir. Modelo e validação tratam códigos como texto para preservar zeros/dígitos; fórmulas não são executadas.

Fluxo: baixar modelo → preencher arquivo → enviar → conferir erros por linha/campo → corrigir no arquivo original → reenviar → confirmar lote válido. Não reintroduzir editor de mapeamento/categorias na tela por preferência. Backend conserva contratos de compatibilidade que não significam nova UX aprovada.

Prévia mostra até 50 itens, mas valida o lote todo. Erros 20 por página e relatório completo. Conferência não grava catálogo/saldo; confirmação revalida permissões, categorias e duplicidades e grava tudo em transação. Estoque inicial positivo gera movimento INITIAL_STOCK com autor e referência da importação.

ImportJob preserva operação/revisão/autor/resultado. Confirmação repetida usa a mesma operação e não importa duas vezes. Depois de timeout, consultar o UUID antes de reenviar arquivo. Respeitar propriedade da operação; ADMIN/MANAGER importam, OPERATOR não.

## 11. Fornecedores, pedidos e recebimentos

Fornecedor tem nome obrigatório, contatos/documento opcionais e ativo/inativo; CPF/CNPJ normalizado único quando presente, sem alegar consulta cadastral oficial. Inativação preserva relações e impede novas operações conforme regra.

Pedido: fornecedor ativo → produtos por busca remota nome/SKU/barcode → quantidade/custo negociado → revisão → salvar rascunho. Até 100 produtos distintos. Custo obrigatório pode ser zero. Dinheiro exato com arredondamento por item. Não presumir custo negociado pelo preço cadastrado.

Estados: DRAFT → SENT → PARTIALLY_RECEIVED → RECEIVED; cancelamento permitido conforme estado. Envio é mudança de status **interna**: não envia e-mail e não movimenta estoque. Somente rascunho é editável, com revisão otimista.

Recebimento: solicitado, já recebido, quantidade desta entrega e pendente. Não ultrapassar pendente. Cada entrega gera entradas no estoque/histórico em transação; não atualiza custo cadastrado ou calcula custo médio. Cancelar preserva entradas anteriores e encerra restante. Snapshots de unidade nos pedidos e verificação de unidade ao enviar/receber permanecem.

**Recebimento já é idempotente:** UUID/payload/hash, trava advisory global, lock do pedido e dos produtos em ordem estável. Mesma tentativa equivalente retorna registro original; conteúdo diferente com UUID igual conflita. UI persiste tentativa em sessionStorage por usuário/pedido antes do POST, permite conferir/repetir após rede incerta e reload. Não remover isso.

**Criação do rascunho ainda tem risco:** trava de clique não deduplica uma nova tentativa depois de resposta perdida; POST de criação não tem a mesma proteção persistida. Achado de código, sem nova reprodução ponta a ponta de duplicação. Corrigir após reproduzir em ambiente isolado, preservando o recebimento.

Busca de fornecedor/produto já usa SearchCombobox e servidor; não carregar milhares de produtos para filtrar localmente. Cadastro de fornecedor em outra aba + atualização preserva formulário do pedido.

## 12. Inventário físico

Abrir por produtos ativos/todos ou categoria; conjunto fixado na abertura. Até 500 produtos, 25 por página, lotes de salvamento até 50 (podem reduzir por tamanho do payload).

- Vazio = não contado. Zero = contagem real zero. Nunca confundir.
- Salvar contagem não muda estoque. Rascunhos locais, valores salvos e autoria precisam ficar claros.
- Quantidade fracionária até três casas e precisão exata.
- Conclusão por ADMIN/MANAGER aplica diferenças em transação, com movimentos auditados; sem diferença não gera ajuste.
- Mudança de produto/estoque/unidade após abertura impede conclusão sem revisão/recontagem. Detecta inclusive entrada e saída que devolvam o mesmo saldo.
- Atualizar referências limpa só contagens afetadas conforme regra, preservando demais e observações.
- Edição concorrente usa revisão; não sobrescrever silenciosamente. UI permite comparar e decidir com confirmação.
- Conclusão repetida reutiliza resultado; não duplicar ajustes. Cancelamento arquiva sem mudar saldo; encerrados são consulta.
- Não há bloqueio prolongado de todas as movimentações enquanto inventário está aberto; organizar rotina operacional com cliente.

## 13. Imagens e recuperação

Upload real: uma foto JPEG/PNG/WebP, até 5 MB e 20 MP, sem animação; backend remove metadados/corrige orientação e gera WebP até 1600 px. Preview local não é sucesso de upload. Foto só é vinculada/removida do produto ao salvar.

Permissão/propriedade na API, claim/release sob transação e proteção de limpeza concorrente. Arquivos nunca anexados expiram em 24h; substituídos respeitam retenção de backup e referências ativas. Links existentes e fallback de imagem quebrada permanecem suportados. Não salvar base64/URL temporária como dado persistente.

Backups: somente ADMIN, arquivo privado, geração manual, download verificado/checksum, agenda semanal/mensal. Padrão mensal dia 1, 02:00 America/Fortaleza, retenção 365 dias. Agenda persistida prevalece sobre defaults de ambiente. Serviço precisa estar em execução e armazenamento persistente.

pg_dump/pg_restore devem ser compatíveis com versão do banco; Neon foi registrado como PostgreSQL 18. Uma ferramenta 17 não exporta servidor 18. QA local usou PostgreSQL 17, que não serve para concluir compatibilidade de exportação Neon.

Em 21/10, servidor normal mostrou falhas de backup por ferramentas indisponíveis. Não declarar isso resolvido. Configurar, gerar, verificar e restaurar em **banco novo isolado**, comparar dados e preservar original. Recuperação do banco não inclui arquivos do Cloudinary: dump contém referências/URLs. Planejar fotos, configuração, chaves e cópia fora da máquina/VPS.

Não há botão para sobrescrever banco em produção. Restore é administrativo, primeiro isolado. Não desabilitar verificações para fazer teste passar. Backups antigos válidos de migrations não provam que agenda atual funciona.

## 14. Direção visual aprovada e relação com o usuário

Preservar marca GAVYO Estoque, grafite/azul cobalto, **raio de 2 px**, tipografia existente e números tabulares. Tokens atuais em styles.css/appearance.css: fundo #191E27, superfícies próximas de #222833, azul identidade #5275FF; ações usam tokens próprios para contraste. Não substituir por valores históricos de 4 px em AGENTS.

Interface operacional: tabelas densas legíveis, hierarquia e informações úteis. Evitar template SaaS genérico, parede de cards, gradientes/sombras decorativos, bordas arredondadas grandes, explicações técnicas extensas e animação de números de estoque intermediários.

Sidebar tem grupos atuais e comportamento modal no mobile; não redesenhar sem justificativa aprovada. Scroll discreto já foi pedido. Tema claro/escuro existe. Motion breve e reduced-motion, sem atrasar scanner, repetir animação a cada refetch ou travar navegação até “sucesso animado”.

Compartilhados: DetailDrawer, ConfirmDialog, Alert, FeedbackProvider/Toast, Field/FieldError, DataState, Pagination, SearchCombobox, StatefulButton, TableSort/SortHeading, PeriodSelector, UnsavedForm e lock de scroll. Reaproveitar, não criar infraestrutura paralela.

O usuário se comunica informalmente e prefere execução concreta e mensagens claras em português. Valoriza:

- Ver o sistema como funcionário final, não só compilar.
- Ajustes visuais localizados, sem descaracterizar composição.
- Verificação na URL normal; houve frustração com mudanças feitas só em preview de outra porta.
- Procurar erros e listar evidências/severidade; não alegar cobertura total.
- Continuidade sem perguntas repetidas sobre o que já aprovou.
- Ao mesmo tempo, o plano mestre atual exige auditoria/propostas e aprovação por rodadas: não interpretar “continuar” como licença para implementar todo o roadmap.
- Links diretos para arquivos: citações especiais anteriores não ficaram visíveis; ele perguntou “cadê o PDF”. Entregar download/link Markdown explícito.

## 15. Mapa de telas e arquivos para se orientar

| Rota / tarefa | Arquivos principais |
|---|---|
| /login | auth/LoginPage.tsx, auth.tsx, UserSession.tsx |
| / | Overview.tsx, DashboardCharts.tsx, dashboard-model.ts |
| /products | Products.tsx, CategoryManager.tsx, inventory-api.ts |
| /products/new e /products/:id/edit | ProductForm.tsx, product-form-model.ts, ProductImageField.tsx |
| Detalhe de produto | DetailDrawer.tsx, inventory-ui.tsx, ProductStockChart.tsx |
| /movements | MovementWorkbench.tsx, History.tsx |
| /history | History.tsx, PeriodSelector.tsx, period-model.ts |
| /products/import | ProductImport.tsx, import-report.ts |
| /physical-inventories e /:id | PhysicalInventories.tsx, PhysicalInventoryDetail.tsx, physical-inventory-* |
| /suppliers, /new, /:id/edit | Suppliers.tsx, supplier-display.ts |
| /purchases, /new, /:id, /:id/edit | Purchases.tsx, PurchaseForm.tsx, purchases-api.ts, purchase-model.ts |
| /backups | Backups.tsx |
| Shell/busca/tema/feedback | App.tsx, GlobalSearch.tsx, Theme.tsx, feedback.tsx, styles.css |

Caminhos web relativos a apps/web/src. API organizada em auth, inventory, purchases, physical-inventories, imports, images, backups, prisma, config e common. Shared concentra enums, contratos e permissões.

Rotas REST principais sob /api: auth/login, auth/me, auth/logout, health, categories, products, products/lookup, products/:id/stock-history, stock-movements, dashboard/summary, imports, product-images, suppliers, purchase-orders, physical-inventories e backups. Métodos/payloads exatos nos controllers/DTOs e contratos; não inventar endpoint a partir deste resumo.

## 16. Migrations, banco e dados de demonstração

Migrations presentes no checkout verificado:

```text
20260930000000_init
20261002000000_operational_inventory
20261006000000_product_import
20261007000000_physical_inventory
20261008000000_suppliers_purchases
20261008010000_product_images
```

Não há migration nova para proteção da unidade. Aplicação das migrations existentes em outro destino exige conferir schema/histórico, revisar SQL e backup. `prisma generate` só gera Client; não comprova implantação. Commit/push também não aplica banco.

Dados DEMO foram criados em 20/10 no ambiente de desenvolvimento normal, **com autorização explícita do usuário**: 30 produtos DEMO-001..030, seis categorias, cinco fornecedores, seis pedidos e três inventários, além de quatro produtos anteriores. Alguns produtos inativos/baixo/zero, preços vazios e unidades diferentes são intencionais. Havia 34 produtos totais, 31 ativos, 6 baixos e 7 zerados nesse retrato; esses números não são garantidos futuros.

Isso não transforma Neon em banco descartável. Não rodar novamente o helper de população por conveniência nem apagar registros para screenshots. Não vender DEMO como dados homologados do cliente. Preservar produtos e histórico anteriores.

## 17. QA, testes e evidências

Gates usuais em mudanças de implementação:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Executar typecheck/build sequencialmente: ambos podem regenerar Prisma Client; já houve corrida ao executá-los em paralelo. Não chamar resultado parcial/erro de PASS. Mudança só documental não requer reconstrução completa.

Última entrega de unidade, 21/10:

- Lint, typecheck, build e diff aprovados.
- 91 testes API aprovados com estoque PostgreSQL isolado habilitado; 29 frontend aprovados.
- Execução separada de compras/recebimentos e inventário: 20 aprovados. Total das execuções: **140 testes aprovados**.
- Há integrações opt-in que não foram executadas (backup/restore, imagens, importação). Suites podem aparecer SKIP; ler relatório e log, não somar como sucesso.
- Estoque real: nove testes, incluindo dois novos de troca de unidade/concorrência; há subcasos dentro desses testes.
- UI no servidor normal em 1440×900, 1024×768, 390×844; zero com histórico continua bloqueado, cadastro novo habilitado, Tab pula campo bloqueado.
- Nenhuma gravação de produto no Neon na validação da correção; HTTP/SQL de escrita em bancos locais isolados.

Suites reais dependem de variáveis explícitas e validam destinos loopback/nome seguro. Exemplos de contratos (conferir arquivo antes de preparar):

| Variável | Ambiente de teste |
|---|---|
| TEST_DATABASE_URL | Banco loopback terminado em _stock_test; diferente do DATABASE_URL operacional |
| TEST_PURCHASE_DATABASE_URL | Banco loopback terminado em _purchases_test |
| TEST_PHYSICAL_DATABASE_URL | Banco loopback stock_physical_test |
| TEST_IMPORT_DATABASE_URL | Banco loopback terminado em _import_test |
| IMAGES_TEST_DATABASE_URL | Banco loopback de imagens, conforme teste |
| TEST_BACKUP_DATABASE_URL / TEST_BACKUP_RESTORE_URL | Duas bases distintas com sufixos de segurança e ferramentas configuradas |

Nunca apontar integração de escrita ao Neon real. Não relaxar guardas para usar um banco “mais fácil”. Preservar trilha de fixtures; alguns testes inativam registros próprios em vez de apagar.

Bancos locais da última rodada: gavyo_unit_stock_test, gavyo_unit_purchases_test e stock_physical_test. PostgreSQL de QA foi encerrado ao terminar. Binários/helpers privados desta máquina podem não existir no ambiente da outra IA; configurar próprio ambiente seguro.

QA visual deve cobrir teclado, foco/Escape, drawers, overflow, loading/vazio/erro, cache antigo, rascunho, sessão, invalid flows e persistência após reload. Incluir senha errada, SKU/barcode duplicado, saída maior que saldo, double submit, recebimento parcial/repetido, concorrência e histórico/dashboard. Testar escrita só em ambiente autorizado isolado.

Não comprovados como homologação completa: bipador físico, leitor de tela real, uso de oito horas, todos os estados em todos os perfis/temas, teclado virtual real, carga prolongada e validação com funcionário do cliente.

## 18. Auditoria de 21/10 e pendências atuais

Classificação: P0 impede operação segura; P1 prejudica operação/preparação comercial; P2 ganho relevante de UX; P3 acabamento.

| Prioridade | Estado / próximo trabalho |
|---|---|
| P0 unidade | **Resolvido/publicado c8364eb**. Não converter passado automaticamente |
| P0 recuperação | Pendente configurar e comprovar backup/restore, fotos, cópia externa e responsáveis |
| P1 criação de pedido | Risco de repetição após resposta perdida; falta reprodução isolada e idempotência backend/UI |
| P1 desempenho | Demora de dados medida, causa não isolada; instrumentar antes de mudar arquitetura |
| P1 contas e implantação | Procedimentos de contas/recuperação, serviços, HTTPS, volumes, monitoramento, rollback e aceite pendentes |
| P2 UX | Novo Pedido → Recebimento → Inventário, depois Movimentações/Produto/Dashboard |
| P2 documentação | Consolidar estado atual e separar notas históricas para evitar retrabalho |

Medições históricas de 21/10: cinco GETs autenticados sequenciais por rota, API local/banco atual, sem benchmark de carga controlada:

| Lista | Registros/payload | Mediana |
|---|---|---|
| Compras | 6 pedidos, 25.014 bytes | 1.947 ms |
| Produtos | 20 de 31 ativos, 14.429 bytes | 687 ms |
| Inventários | 3 inventários, 2.065 bytes | 1.132 ms |

Listagem de compras inclui detalhes completos de itens, produtos/categorias, recebimentos e movimentos. Isso é achado de código; ser a causa principal da demora é hipótese. Payload pequeno com demora também aparece em inventário. Medir autenticação, viagens SQL, tempo por query, serialização, renderização e requisições durante filtro antes de concluir “é a hospedagem”. Não houve nova medição em 23/10.

## 19. UX prioritária: melhorar tarefas, sem redesign global

### Novo Pedido

Já tem combobox remoto, itens editáveis por linha, quantidade/custo próximos, subtotal/total, limite e rascunho protegido. Não propor isso como totalmente ausente.

Melhorias: compactar hierarquia/espaços e títulos repetidos; sequência opcional quantidade → custo → próxima busca; total/ação alcançáveis no celular; revisar validação inline. Enter no custo foi observado mantendo foco. Teste de aceite: montar 20 produtos, corrigir/remover itens e revisar sem dezenas de telas. Ainda não há protótipo novo aprovado.

### Recebimento

Solicitado/recebido/pendente e saldo previsto já existem. Proposta: mostrar também pendente após esta entrega junto ao campo, reduzir repetição entre tabela de consulta e conferência e suprimir saldo previsto com quantidade inválida. Exemplo: 10 solicitado, 4 anterior, 2 agora, 4 depois. Em teste sem gravação, 7 com pendente 6 foi bloqueado corretamente, mas ainda mostrava prévia numérica inválida. Manter revisão e idempotência.

### Inventário

Já distingue zero, vazio, salvo/local, divergência e reconferência; há contadores reais. Proposta: próximo pendente por teclado, progresso visual com números e indicação de salvo versus rascunho, observações opcionais sob demanda e modo de foco por produto opcional. Ações no mobile não devem ficar excessivamente distantes. Stepper pode ajudar pequenas correções, mas deve aceitar digitação e decimais; não aplicar automaticamente em todos os campos.

### Componentes discutidos

Editable Data Table, Searchable Combobox, Quantity Stepper, Progress, Empty State, Date Range Picker, Field/FieldError, Keyboard Shortcuts, Stateful Button. Muitos já têm equivalente próprio. Referências TanStack/shadcn/Aceternity são inspiração de comportamento, **não autorização para nove bibliotecas**. Não instalar novos kits antes de aprovação; medir bundle quando houver dependência.

## 20. Infraestrutura e comercialização

Usuário considera Hostinger e prefere menos fornecedores. Orçamento informado: até R$ 120/mês, com preferência por cobrança mensal real, sem antecipar longo período. VPS KVM 2 foi candidata, não contratação nem dimensionamento garantido. Preços antigos do PDF são históricos; consultar oferta/checkout atuais antes de orientar compra. Valor “por mês equivalente” não é necessariamente cobrança mensal.

Comparar, antes de migrar:

1. VPS app/API + Neon + Cloudinary + backup externo: menos migração, continua multiforncedor/latência a medir.
2. VPS app/API/PostgreSQL + storage externo + backup externo: banco próximo, mais responsabilidade operacional.
3. Hospedagem gerenciada compatível + banco/storage externos: avaliar processos persistentes, agenda, ferramentas de backup, volumes e cobrança.

Não trocar Cloudinary por armazenamento local/R2, migrar banco/fotos ou contratar automaticamente. A centralização não elimina a necessidade de cópia externa e restauração. A arquitetura atual de backups supõe uma API/volume persistente; não colocar em várias réplicas/serverless sem adaptar agenda, trava e arquivos.

Multiempresa não está pronta: não há isolamento completo por organização no modelo. Escolher banco/instalação por cliente ou projetar isolamento ponta a ponta; adicionar companyId em uma tabela não resolve. Isso é requisito para vários clientes compartilharem instalação, não obrigação imediata para um piloto independente.

## 21. Git e trabalho em equipe: regras essenciais

Antes de editar: conferir raiz, branch/status, buscar remoto e identificar alterações locais/paralelas. Não usar reset, clean, checkout destrutivo, rebase de trabalho alheio ou force push para “resolver”. Pull divergente exige entendimento do conflito; não apagar mudanças de colegas.

Selecionar arquivos relacionados explicitamente. **Não usar git add .** numa checkout com material anterior. Revisar diff staged e segredos antes de commit; mensagem curta e concreta, uma mudança coerente por commit. Rodar gates relevantes e registrar o que realmente passou. Push apenas dentro da autorização do usuário e confirmar hash remoto. Git publicado não significa servidor atualizado nem banco migrado.

Estado local em 23/10: sem alterações em arquivos rastreados; permanecem não rastreados antigos artifacts/frontend-review-20261014, artifacts/frontend-review-20261015, artifacts/master-audit-20261021, output e tmp. Preservar. O pacote de contexto é novo em output e não foi publicado automaticamente.

Nunca versionar `.env`, senhas, JWT, Cloudinary keys, dumps, manifestos privados, dados reais ou banco. Não copiar todo var/backups para outro agente. Informações públicas de estrutura/configuração bastam; credenciais devem ser configuradas com o responsável por canal seguro.

## 22. Processo de execução aprovado pelo usuário

O plano mestre é por fases, com aprovação:

1. Auditoria, prioridades e comparação das telas: concluída em 21/10, relatório local no pacote.
2. Integridade e proteção de dados: somente proteção de unidade foi autorizada, concluída e publicada. Demais itens ainda exigem escopo aprovado.
3. Protótipos/componentes/UX: comparar propostas e obter aprovação antes de instalação ou mudança estrutural. Prioridade pessoal do usuário: Novo Pedido, Recebimento e Inventário.
4. Implementação por módulo, QA/performance, homologação e infraestrutura/piloto: entregas separadas e verificáveis.

Não usar o contexto como autorização para horas de alterações gerais. Próxima tarefa deve ser concreta. Para uma mudança já aprovada, seguir sem pedir autorização repetida a cada propriedade CSS ou teste seguro. Para migração real, operação destrutiva, contratação, publicação externa ou acesso ampliado, confirmar o escopo apropriado.

Entrega útil relata: problema, evidência, mudança, arquivos, risco, testes, resultado e pendências. Distinguir teste isolado, observação normal, hipótese, histórico e homologação humana.

## 23. Roteiro de piloto e decisões abertas

Antes de cliente: dados/unidades consistentes, backup restaurável, contas e responsáveis definidos, ambiente estável, HTTPS, reinício automático, rollback, monitoramento e suporte. Definir frequência de backup, perda aceitável e tempo de recuperação com quem opera.

Roteiro com pessoa sem experiência técnica: encontrar/cadastrar produto; entrada/saída; pedido com vários itens; recebimento parcial; contagem incluindo zero; divergência/reconferência; autoria no histórico; falha de conexão. Registrar conclusão, tempo, erros, hesitações e ajuda. Não chamar capturas bonitas de homologação.

Confirmar com o cliente: usuários simultâneos, catálogo/volume de fotos, planilha real, fluxo de lavanderia, leitor, permissões de custos, responsável pelo estoque e suporte, janela de migração e aceite. Não prometer data ou capacidade sem levantamento.

## 24. Referências e anexos para a nova IA

Ler primeiro este documento, depois os contratos relevantes à próxima tarefa. O pacote não substitui clonar/ler código atual:

- `docs/AGENTS.md`: cópia do guia do repositório, com notas históricas que precisam de leitura crítica.
- `docs/PROJECT_STATUS.md`, `docs/RETOMADA.md`: retratos e implantação registrada; resolver diferenças pela data/código.
- `docs/frontend/DESIGN.md`: direção visual, inclusive regra de unidade de 21/10.
- `docs/PERMISSOES.md`, `IMPORTACAO_V1.md`, `INVENTARIO_FISICO.md`, `COMPRAS_V1.md`, `BACKUPS.md`, `UPLOAD_IMAGENS_WIP.md`.
- `evidencias/auditoria-20261021/DIAGNOSTICO.md` e `metrics.json`: auditoria e medidas históricas.
- `evidencias/unidade-20261021/REVIEW.md` e capturas: implementação/testes do último commit.
- `pdf/GAVYO-documentacao-completa-2026-10-21.pdf`: 41 páginas, base anterior dc0466a, funcionalidades e telas.
- `pdf/GAVYO-mudancas-e-proximos-passos-2026-10-21.pdf`: 7 páginas, correção c8364eb e próximos passos.

Links relativos dos documentos copiados podem apontar para arquivos não incluídos; os caminhos originais continuam disponíveis no repositório. O pacote não inclui dependências, código completo, `.env`, storage, dump ou acesso ao banco.

### Mensagem inicial sugerida para a outra IA

“Leia CONTEXTO_COMPLETO_GAVYO.md e os anexos relevantes. Estamos continuando o GAVYO Estoque; preserve a base existente. Primeiro confirme branch, commit, alterações locais e o que consegue acessar. A correção de unidade c8364eb já foi entregue. Não implemente todo o roadmap. Apresente o estado verificado e proponha uma próxima rodada pequena; a prioridade recomendada é recuperação dos dados. Preserve identidade de 2 px e os fluxos atuais. Separe fatos, evidência antiga e hipóteses. Não use dados reais para QA nem exponha segredos. Aguarde meu pedido concreto antes de executar uma nova fase.”
