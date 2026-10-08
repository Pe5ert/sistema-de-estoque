# Pesquisa de direção visual — GAVYO Estoque

08/10/2026. Pesquisa e diagnóstico, sem alteração na interface. Branch `feat/suppliers-purchases`, revisão de base `80bed5a`. A proposta abaixo ainda não substitui as decisões vigentes em DESIGN.md.

## Contexto e critério

Produto operacional em uso e expansão. Pessoas da equipe consultam produtos, registram entradas/saídas e acompanham compras. Objetos: produto, saldo, movimento, fornecedor, pedido e recebimento. O sucesso visual é reconhecer estado e próxima ação rapidamente, mantendo autoria, unidade, valores e confirmação legíveis. No celular, localizar e executar a operação vem antes de metadados.

Direção: precisa, confiável, com personalidade própria. Base técnica atual React/Vite, componentes compartilhados e tokens existentes. Profundidade recomendada: revisar composição das páginas e unificar componentes; manter fluxos e contratos. Não há justificativa nesta pesquisa para trocar framework ou biblioteca inteira.

## Método e limites

- Inspeção da aplicação real em localhost:5175 com conta ADMIN e banco isolado: login, navegação, Produtos, novo produto, Fornecedores, Compras e novo pedido.
- Comparação visual com imagens oficiais de formulários Zoho e com a imagem da referência Dribbble já indicada no briefing anterior; leitura das recomendações atuais de tabelas Carbon.
- Revisão de DESIGN.md, AGENTS.md e classes de Compras para separar impressão visual de comportamento implementado.
- Dados fictícios com nomes longos de testes agravam a aparência de algumas linhas. Não representam fornecedores reais. A quantidade pequena de fornecedores não prova que a tabela terá baixa densidade em produção.
- Esta rodada não é uma nova aprovação funcional completa nem pesquisa com usuários. Mobile aparece no diagnóstico anterior de QA; revalidar ao prototipar. Odoo foi localizado na busca, mas a página não carregou nesta rodada e não fundamenta a proposta.

## Diagnóstico observado

| Prioridade visual | Evidência atual | Consequência | Proposta |
| --- | --- | --- | --- |
| Alta | Marca e login dizem ESTOQUE V2; cabeçalho repete SISTEMA / ESTOQUE e CONTROLE OPERACIONAL. | A identidade GAVYO não se apresenta e vários textos competem com a tarefa. | Aplicar nome GAVYO Estoque de forma consistente; reduzir rótulos institucionais repetidos. Não inventar logotipo definitivo. |
| Alta | Produtos tem saldo destacado, barra e situação; Compras coloca todos os estados no mesmo badge cinza (`procurement-status`). | Os módulos parecem ter níveis diferentes de acabamento; a fila de compras exige ler cada status. | Vocabulário visual comum para estados, com texto e sinal além da cor; separar rascunho, em trânsito, parcial, concluído e cancelado. |
| Alta | Fornecedores tem subtítulo, frase acima da lista, texto dentro do resumo e título da tabela reiterando a função. | Conteúdo genérico ocupa espaço antes do trabalho. | Um título e ação principal; resumo compacto quando útil; ajuda contextual somente no ponto de decisão. |
| Alta | Novo Produto possui identificação dominante e agrupamento comercial/estoque; Novo Pedido reúne fornecedor, produtos e observações num fieldset amplo. | A compra parece um formulário genérico, sem leitura de documento operacional. | Cabeçalho de fornecedor; região dominante de itens; quantidade, custo e subtotal alinhados; resumo e salvar ao final. No mobile, item como unidade de edição. |
| Média | Tabelas de compras usam colunas com pesos parecidos e valores pouco destacados. | Número do pedido, fornecedor e estágio não formam uma leitura rápida. | Nome humano principal; número secundário identificável; valores alinhados à direita; data compacta com hora no detalhe quando necessário. |
| Média | Superfícies grafite próximas, bordas e caixas repetidas; parte inferior de Fornecedores fica vazia com um registro. | Regiões têm pouca distinção de importância. | Contraste entre fundo, área de trabalho e contexto; eliminar molduras duplicadas; deixar espaço livre quando os dados forem poucos, sem preenchimento artificial. |
| Média | Datas, estados, unidades e ações recebem tratamentos específicos por módulo. | Sensação de partes montadas em momentos diferentes. | Padronizar cabeçalhos, barras de filtro, paginação, badges, campos e confirmação; preservar diferenças que expressam a tarefa. |

As prioridades acima tratam clareza e acabamento. Não são declarações de falha no cálculo ou persistência.

## Referências verificadas e aplicação

| Referência | Contribuição | Adaptação para GAVYO |
| --- | --- | --- |
| [Carbon — tabelas](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines) | Organização de busca, ações, linhas e paginação; densidade consistente; detalhes progressivos. | Uma barra funcional próxima à tabela; tamanhos coerentes; detalhe contextual. Não importar toda a aparência IBM. |
| [Zoho Inventory — criar pedido](https://www.zoho.com/us/inventory/help/purchase-orders/purchase-order-creation.html) · [imagem dos itens](https://www.zoho.com/inventory/help/images/purchase-orders/po-new-2.png) | Fornecedor primeiro; edição dos itens com quantidade, preço e total próximos. | Composição de documento operacional para Novo Pedido, preservando campos e regras da nossa V1. |
| [Zoho Inventory — recebimentos](https://www.zoho.com/us/inventory/help/purchase-orders/purchase-receive.html) | Receber parte do pedido dentro do contexto daquele pedido. | Dar destaque ao restante e à entrega atual, com prévia antes de confirmar. Sem adicionar faturamento ou campos fiscais. |
| [Supplier Management Overview — Nabil, Dribbble](https://dribbble.com/shots/25174577-Supplier-Management-Overview-Dashboard) | Separação de regiões, identidade na navegação e tabela visualmente leve; cores com papéis diferentes. | Extrair contraste e hierarquia. Seus gráficos, contratos e métricas ilustrativas não são requisitos do GAVYO. A página atribui o trabalho a Nabil; o briefing anterior a chamou de referência Awe Saas. |

As referências servem para decisões distintas. Galeria visual não comprova usabilidade; documentação funcional não determina sozinha identidade de marca.

## Três caminhos possíveis

| Caminho | Aparência e composição | Ganho | Custo / risco |
| --- | --- | --- | --- |
| A — Grafite operacional, recomendado | Grafite/azul existentes, superfícies mais distintas, dados com pesos claros, menos texto repetido, marca GAVYO. | Continuidade com Produtos e menor mudança para a equipe. | Exige disciplina de contraste e evitar que tudo vire a mesma caixa escura. |
| B — Área de trabalho clara | Navegação grafite, conteúdo claro e azul nas ações. | Alternativa para leitura de documentos e tabelas. | Maior revisão de tokens, estados e contraste; benefício precisa ser comparado num protótipo. |
| C — Visual mais expressivo | Navegação e marca mais presentes, mais espaço e destaques inspirados na galeria. | Personalidade visual evidente. | Pode reduzir densidade e afastar ações dos dados; maior risco para rotina de estoque. |

Recomendação: A. Não basta recolorir. O ganho vem da hierarquia, do tratamento dos estados e de componentes específicos para saldo, itens e entregas.

## Composição proposta por área

- Estrutura geral: GAVYO Estoque na navegação; contexto curto no topo; título com ação da página; grupos atuais de navegação preservados. Sessão e Sair continuam identificáveis.
- Produtos: referência interna de maturidade; saldo/unidade dominantes, SKU secundário, atenção evidente. Melhorar largura da busca e reduzir frases que repetem catálogo.
- Compras: tabela orientada a fornecedor, pedido e situação; estados distinguíveis; acesso claro ao pedido. Filtro por status existente pode ganhar composição mais direta. Não exibir contadores por status sem dados correspondentes da API.
- Novo pedido: fornecedor separado dos itens; lista editável com produto, unidade, quantidade, custo e subtotal alinhados. Total próximo à decisão de salvar. Salvar rascunho e marcar enviado permanecem ações distintas.
- Detalhe/recebimento: fornecedor, estágio e próxima ação no topo; solicitado/recebido/restante/receber agora próximos ao mesmo item; histórico de entregas com autor e data. Preservar conferência da tentativa anterior mesmo em pedido fechado.
- Fornecedores: nome/contato como identidade; documento formatado; status discreto; pedidos relacionados no detalhe. Sem logos, avaliações ou desempenho inventados.
- Painel: conservar prioridades reais e composição assimétrica existente. Revisar peso de alertas e acesso às ações depois que o padrão comum estiver validado.

## Próxima etapa sugerida

1. Fazer um protótipo visual de Compras + Novo Pedido na direção A, com dados fictícios legíveis e também nomes longos. Comparar antes/depois em 1440×900 e 390×844. Ainda sem mudanças de banco.
2. Validar marca, hierarquia, densidade, estados e proximidade das ações com o usuário. Se houver dúvida sobre tema, comparar A e B na mesma tela, com os mesmos dados.
3. Implementar o padrão compartilhado, depois aplicar em Fornecedores e nas demais áreas. Atualizar DESIGN.md quando a direção estiver escolhida.
4. Testar teclado/foco, loading/vazio/erro, permissões, formulários alterados, confirmação e recuperação de recebimento; garantir que a mudança visual não modifique saldo ou autoria.

Nenhum código de produto, fluxo, banco ou dependência foi alterado nesta etapa de pesquisa. Não foi feito commit ou push desta pesquisa.
