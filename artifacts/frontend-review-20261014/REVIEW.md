# GAVYO — revisão do frontend após os ajustes

14/10/2026. Base a1d9f3b. Levantamento: não foram feitas correções no código nesta rodada.

## Cobertura e evidências

Navegador local com dados fictícios: Dashboard, Produtos, Categorias, novo produto, Compras, Fornecedores, Inventário físico, Backups, Importação, busca global e endereço inválido. Produtos e novo produto também tiveram dimensões/estrutura conferidas em 390×700: documento sem overflow horizontal global (385px úteis para 390px de viewport). Override foi removido e a aba voltou ao Dashboard.

Código revisado: componentes acima, Histórico, carregamento/paginação, consultas/cache, permissões, CSS e rotas. Não foram salvos produtos/categorias, criadas compras, feitas importações ou gerados backups. O único preenchimento de cadastro foi um rascunho local de categoria usado para reproduzir sua substituição.

**V**: confirmado no navegador nesta rodada. **C**: confirmado na implementação; impacto precisa de teste específico quando indicado. Prioridade se refere à experiência de uso, não a uma classificação de segurança ou integridade do banco.

## Problemas confirmados no uso

### 1. Alta — trocar de categoria apaga o preenchimento sem aviso [V/C]

Reprodução: Produtos → Categorias → digitar `Rascunho auditoria - nao salvar` no Nome de uma nova categoria → clicar na categoria existente QA Compras. O formulário mudou para Editar categoria e o nome passou a QA Compras, sem confirmação. O rascunho foi perdido.

Local: `apps/web/src/CategoryManager.tsx:24–27`. A seleção de outro item e o botão Nova categoria substituem o estado diretamente; não há proteção de alterações não salvas como nos formulários principais.

Correção: detectar diferença em relação aos valores carregados e confirmar antes de trocar/criar/abandonar. Cancelar a troca mantém todos os campos; salvar atualiza a referência. Evitar dialog dentro de dialog com dois mecanismos de foco competindo; confirmação dentro do painel ou composição apropriada.

Evidência: `category-draft-overwritten.png` e snapshot da execução. Nenhuma categoria foi salva.

### 2. Alta — seleção da busca muda quando chegam produtos [V/C]

Reprodução: busca do topo → digitar `produto` → pressionar seta para baixo antes de concluir a consulta. A opção selecionada era **Novo produto / Abrir função**. Quando os produtos chegaram, a opção selecionada passou sozinha para **Produto visual QA editado 20261009 / VISUAL-QA-20261009**. Enter nesse momento abriria outro destino.

Local: `apps/web/src/GlobalSearch.tsx:23–27,50`. Produtos são inseridos antes das funções e a seleção é mantida por índice, não pela identidade da opção.

Correção: manter o item ativo por path/identidade estável. Enquanto a consulta chega, não transferir a seleção escolhida pelo teclado para outra opção. Se o item selecionado deixar de existir, definir comportamento explícito e anunciar a mudança. Testar com resposta lenta, resultado vazio, mouse e teclado.

Evidência: seleção inicial Novo produto no snapshot; `search-selection-shift.png` mostra o resultado selecionado após a resposta. Não foi acionado Enter no destino incorreto.

### 3. Média — endereço desconhecido resulta em tela vazia [V/C]

Reprodução: abrir `/pagina-inexistente-qa`. A página não mostrou título, navegação, explicação nem ação de retorno; snapshot continha apenas regiões globais vazias de aviso. Voltamos ao Dashboard depois do teste.

Local: `apps/web/src/App.tsx` não tem rota final de página não encontrada. `main.tsx` também não define recuperação própria de erro de renderização.

Correção: página 404 dentro da composição do sistema, com Voltar/Ir ao início. Separadamente, definir uma tela amigável para falha inesperada de renderização. Não mostrar mensagem de sucesso nem redirecionar silenciosamente escondendo a causa.

Evidência: `missing-route.png`.

### 4. Média — status de compra quebra palavras no meio [V/C]

Reprodução em viewport desktop normal desta sessão (~989px): Compras → pedidos parcialmente recebidos. O chip dividiu `Parcialmente` em `Parcialmen` e `te recebido`.

Local: `styles.css:11–13`, tabela de `Purchases.tsx`. `overflow-wrap:anywhere` e a largura disponível prejudicam o rótulo do estado.

Correção: permitir quebra entre palavras, preservar largura mínima ou usar rótulo compacto Parcial com significado completo acessível nos detalhes. Rever prioridade/largura das colunas nessa faixa de tela.

Evidência: `purchase-status-wrap.png`.

## Riscos identificados no código

### 5. Média — falha de atualização pode esconder dados já carregados [C; falta teste de rede]

`data-controls.tsx:17` só mantém children em erro quando retainContentOnError é true. Produtos e listagens de Compras/Fornecedores não adotam essa retenção. Um erro de atualização pode trocar a lista por um alerta mesmo havendo dados em cache.

Correção: reter dados com aviso claro de desatualização, retry e política de ações seguras. Não apresentar cache como consulta atual. Testar falha depois de carregar e falha ao mudar filtro; são cenários diferentes.

### 6. Média — cache da busca global não acompanha invalidação de produtos [C; falta teste com edição]

`GlobalSearch.tsx:17` usa a chave global-search. `useInventoryMutation` invalida products/product/movements/dashboard/categories, mas não essa chave. A busca pode mostrar cache anterior durante uma atualização; o estado de espera considera isPending, não todo refetch com dados existentes.

Correção: integrar invalidação e representar atualização. Testar alterar nome/SKU/situação, abrir novamente a busca e comparar com detalhe/lista. Não foi editado produto para reproduzir nesta rodada.

### 7. Média — atualização entre operadores pouco explícita [C; falta teste com duas sessões]

As consultas normais em `inventory-api.ts` não têm monitor de mudanças enquanto a tela permanece aberta. Refetch em foco não comunica, por si só, quando outra pessoa movimenta estoque.

Correção: última atualização visível, atualização manual e estratégia discreta de revalidação conforme a tela. Preservar drafts de formulários. Isso não prova que o backend permita saldo incorreto; o ponto é o que o frontend apresenta.

### 8. Média — orientação de categoria vazia ignora permissões [C; cenário não disponível no dataset]

`ProductForm.tsx:130` diz Cadastre uma categoria no catálogo antes de salvar quando não há categorias ativas. OPERATOR pode criar produto, mas não gerenciar categorias; a orientação não é executável por esse perfil.

Correção: mostrar orientação por permissão: criar categoria para ADMIN/MANAGER ou pedir ao responsável para OPERATOR. Indicar o requisito antes de preencher o cadastro completo.

## Melhorias de acabamento e produtividade

### 9. Baixa — recuperação dos filtros não é uniforme [V/C]

Produtos e Histórico têm Limpar filtros. Compras/Fornecedores exigem limpar texto e restaurar selects separadamente, sem um reset geral equivalente. Na busca sem resultado de Compras a mensagem já orienta ajustar a busca corretamente; falta uma ação direta de recuperação. Padronizar reset e filtros aplicados sem apagar seleção/draft de outra operação.

### 10. Baixa — contatos e documentos difíceis de escanear [V/C]

Fornecedores mostra CPF/CNPJ como sequência de dígitos e e-mails quebrados em fragmentos nas colunas estreitas. Exemplo fictício: 12345678000190 e vendas@horizonte.example.test.

Correção: formatar documento válido para exibição, preservar valor original e facilitar copiar telefone/e-mail; rever largura/truncamento com acesso ao texto completo. Não mudar o dado persistido apenas para melhorar apresentação.

### 11. Baixa — paginação e textos de quantidade [V/C]

Inventário com um registro mostrou `1 registros · página 1 de 1`, Anterior/Próxima desabilitados. Listas vazias ou de uma página também reservam espaço para botões sem utilidade. `data-controls.tsx:19–22`.

Correção: singular/plural correto, resumo compacto e botões somente quando houver navegação. Produtos/Histórico também dão foco na linha e no botão de detalhes, gerando duas paradas para a mesma abertura; rever percurso de teclado sem transformar a tabela em grid artificialmente.

### 12. Baixa — reduzir custo inicial e manter busca acessível [C; melhoria a medir]

Todas as páginas são importadas diretamente em App.tsx. O build recente registra um pacote JavaScript de aproximadamente 1,1MB antes de gzip (~282kB comprimido). Esse tamanho não é prova de lentidão real, mas há oportunidade de carregar formulários/áreas secundárias por rota. Medir carregamento/navegação antes e depois.

O cabeçalho com busca sai da vista ao rolar a página. Avaliar header sticky ou acesso discreto fixo à busca, principalmente em mobile; Ctrl+K já oferece recuperação por teclado no desktop. Preservar espaço útil e evitar camadas que cubram filtros/dialogs.

## Ordem sugerida

1. Seleção estável da busca e proteção do formulário de categorias.
2. Recuperação 404/erro e preservação de dados em falha de consulta.
3. Cache/atualização entre usuários e orientação por permissões.
4. Tabelas, filtros, documentos, plural/paginação e performance medida.

## O que já está funcionando / limites

Sidebar não voltou a bloquear o desktop nesta inspeção; busca encontra produtos e funções, rotas reais abrem, dados locais são exibidos e estrutura mobile de Produtos/novo produto não mostrou overflow horizontal global. Importação explica limites/etapas e Backups apresenta vazio e agendamento sem exigir criar cópia para entender a tela.

Não é validação completa de backend, concorrência, leitor de tela, celular físico ou rede lenta. Os itens C/P não devem ser apresentados como bugs reproduzidos. Capturas mobile do provedor desta sessão tiveram escala de apresentação irregular; conclusões de dimensões usam DOM, não estimativa por imagem. Não houve alteração no código do sistema nesta rodada, apenas este relatório e evidências.
