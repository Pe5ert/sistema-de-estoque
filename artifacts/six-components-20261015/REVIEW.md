# GAVYO — seis componentes integrados

Validação em 15/10/2026. Base: `ff21b49`, branch `sistema-de-estoque-v2`. Implementação em etapas, com backend separado do acabamento visual. Dados de teste somente em PostgreSQL local isolado; nenhuma migration, fixture ou alteração de saldo no Neon compartilhado.

## Implementação

| Componente | Aplicação | Reaproveitamento e comportamento |
| --- | --- | --- |
| Área interativa | Dashboard, Entradas e saídas | Mantidos consulta, períodos 7/30/90, agrupamento responsivo, legenda, tabela alternativa, falha com dados anteriores e links ao Histórico. Área SVG, ponto selecionado, guia e tooltip. Conta **registros**, sem somar unidades incompatíveis. |
| Área em degraus | Drawer de Produtos | Consulta própria auditada; saldo inicial, eventos, seleção por ponteiro/slider/teclado, quantidade, motivo, saldo resultante e link ao registro. Períodos 7/30/90 e estado vazio. |
| Combobox pesquisável | Novo/editar pedido: fornecedor e produtos | Busca na API, debounce, limite 20 fornecedores/10 produtos por resposta, indicação de resultados adicionais, teclado/Enter/Escape, selecionado/limpar, loading, erro e vazio. Leitura exata de SKU/barcode por Enter preservada. Produtos já adicionados indisponíveis. Rascunho e regras existentes preservados. |
| Tabelas | Produtos e Compras | Ordenação no servidor antes de paginar; filtros e ordenação na URL, desempate por ID, cabeçalhos acessíveis e seletor também disponível no celular. Compras mostra quantidade de **itens** previstos/pendentes, sem somar unidades de produtos diferentes. Clique/Enter para detalhes e seleção legítima para reposição mantidos. |
| Período | Histórico | Hoje, 7/30/90 dias, personalizado e todo o histórico. Validação antes da consulta, datas na URL e limites reais do dia em São Paulo, inclusive horário de verão histórico. Dashboard e saldo mantêm seus períodos reais existentes. Sem página nova de relatórios. |
| StatefulButton | Produto, pedido, fornecedor, salvar contagem e ConfirmDialog compartilhado | Idle/loading/success/error; confirmações de recebimento e inventário mostram processamento real. Toast, Alert, FieldError, foco, proteção de rascunho, travas síncronas e UUID idempotente existentes preservados. Navegação imediata após sucesso. |

## Backend e integridade

- `GET /products/:id/stock-history?days=7|30|90`, protegido por sessão e `stock.read`.
- Produto e auditoria lidos na mesma transação `RepeatableRead`. O servidor verifica saldos anteriores/resultantes com Decimal e confronta o saldo materializado. O frontend apenas desenha os saldos retornados.
- Nunca transformar as cinco movimentações recentes em uma série supostamente completa. Sequência inconsistente/ambígua ou mais de 5.000 movimentos retorna `complete:false`, aviso e acesso ao Histórico completo. Esse limite é explícito e a aplicação não desenha uma curva parcial como se fosse completa.
- Produtos: `sortBy=name|sku|stock|minimumStock|category`; Compras: `number|supplierName|status|createdAt|total`. `sortDirection=asc|desc`, lista permitida e desempate por ID antes de `skip/take`.
- Histórico agora aceita os links contextuais de produto e de registro individual. Invalidação de cache inclui a evolução do saldo após movimentação, recebimento e inventário concluído.
- Nenhuma alteração na matemática de estoque, permissões de escrita, migrations ou idempotência.

## Dependências e direção visual

Nenhuma dependência nova, nenhuma alteração no lockfile. React, TanStack Query, Lucide, CSS e SVG existentes foram suficientes. TanStack Table foi avaliado: para duas tabelas já responsivas, com paginação/filtros no servidor e sem novas operações em lote, a troca acrescentaria manutenção sem necessidade funcional. Reutilizados `DetailDrawer`, `DataState`, `Pagination`, `ConfirmDialog`, `Toast`, `Alert`, `FieldError`, proteção de rascunho e tokens atuais.

Preservados grafite/azul, tema claro, radius de 2 px, tipografia, sidebar e composição. Transições discretas e regras de `prefers-reduced-motion`; tabelas não são reanimadas a cada atualização e números de saldo não percorrem valores intermediários.

Referências consultadas: [área](https://ui.shadcn.com/charts/area), [degraus](https://www.shadcn.io/examples/a-step-area-chart), [combobox](https://ui.shadcn.com/docs/components/aria/combobox), [tabela](https://ui.shadcn.com/docs/components/aria/data-table), [TanStack Table](https://tanstack.com/table/latest/docs/framework/react/quick-start), [calendário](https://ui.shadcn.com/docs/components/aria/calendar), [botão](https://ui.aceternity.com/components/stateful-button). Foram referências de comportamento, sem instalar seus kits.

## Validação executada

| Verificação | Resultado |
| --- | --- |
| `pnpm lint` | Passou |
| `pnpm typecheck` | Passou nos três pacotes; checagem web repetida após os ajustes finais |
| `pnpm test` | 82 testes API aprovados, 3 suítes opt-in sem banco puladas; 29 testes frontend aprovados |
| `pnpm build` | Passou; build de produção com `NODE_ENV=production` também validada |
| `git diff --check` | Passou |
| PostgreSQL: inventário operacional | 7 testes aprovados: histórico, ordenação global/páginas, persistência, Decimal, concorrência de saídas e permissões |
| PostgreSQL: compras | 7 testes aprovados: ordenação global/páginas, revisões, recebimento parcial/total, concorrência, idempotência e rollback |
| Desktop/tablet/mobile | 1440×900, 1024×768 e 390×844; sem overflow horizontal nas telas conferidas |
| Temas | Claro e escuro; capturas na galeria |

### Fluxos observados no navegador

1. Combobox: fornecedor por nome e Enter; produto por nome e Enter; foco na quantidade; Escape; lista vazia; loading; indicação de 10 resultados entre 80, consultados na API.
2. Salvar pedido com duplo clique: somente PC-000003 criado. Falha simulada de escrita preservou fornecedor, produto, quantidade `3` e custo `12,50`; confirmação de descarte mantida. Após recuperação, o mesmo formulário foi salvo como PC-000004.
3. Produtos com 99 registros locais: filtros e ordenação consecutivos, segunda página, URL e reload. Busca vazia e acesso aos detalhes conferidos.
4. Gráfico do produto: teclado no slider, evento de compra e link para auditoria `24 → 28`; histórico vazio em produto sem movimentos. Após recebimentos, saldo atualizado e Dashboard com custo de R$ 747,00.
5. Histórico: atalho de período na URL, data inicial posterior à final bloqueando consulta, API indisponível mantendo 20 linhas e aviso explícito de dados possivelmente desatualizados. Edição nativa de data por teclado validada; o preenchimento automatizado do campo date precisou de uma tecla para disparar a edição no navegador.
6. Contagem: salvar com duplo clique, botão bloqueado durante processamento, sucesso após gravar e conclusão real sem ajustes. ConfirmDialog permaneceu aberto em “Processando…” até a resposta.
7. Recebimento: duplo clique acrescentou uma única unidade e um único registro, saldo `28 → 29`. Em seguida, o proxy local recebeu a resposta bem-sucedida do servidor e simulou sua perda: a tentativa ficou preservada; após reload, o saldo era `30`, com dois recebimentos de uma unidade. “Conferir recebimento” reutilizou o mesmo UUID e manteve o saldo em `30`, sem terceiro recebimento.
8. Produto: SKU duplicado mostrou erro sem perder o nome; SKU corrigido e “Salvar e criar outro” geraram sucesso e limparam o próximo cadastro, mantendo categoria/unidade.
9. Fornecedor: CPF/CNPJ duplicado preservou o preenchimento; correção permitiu salvar e navegar.
10. API e frontend principais responderam HTTP 200 em `localhost:3000/api/health` e `localhost:5173`; as escritas de QA ficaram nos servidores separados.

As capturas representam momentos diferentes da mesma sessão de QA; totais mudam devido à criação das fixtures de volume e aos recebimentos fictícios. Não são dados de produção.

## Demonstração e capturas

Abra [a galeria](index.html). Cada imagem abre em resolução completa. Principais exemplos:

- [Dashboard desktop](dashboard-desktop.jpg) e [mobile](dashboard-mobile-light.jpg).
- [Saldo do produto desktop](product-history-desktop.jpg) e [mobile](product-history-mobile-light.jpg).
- [Busca de pedido](combobox-desktop-many-results.jpg), [carregando](combobox-loading-mobile.jpg) e [vazio](combobox-empty-desktop.jpg).
- [Compras desktop](purchases-desktop-dark.jpg), [tablet](purchases-tablet.jpg) e [mobile](purchases-mobile-dark.jpg).
- [Histórico desktop](history-desktop.jpg), [período inválido](invalid-period-mobile.jpg) e [API indisponível](api-unavailable-mobile.jpg).
- [Salvamento com erro](stateful-error-mobile.jpg), [sucesso da contagem](stateful-inventory-success.jpg), [confirmação em processamento](stateful-confirm-processing.jpg) e [resposta perdida recuperada](receipt-recovered-no-duplicate.jpg).

Para repetir uma demonstração: selecionar um intervalo no painel → abrir Histórico; abrir produto → percorrer eventos → abrir registro; Novo pedido → pesquisar fornecedor/produto → Enter → informar quantidade/custo; ordenar uma tabela → avançar página → recarregar; selecionar período; salvar e observar processamento/resultado. Usar conta de QA e banco isolado para as operações de escrita.

## Bundle

Comparação do JavaScript minificado, mesma versão de dependências e API configurada, com `NODE_ENV=production` explícito. Base `ff21b49` extraída para diretório isolado; depois corresponde à implementação atual. Sem biblioteca de gráficos, motion ou tabela adicionada.

| JavaScript | Antes | Depois | Variação |
| --- | ---: | ---: | ---: |
| Minificado | 675,32 kB | 687,84 kB | +12,52 kB |
| Gzip | 207,25 kB | 211,73 kB | +4,48 (+2,16%) kB |

O build habitual deste ambiente lê `NODE_ENV=development` do arquivo local e produz um pacote maior, próximo de 1,16 MB. A comparação acima força produção em ambas as versões. O aviso já existente de chunk acima de 500 kB permanece; dividir rotas é uma melhoria futura. CSS não foi comparado entre diretórios porque a descoberta de fontes do Tailwind varia com a localização da extração.

## Problemas encontrados e limites reais

- **Corrigido:** mudanças rápidas de filtro/ordenação podiam perder o filtro anterior durante a transição da rota. Os controles agora usam o estado pendente mais recente; repetido na versão compilada com URL e reload preservados.
- **Corrigido:** faltava indicar que a busca retornava só os primeiros resultados. O combobox informa o total e pede refinamento.
- **Limite do gráfico de saldo:** até 5.000 movimentos na auditoria do produto e sequência temporal confirmável. Histórico completo continua disponível. Para escalar além disso sem perder confiabilidade, uma próxima etapa pode acrescentar paginação auditável/agregação e ordenação monotônica do evento, com avaliação própria de backend/migration.
- **Desenvolvimento:** algumas atualizações quentes de módulos compartilhados exibiram `AuthProvider ausente`; recarregar resolveu. Não reproduzido na versão compilada, na qual foram repetidos navegação, filtros, reload e recebimento com resposta perdida. A estabilidade do hot reload pode ser tratada separadamente, preservando a autenticação.
- **Cobertura física pendente:** toque em aparelho real, teclado virtual e leitor de tela prolongado. Nesta rodada foram usados viewport mobile, ponteiro e teclado do navegador. Reduced motion foi conferido nas regras CSS; a preferência do sistema operacional não foi alternada automaticamente.
- **Banco de teste antigo:** a primeira execução de compras usou uma base antiga sem uma constraint esperada e falhou nessa verificação. Reexecutada na base isolada com migrations completas, os sete testes passaram. Nenhuma constraint do produto foi relaxada para fazer o teste passar.
- Nenhum deploy, migration ou push remoto foi executado nesta etapa. Implementação e evidências foram commitadas localmente conforme as etapas solicitadas.

## Commits

```text
6cafb0a fix(web): identificar periodos personalizados e consulta completa
c6d91db fix(web): preservar filtros consecutivos e refinar controles
c303907 test(api): validar ordenacao global e contrato de filtros
4c4fc51 feat(web): compartilhar feedback de salvamento e confirmacao
2b4f6ee feat(web): consultar periodos no fuso operacional
ee79fe9 feat(web): ordenar tabelas e destacar recebimentos pendentes
f6ffbb9 feat(api): ordenar catalogo e compras antes da paginacao
98b0f53 feat(web): pesquisar fornecedores e produtos no pedido
97b3ecd feat(web): mostrar evolucao auditada no detalhe do produto
b28f3a4 feat(api): expor evolucao auditada de saldo por produto
82bf317 feat(web): refinar grafico interativo de movimentacoes
```
