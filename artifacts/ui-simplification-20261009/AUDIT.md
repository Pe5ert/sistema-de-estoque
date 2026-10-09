# Auditoria antes da implementação — 09/10/2026

Base: 53cb7b0. Capturas reais das nove telas, API e PostgreSQL local isolado; nenhum dado de produção.

## Referências inspecionadas

- [Shopify](https://help.shopify.com/pt-BR/manual/products/inventory/adjusting-inventory/viewing-inventory): documentação de consulta, pesquisa, filtros e estados de estoque. A página fornecida não apresenta uma captura completa da tabela do produto.
- [Square](https://api.squareup.com/help/au/en/article/5958-vendor-management): documentação do fluxo fornecedor/pedido/itens/rascunho. Não é uma captura completa do formulário de compra.
- [Linear](https://linear.app/changelog/2026-03-12-ui-refresh): imagem e anúncio vistos; cabeçalhos, controles e navegação consistentes, com contraste contido na navegação.
- [Supplier Management](https://dribbble.com/shots/25174577-Supplier-Management-Overview-Dashboard): imagem original vista em `../visual-pilot-20261008/reference.png`. Hierarquia entre resumo e tabela; manter a adaptação grafite/azul de 2 px aprovada, sem copiar arredondamento ou inventar métricas.

## Decisão de produto

Ferramenta operacional para equipe de loja/estoque. A primeira leitura deve localizar uma ação, um produto ou uma falta de saldo. O título identifica a página; controles explicam o trabalho por seus rótulos. Busca e filtros ficam junto aos dados. Ajuda extensa é sob demanda; avisos que evitam alteração indevida de estoque permanecem junto à ação. Reutilizar React, rotas, permissões e componentes existentes. Não alterar contratos, banco ou regras.

## Diagnóstico por tela

| Tela | Texto removível/duplicado | Termo/hierarquia | Ação e melhoria concreta |
| --- | --- | --- | --- |
| Dashboard | Descrição da página, posição atual, fluxo recente, fila de atenção, parágrafo repetindo saldo | Múltiplos níveis antes dos valores e atividades | Ações junto ao título; prioridades e saldo dominantes; manter unidade do gráfico e exclusão de produtos sem custo |
| Produtos | Descrição + apresentação + catálogo de produtos | Título repetido separa busca e ação | Novo produto junto ao título; busca/filtros antes das linhas; quantidade compacta e detalhes acessíveis |
| Movimentações | Posto de operação; aguardando leitura e instrução repetidas; texto do bloco vazio | Linguagem de estação técnica antes da tarefa | Localizar produto em destaque; instrução curta de Enter; saldo previsto, insuficiência e confirmação preservados |
| Compras | Descrição, pedidos e entregas, pedidos de compra | Status pode usar Situação sem alterar enum/API | Novo pedido junto ao título; tabela e filtros dominantes; envio continua explicitamente uma marcação |
| Novo pedido | Numeração 01/02; vazio repetindo placeholder; observações sempre expandidas | Espaço excessivo antes dos itens | Fornecedor → itens → total/salvar; observações sob demanda, abertas em edição quando preenchidas; manter aviso de efeito no estoque |
| Fornecedores | Descrição, relacionamentos, finalidade da operação; fornecedor repetido | Resumo ocupa espaço de uma seção inteira | Ação junto ao título; contagens reais compactas junto à lista; contatos não preenchidos sem frase genérica sobre tipo de pessoa |
| Inventário físico | Descrição, texto introdutório e contagens/resultados | Título de lista redundante | Novo inventário junto ao título; filtro de situação com a lista; manter referência de saldo, limite e ajuda |
| Histórico | Faixa de rastreabilidade, propósito e contador repetido na paginação | Auditoria deve começar pelos registros | Remover faixa; filtros diretamente sobre tabela; manter antes/depois, responsável, ordenação e erro de datas |
| Importação | Descrição, enviar planilha de produtos, envie seu arquivo, consultar operações anteriores | Várias explicações antes de selecionar arquivo | Seleção de arquivo direta; modelo/ajuda sob demanda; conservar limites, validação e confirmação |

## Verificação planejada

Comparar capturas e posição dos dados/ações. Testar busca e detalhe por teclado, cadastro, entrada, insuficiência, pedido e recebimento em base local. Conferir persistência e reflexos no Histórico/Dashboard. Testar responsividade real dentro de um iframe com largura de 390 px: o controle de viewport do navegador retornou 1280 px apesar da solicitação e as capturas inicialmente nomeadas mobile foram descartadas. Não confundir essas capturas com validação mobile. Testes de equipe iniciante exigem pessoas reais e não são substituídos pela revisão do agente.
