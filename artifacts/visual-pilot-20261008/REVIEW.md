# GAVYO — piloto visual de Compras e Novo Pedido

08/10/2026. Etapas 1–4 concluídas para avaliação; etapa 5 depende da revisão do usuário. Não é implantação de frontend.

## Abrir

- Comparação: http://localhost:5180/comparison.html
- Compras: http://localhost:5180/index.html#purchases
- Novo Pedido preenchido: http://localhost:5180/index.html?example=1#new
- Novo Pedido vazio: botão Novo pedido na listagem ou ferramenta Pedido vazio.
- Retomada do servidor: Node 22, `node artifacts/visual-pilot-20261008/serve.mjs`, a partir da raiz do repositório. Porta 5180, somente loopback. Os arquivos HTML também abrem diretamente no navegador.

Dados fictícios, identificados no topo, exclusivamente em memória. Recarregar reinicia a demonstração. Não há fetch, conexão com API, autenticação, localStorage, escrita no banco ou envio ao fornecedor.

## 1. Auditoria

Lidos PESQUISA_VISUAL_20261008.md, DESIGN.md, AGENTS.md, PurchaseForm.tsx, Purchases.tsx e os estilos envolvidos. Baseline de implementação `80bed5a` na branch `feat/suppliers-purchases`.

| Problema concreto | Impacto | Decisão no piloto |
| --- | --- | --- |
| ESTOQUE V2 e repetição institucional no topo | Identidade fraca e ruído antes da tarefa | Wordmark GAVYO Estoque e contexto curto. O símbolo G é um estudo, não uma marca final aprovada. |
| Estados de pedidos com o mesmo tratamento cinza | Leitura lenta da fila | Rascunho neutro, enviado azul, parcial âmbar, recebido verde, cancelado discreto. Texto e sinal acompanham a cor. |
| Pedido/fornecedor e metadata sem hierarquia suficiente | Dificuldade para reconhecer e comparar pedidos | Fornecedor próprio, número legível, autoria secundária, valores alinhados à direita e data compacta. |
| Formulário amplo com campos e explicações em sequência | Não expressa uma composição de pedido | Documento de itens à esquerda e resumo à direita; fornecedor/contexto antes da edição. |
| Busca, filtros e título reiteram informações | Espaço consumido sem decisão adicional | Controles próximos da tabela; resumo horizontal, sem três cards equivalentes. |
| Mobile atual reproduz pares de labels por célula | Muitos metadados antes de entender o pedido | Linha operacional por pedido: número/status, fornecedor, data/itens/valor e ação. Autor no detalhe. |

## 2. Referência e tradução

Imagem completa inspecionada visualmente e preservada como [reference.png](reference.png). Fonte: [Supplier Management Overview Dashboard, Nabil no Dribbble](https://dribbble.com/shots/25174577-Supplier-Management-Overview-Dashboard), chamada de Awe Saas no briefing.

Da imagem: áreas amplas com limites suaves, navegação independente, título forte, busca arredondada, tabela com poucos divisores e status suaves. Compras aplica essa hierarquia com grafite/azul; Novo Pedido traduz a região lateral de contexto em resumo da compra. O shot não mostra formulário: essa parte é uma interpretação para a tarefa. Gráficos, contratos, marca e rankings não foram reproduzidos.

Geometria em avaliação: 14 px nas superfícies, 8 px nos campos, ações arredondadas; em vez dos 4 px globais atuais. Sem gradientes ou sombras grandes. Sombra apenas na lista sobreposta de resultados. Tipografia sans do sistema com fallback Segoe UI/Arial; nenhuma fonte externa instalada. O objetivo é proximidade de princípios, não reprodução pixel a pixel de uma interface clara e inclinada.

## 3. Protótipo inspecionável

Compras: tabela central; resumo calculado sobre fixtures locais; abas Todos/Em aberto/Parciais; busca; filtro de situação; paginação; abertura por clique/Enter; edição de rascunho e detalhe demonstrativo dos demais estados.

Novo Pedido: busca/seleção de fornecedor com opção atual preservada; documento e contato; número/data/autor somente leitura; busca por nome/SKU/barcode; adição por resultado ou Enter; quantidade/custo/subtotal por item; remoção; observações opcionais; total; salvar rascunho; continuar editando; revisar/confirmar envio. Itens novos recebem quantidade e custo vazios. Leitura de código já presente foca o item sem duplicar.

Desktop: resumo acompanha a rolagem na coluna lateral. Mobile: item editável em duas colunas e subtotal separado; total/ações em fluxo normal, com atalho Resumo e salvar no início. Adicionar outro produto retorna à busca. Ferramenta de avaliação permite 24 itens com nomes curtos e longos.

Valor em aberto significa a soma integral dos pedidos abertos, não o custo do restante recebido/pendente nem contas a pagar. Unidades não são somadas entre produtos. Total incompleto é identificado como parcial e bloqueia salvar.

## 4. Comparação

[comparison.html](comparison.html) permite alternar Compras/Novo Pedido e desktop/mobile. Mostra atual e proposta lado a lado no desktop, com referência e justificativa abaixo. Em janela estreita, as imagens se sucedem e podem ser abertas individualmente.

Capturas em viewports verificados de 1440×900 e 390×844. A ferramenta captura a área útil sem a barra de rolagem: imagens desktop 1425×891, mobile 375 px de largura. Antes/depois desktop têm dimensões iguais. Novo Pedido atual está vazio; a proposta preenchida tem três fixtures. O controle Comparar pedido vazio fornece comparação no mesmo estágio. Dados da listagem também diferem; não atribuir melhoria de desempenho ou quantidade de linhas à composição apenas por esses prints.

- [Compras proposta desktop](proposed-purchases-desktop.jpg) / [mobile](proposed-purchases-mobile.jpg).
- [Novo Pedido proposta desktop](proposed-new-desktop.jpg) / [mobile completo](proposed-new-mobile.jpg).
- [Novo Pedido vazio desktop](proposed-new-empty-desktop.jpg) / [mobile](proposed-new-empty-mobile.jpg).
- [Antes/depois Compras](comparison-purchases-desktop.jpg) / [Novo Pedido](comparison-new-desktop.jpg).
- [24 itens, tablet com resumo visível](many-items-tablet.jpg) / [mobile no resumo](many-items-mobile-summary.jpg).
- Screenshots atuais: current-purchases-desktop.jpg, current-purchases-mobile.jpg, current-new-desktop.jpg, current-new-mobile.jpg. Capturadas em banco local de QA, sem salvar novos pedidos.

## Verificação executada

| Cenário | Resultado observado |
| --- | --- |
| Desktop 1440×900 e mobile 390×844 | Inspeção visual das duas propostas; nenhum overflow horizontal nos pontos medidos. |
| Tablet 1024×768, 24 itens | Sem overflow; resumo sticky a 24 px do topo ao editar item 24. |
| 24 itens no mobile | Total R$ 3.000,00; resumo estático; atalho coloca Salvar dentro do viewport, sem barra sobre campos. |
| Adicionar ZIP-020 por Enter | Quarto item, quantidade/custo vazios, foco em quantidade, salvar bloqueado. |
| Quantidade -1 / custo 2,999 | Erros inline e salvar bloqueado; preenchimento preservado. |
| Correção para 10 × 2,50 | Subtotal R$ 25,00; total do exemplo de quatro itens R$ 4.083,60. |
| Salvar → revisar → confirmar | Rascunho PC-000129 e status Enviado somente em memória; busca encontra um pedido. |
| Busca sem resultado | Estado vazio com Limpar filtros; recuperação retorna à lista. |
| Aba Parciais | Dois pedidos correspondentes; paginação respeita o filtro. |
| Buscar fornecedor Trama | Opção selecionada Horizonte permanece; Trama pode ser escolhido. |
| Cancelar → continuar | Modal nomeado; fornecedor Trama e três itens preservados. Descartar retorna à lista. |
| Abrir linha mobile por Enter, fechar com Escape | Dialog abre; foco retorna à linha PC-000128. |
| Sintaxe Node | pilot.js e serve.mjs passaram na verificação. |

Uma falha de sintaxe durante ajuste experimental da busca foi corrigida antes da entrega. As imagens foram recapturadas na versão final. Não foram executados lint/typecheck/build do produto porque nenhum arquivo do aplicativo foi alterado. Testes prévios de compras não representam teste deste protótipo, e testes deste protótipo não representam integração real.

## Limites e integração futura

- Não há carregamento/falha de rede real ou conflitos de API no arquivo estático; não foram validados nesta rodada. A implementação deve conservar DataState, Alert, Field/FieldError, ConfirmDialog, DetailDrawer, feedback e UnsavedForm existentes. Dialog nativo e aviso do HTML isolado são instrumentos do protótipo, não substitutos desses componentes.
- Busca local tem poucos fornecedores/produtos. Busca/paginação do servidor e seleção ativa precisam continuar na integração. Contagens globais por estado requerem suporte verificável da API; não podem ser inferidas de uma página ou virar dados de fallback.
- Recebimento, cancelamento operacional e recovery de UUID continuam no módulo atual; não foram redesenhados nem reimplementados. Ver pedido é uma inspeção demonstrativa, sem alteração de saldo.
- Permissões reais permanecem no aplicativo. Persona ADMIN fictícia não autentica nem concede acesso. Versão OPERATOR será validada na integração, preservando leitura sem escrita.
- Navegação explícita do protótipo e reload protegem alterações; o histórico Voltar/Avançar do navegador não implementa o bloqueador completo do React. Na produção, reutilizar o bloqueio atual.
- Não foram testados leitor de tela, bipador físico, browser mobile real ou desempenho com 100 itens. Os 24 itens verificam composição e rolagem, não carga de produção.
- Scope de arquivos: exclusivamente artifacts/visual-pilot-20261008. Pesquisa prévia e onboarding continuam locais e preservados. Nenhum commit/push realizado nesta rodada, nenhuma alteração de domínio/schema/banco ou estilos globais.

## 5. Revisão do usuário

Avaliar composição, contraste das superfícies, geometria arredondada, densidade da tabela, formulário com resumo lateral e adaptação mobile. Depois de escolhida a direção, implementar primeiro as duas telas piloto; outras áreas aguardam autorização. DESIGN.md continua com as regras anteriores até essa escolha.
