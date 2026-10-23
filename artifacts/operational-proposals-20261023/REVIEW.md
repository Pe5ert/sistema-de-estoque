# Auditoria operacional e propostas — 23/10/2026

Rodada de auditoria/protótipos, sem implementação definitiva. Branch `sistema-de-estoque-v2`, base `c8364eb`, com o formulário B e foto sticky locais preservados. Escopo: clientes em vendas, leitura por código, backup/recuperação. Não foram alterados banco compartilhado, agenda, storage ou regras de negócio nesta rodada.

## Decisão do responsável

**Venda sem cliente será permitida, com escolha explícita “Sem identificação”.** Resposta recebida durante esta auditoria. Não confundir comprador com funcionário autenticado.

## O que existe e o que falta

| Prioridade | Evidência e classificação | Consequência / ação recomendada |
| --- | --- | --- |
| P1 | **Reproduzido na UI atual:** Backups mostra 14 tentativas com falha, a última de 23/10 às 14:56: ferramentas indisponíveis. Nenhuma cópia disponível nessa lista. `current-backups.jpg`. | A configuração automática ativa não comprova proteção. Configurar executáveis compatíveis no processo da API, gerar nova cópia, verificar e restaurar em ambiente separado. Não afirmar que backups privados antigos/inventário externo não existem: não foram inventariados nesta rodada. |
| P1 | **Comprovado por inspeção:** `MovementInput` e `InventoryService.move` não têm chave de idempotência. Trava do React e lock de produto existem. | Lock serializa saldo, mas não identifica reenvio da mesma operação. Risco de duas saídas se a primeira resposta se perder e houver retry. Não foi reproduzida duplicação no banco compartilhado. Implementar chave por operação + payload e resposta estável na mesma transação, antes de facilitar vendas consecutivas. |
| P1 | **Lacuna de recuperação:** código/contrato de backups não registra comprovação de cópia externa nem restauração de imagens. | Perda do volume da API pode perder as cópias locais. Definir destino privado externo, responsável, retenção, procedimento e evidência de recuperação de arquivos. Estado real da conta Cloudinary não foi auditado. |
| P2 | **Inspeção do schema/DTO:** não há Customer/Buyer/Sale nem comprador em StockMovement. `userId` é autoria. | Não é possível consultar vendas por cliente de forma estruturada. Criar cadastro e vínculo auditado, sem usar notes/reference como substitutos. |
| P2 | **Inspeção:** tipo e motivo são enums válidos separadamente no DTO; não foi encontrada validação cruzada SALE → EXIT no caminho comum de movimentação. UI filtra motivos. | Revalidar a combinação no servidor antes de vincular cliente. Hipótese de aceitação de combinação incoerente por chamada direta; não enviada ao banco real. Adicionar teste e regra explícita na implementação. |
| P2 | **Reproduzido na UI atual:** após CAB-USB-C-1M + Enter, o foco permanece no código readonly; Enter repetido mantém quantidade 1. | É a decisão documentada atual (Tab para quantidade), não falha de leitura. Proposta: passar à quantidade e manter confirmação separada, para reduzir um Tab. Validar com operador/leitor físico. |
| P2 | **Inspeção e UI:** Backups lista falhas e agenda, mas não resume separadamente último arquivo válido, próximo horário calculado e recuperação comprovada. | Evitar aparência de proteção por haver agenda ativa. Resumo com ação contextual; “Arquivo verificado” separado de “Restauração testada”. |

### Recursos preservados

- `ProductForm.tsx`: cadastro/edição B, nome dominante, foto/detalhes secundários, saldo somente leitura, unidade bloqueada, decimais, upload/link e rascunhos. Não há motivo para outra repaginação nesta rodada.
- `MovementWorkbench.tsx`: código/SKU + Enter, consulta assíncrona com proteção de respostas antigas, inexistente/ambíguo, seleção explícita, trava durante gravação, saldo previsto, bloqueio de saída maior que saldo e próximo código automático. Nenhum POST é necessário para identificar item.
- `InventoryService`: produto ativo, row lock, cálculo de saldo e histórico na transação; busca SKU case-insensitive ou barcode exato somente em ativos.
- `BackupsService`: ADMIN, origem nas mutações, exportação custom, leitura do catálogo, SHA-256, integridade no download, pasta privada, trava, retenção após nova cópia válida e agenda semanal/mensal. Permissões POSIX configuradas não comprovam ACL efetiva no Windows.

## O que foi executado nesta rodada

1. Leitura de schema, DTO, controller/service de movimentações, formulário, serviço/tela/teste de backups e documentação atual.
2. Navegador no servidor normal: backup com falha; produto identificado por código; Enter repetido sem nova leitura/mudança de quantidade; código inexistente com erro. Sem confirmar movimentação, gerar backup manual ou mudar agenda.
3. **Teste real de backup/restore passou:** `backups.integration.spec.ts`, 1 teste, 0 falhas, 0 skips. Duas bases novas loopback `gavyo_audit_20261023_backup_test` e `gavyo_audit_20261023_backup_restore_test`, ferramentas PostgreSQL **17.11**. Teste cobre HTTP ADMIN/acessos, geração, download, restauração, decimais/constraints, retenção e recusa de arquivo adulterado. Log privado: `var/backups/operational-backup-test.log`.
4. Isso comprova o caminho com PostgreSQL local e ferramentas explícitas; **não** comprova funcionamento das ferramentas no processo normal, recuperação do Neon nem imagens. A nota histórica do projeto registra Neon 18; não houve nova consulta da versão remota nesta rodada. Não apontar o executável local 17 para um servidor 18.
5. Protótipo compilado pelo Vite, sem dependência nova. Validação visual desktop 1440, intermediário 1024 e celular 390, claro/escuro; seis checks de overflow no tablet/celular em `viewport-checks.json`, todos false. Cadastro de cliente preservou quantidade 3; anônimo aparece na conferência; inativo não selecionável; saldo insuficiente bloqueado; após saída simulada foco volta ao código; gerar cópia fictícia não altera “recuperação pendente”.

Não testados: leitor físico, corrida de clientes/inativação, retry HTTP real da movimentação, leitor de tela, novo backup do banco compartilhado, conta/recuperação Cloudinary, armazenamento externo e ACL Windows. Falha observada e riscos por inspeção foram separados acima.

## Modelagem recomendada para aprovação

**Recomendação inicial: Customer + vínculo estruturado em StockMovement.** A operação atual movimenta um produto por vez; o objetivo é rastreabilidade. Evita introduzir caixa, pagamentos, tributos ou pedido de venda sem necessidade.

- Customer: UUID, código interno único, nome de identificação, active, timestamps; cadastro não exige CPF/CNPJ, endereço ou contato para este objetivo. Nome não deve ser único. Busca por nome/código interno, com paginação no servidor e componente SearchCombobox existente.
- StockMovement: `customerId` nullable com FK Restrict e índice por cliente/data; snapshot mínimo de nome/código no momento da operação; identificação `IDENTIFIED`/`ANONYMOUS`, nullable para legado. Cliente informado apenas em EXIT/SALE; identificado exige cliente ativo, anônimo exige ausência de vínculo. Cliente é validado na transação com coordenação do lock usado ao inativá-lo.
- Movimentos antigos continuam com identificação **não registrada à época**. Não convertê-los em venda anônima explícita nem inventar um comprador. Migração aditiva, sem apagar/reinterpretar histórico.
- Editar nome do cliente não altera snapshot anterior; histórico mostra nome da operação e acesso ao cadastro atual. Inativar retira das novas seleções, mantendo consultas antigas. Sem exclusão física de cliente referenciado.
- Idempotência: chave UUID por intenção de operação, escopo do usuário e hash do payload; repetir mesma chave/payload retorna resultado original; payload diferente conflita. Gravação do comprovante e movimento atômicas. Precisa cobrir também as demais movimentações comuns.
- Limite: o histórico lista **saídas por venda**, não pedidos ou número de compras multitem. Quando houver venda com vários produtos, adicionar Sale/SaleItem e agrupar novos movimentos; não inferir agrupamentos de registros antigos. Uma entidade Sale agora seria mais apropriada se carrinho, devolução agrupada ou documento comercial entrarem no escopo, o que ainda não foi pedido.
- Acesso proposto, ainda a aprovar: ADMIN/MANAGER gerenciam/inativam clientes; OPERATOR consulta e pode criar cadastro mínimo durante a venda. Custos/preços seguem política existente. A API deve aplicar os mesmos filtros e permissões. Não expor dados pessoais em toasts, logs, busca global ou URLs; histórico não precisa de documentos/contatos.

Fluxo: localizar produto → quantidade/motivo Venda → selecionar cliente ou escolher sem identificação → resumo com comprador e saldo → confirmar. Cadastro rápido em modal mantém rascunho; seleção valida novamente na confirmação e explica cliente inativado durante a operação. Histórico de estoque exibe comprador e filtra por customerId; ficha do cliente lista saídas por venda autorizadas. Venda pode ser anônima, conforme decisão recebida.

## Comparação e propostas visuais

Abrir `http://127.0.0.1:5183/`. Três abas: **Venda e cliente**, **Leitura rápida**, **Proteção dos dados**. Na venda, seletor Composição alterna duas experiências; não é mudança da composição B já aprovada para Produtos.

| Critério | Atual | Conferência junto aos campos (recomendada) | Conferência em etapa separada |
| --- | --- | --- | --- |
| Comprador | Ausente | Busca + seleção ou escolha anônima | Mesmos dados antes da etapa final |
| Interações | Não completa identificação do comprador | Seleção/decisão + confirmação; resumo atualiza durante edição | Acrescenta uma ação de abrir conferência e outra para voltar aos campos |
| Clareza/erro | Produto e saldo previstos; não há comprador | Produto/quantidade/comprador/saldo juntos | Resumo isolado pode ajudar conferência, mas alterna contexto |
| Iniciantes | Motivo precisa ser escolhido | Cliente inativo visível e impedido; erro contextual | Passo final explícito, mais navegação |
| Teclado | Código → Tab → quantidade | Proposta foca quantidade após leitura; confirmação continua explícita | Exige abrir/fechar etapa com foco restituído |
| Mobile | Fluxo atual responsivo | Resumo após os campos; validar posição da ação na integração | Conferência ocupa modal rolável, com retorno ao rascunho |
| Manutenção | Componentes/contratos existentes | Reusar MovementWorkbench, SearchCombobox e confirmação/feedback existentes | Acrescenta estado de revisão e proteção contra resumo desatualizado |
| Tempo | Sem comparação equivalente com cliente | Sem ganho em segundos alegado; fluxo ainda precisa ser medido com funcionário | Tendência a mais interação, não medição de tempo |

Protótipo usa três clientes fictícios e cadastro nome/código; produção deve considerar código gerado e cadastro só com nome para reduzir esforço. A busca real será paginada, não uma lista fixa. A demo de leitura simplifica motivo e trabalha com saldo fictício; a implementação preservará tipo/motivo e contratos reais. Estados de sucesso são **simulados**, não evidência de persistência/idempotência/backup. Estado fica apenas na memória da página e reinicia no reload.

Backup proposto separa cópia válida, teste de recuperação, destino externo, imagens e responsável. Agenda diária está **proposta**, não implementada: a API atual aceita semanal/mensal. Próxima execução exibida na demo é exemplo, não agenda do servidor. Não há download ou restauração real pelo protótipo.

## Ordem de execução sugerida — aguardar aprovação de cada escopo

1. **Recuperação:** configurar ferramentas compatíveis no ambiente normal; gerar e verificar cópia com autorização; restore em base isolada; inventariar imagens/backup da conta; definir cópia externa, perda de dados aceitável entre cópias, tempo de recuperação, responsável e roteiro. Só depois atualizar a tela com fatos verificáveis. Propor cópia diária e teste periódico, frequência final condicionada à operação.
2. **Integridade das movimentações:** idempotência, validação cruzada tipo/motivo, testes de perda de resposta e retry, concorrência e falhas. Sem alterar saldo por fora do domínio.
3. **Clientes na venda:** schema aditivo, permissões aprovadas, anonimato explícito, snapshot histórico, busca/cadastro rápido, histórico e filtros. Conferência junto aos campos é a recomendação visual.
4. **Bipador:** ajuste de foco e teste físico de Enter/terminadores, leituras repetidas, inexistente/ambíguo, rede lenta, produto inativo e próximo item; sem leitura registrar saída automaticamente.

Nenhuma configuração, contratação, upload externo ou migration real está autorizada por esta recomendação. O usuário pediu apresentação antes de implementar; esta entrega termina nessa etapa.

## Referências

- Referências de composição Shopify/Sortly/Zoho/Odoo/shadcn foram estudadas na rodada de Produtos e reaproveitadas, sem copiar estética: `../product-form-proposals-20261023/REVIEW.md`.
- [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html): formato consistente, compatibilidade e escopo de um banco.
- [PostgreSQL pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html): listar catálogo não equivale a restaurar; teste deve carregar e conferir dados em outra base.
- [Cloudinary backups/versionamento](https://cloudinary.com/documentation/backups_and_version_management): backup de assets exige configuração própria e tratamento dos já existentes; estado desta conta não foi consultado. Não assumir proteção por guardar URLs no banco.

Capturas `sale-desktop.jpg`, `sale-review-desktop.jpg`, `scan-desktop.jpg`, `backup-desktop.jpg`, variantes `*-1024.jpg`/`*-390.jpg` e `sale-light-mobile.jpg`. Evidências atuais em `current-backups.jpg` e `current-reading.jpg`.
