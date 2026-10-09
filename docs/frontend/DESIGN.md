# Direção visual da V2

Atualização aprovada em 09/10/2026: marca **GAVYO Estoque**, geometria de **2 px** e direção grafite/azul do protótipo de Compras/Novo Pedido. Esta decisão substitui as escolhas geométricas e referências visuais históricas abaixo. Referência: Supplier Management Overview Dashboard, https://dribbble.com/shots/25174577-Supplier-Management-Overview-Dashboard. Evidências e cobertura: `artifacts/global-visual-20261009/REVIEW.md` e `index.html`.

Reutilizar a arquitetura, os grupos da navegação e os componentes atuais. O fundo da área de trabalho é #191e27, as superfícies #222833 e o azul de identidade #5275ff. Ações com texto branco usam `accent-action` (#4262e8, contraste 5,07:1) e hover #4b6bef (4,52:1). Não adicionar métricas globais calculadas apenas com a página atual da API. Compras separa pedido e fornecedor na tabela; Novo Pedido usa documento + resumo lateral no desktop e resumo no fluxo abaixo dos itens em telas menores. A gravação continua criando rascunho, seguida do detalhe e das confirmações existentes.

O produto é uma ferramenta operacional de estoque. A leitura deve começar pelo saldo, mostrar rapidamente o que precisa de atenção e manter o rastro de entradas, saídas e ajustes.

## Linguagem

- Fornecedores/Compras usam grupo próprio na sidebar e as superfícies existentes. Resumo horizontal apenas com contagens reais; tabela dominante com busca/filtros e ação principal acima. Referência específica inspecionada e comparação em `docs/COMPRAS_V1.md`; não trazer gráficos de desempenho/contratos fictícios. Formulários dedicados, quantidades/custos próximos ao item e confirmação de recebimento. Confirmar envio/recebimento é ação azul; cancelar/inativar mantém tratamento destrutivo. A operação de compra não adiciona campos de fornecedor ao cadastro de produto.

- Base grafite escura, azul cobalto como identidade principal, laranja contido em alertas e verde para disponibilidade. Vermelho fica reservado ao estoque zerado e às saídas. O bloco de alerta usa superfície escura e destaque laranja em texto e borda.
- Composição assimétrica no painel: um saldo dominante, um bloco de atenção, atividade recente e fila de reposição. Métricas equivalentes não formam uma parede de cards.
- A sidebar separa painel e operação. Produtos, Movimentações e Histórico pertencem ao mesmo grupo operacional. O item ativo usa azul, uma linha vertical e tipografia forte; não repetir numeradores em cada item.
- Listas são densas e legíveis. Produto, SKU, saldo e situação têm pesos diferentes; barras expressam a relação entre saldo e mínimo, com o mínimo marcado no meio da escala.
- Movimentações consultam a API por SKU/barcode, mostrando produto, thumbnail, saldo e situação. Fluxo: localizar → quantidade → entrada/saída → motivo → saldo previsto → confirmar entrada/saída → próximo produto. Só mostrar operação registrada depois de sucesso do POST, com saldos retornados pela API. Quantidades aceitam vírgula/ponto e até três casas; unidade acompanha o produto.
- Histórico usa tabela de auditoria real com produto/registro, data/hora, movimento, saldo anterior/final, motivo e responsável. Mantém trilho de cor/divisores, paginação e filtros de servidor. Clique neutro/Enter abre detalhe; ações internas não disparam seleção.
- Produtos usa tabela densa com thumbnail, nome/SKU/categoria, estoque visual, mínimo, preço quando informado e situação. Busca, filtros de servidor e paginação ficam visíveis. Totais pertencem ao cabeçalho. Detalhe é drawer modal, com linha selecionada distinta, foco contido, fundo inert, Escape e restauração do foco. No celular ocupa a tela inteira. Fechar o detalhe permite inspecionar outra linha. Novo Produto é ação azul acima do catálogo.
- Imagens são opcionais, com tamanho fixo e `object-fit: contain`. Imagem ausente ou quebrada tem placeholder. Os quatro SVGs locais são ilustrações dos produtos de exemplo; fotos/storage ficam para integração futura. Não armazenar base64.

## Tokens e implementação

Os tokens semânticos ficam em `apps/web/src/styles.css`: `background`, `surface`, `surface-muted`, `surface-elevated`, `surface-strong`, `border`, `border-strong`, `text-primary`, `text-secondary`, `text-muted`, `accent`, `accent-hover`, `accent-contrast`, `success`, `warning`, `danger` e `info`. Superfícies de contexto, scanner, alertas, campos e thumbnails também são centralizadas ali. Não espalhar cores de interface pelos componentes.

Geometria: radius de 2px em superfícies/controles e sem radius por linha. Tipografia Segoe UI/Arial sans-serif; título 30–38px, seções 15–24px, tabela 12–13px, metadata 11px e labels 10–11px. Números usam tabulares. Espaçamento segue ritmo de 4/8/12/16/24px; linhas do catálogo têm aproximadamente 66px no desktop. Sem sombras em superfícies comuns; sombra apenas no detalhe sobreposto.

Referências concretas: composição azul/laranja de Maruf domina identidade e hierarquia; IronNest orienta organização/sidebar; a tabela verde orienta thumbnail + nome/SKU e densidade. O layout preserva o painel assimétrico já existente e usa laranja para atenção, sem mapas, gráficos ou indicadores inventados.

Conservar contraste, foco visível, rótulos de status e números tabulares. Cor nunca é a única indicação de estado. No desktop, preservar composição/densidade; no mobile, reorganizar linhas sem rolagem horizontal. Dados das telas vêm exclusivamente da API. Fixtures pertencem somente aos testes, com identificação explícita nos relatórios; não colocar dados de exemplo como fallback em falhas de servidor.

## Formulários operacionais

- Novo Produto e Editar Produto usam uma página dedicada e o mesmo componente. Identificação é dominante, com heading mais forte e Nome maior ao lado de SKU. Imagem opcional é compacta e sem painel próprio. Comercial e controle de estoque aproveitam a largura com tipografia e divisores horizontais na mesma superfície, sem contorno externo arredondado ou divisórias verticais entre grupos. Descrição pertence a Detalhes opcionais. Sem wizard ou card para cada campo.
- As referências de formulário orientam composição, não identidade: Basit aproxima grupos comerciais e inventário; Muhammadullah orienta preenchimento imediato e imagem; ERP orienta distribuição horizontal entre identificação e controle. Não trazer contas, impostos, fornecedores ou vendas para este escopo.
- Código de barras físico é opcional e abre o cadastro, com ícone de scanner e indicação de leitura como teclado. Tab segue código de barras → Nome → SKU → Categoria → Unidade, incluindo depois a imagem opcional e os campos comerciais/estoque. Enter no barcode segue para Nome; Enter no SKU segue para Categoria; outros inputs não submetem prematuramente. Em edição, o foco inicial é Nome. SKU é interno, obrigatório e pode existir sem barcode.
- Nome, categoria e unidade são essenciais; custo/venda próximos e opcionais. Categoria usa select nativo abastecido pela API; cadastro/inativação fica no catálogo. Números são texto/inputMode decimal sem máscara ao digitar. Valores enviados são strings exatas, preços vazios viram null; edição usa o valor persistido.
- Estoque mínimo é configuração; saldo nunca é editável. Cadastro oferece Sem saldo inicial / Registrar entrada inicial, com quantidade e motivo fixo Estoque inicial. Produto nasce com zero e entrada inicial é criada na mesma transação. Edição mostra saldo consultado da API; não oferece alteração direta.
- Imagem principal usa URL HTTP(S)/null persistida, preview, trocar/remover e placeholder. Não usar URL temporária de arquivo como dado persistente. Upload de arquivo depende de storage futuro. No cadastro repetido a imagem é limpa.
- Salvar produto é primário, Salvar e criar outro é secundário e Cancelar é discreto. Barra sticky compacta, sem caixa externa, com ordem visual coerente com Tab. Campos/erros focados ficam acima das ações; ajuste de rolagem por mouse ocorre depois do clique, preservando abertura de detalhes/seleção. Cancelar com preenchimento pede confirmação modal compartilhada; continuar mantém dados. Navegação interna, sidebar e Voltar usam a mesma confirmação de descarte enquanto há alterações. Recarregar/fechar a página mantém a proteção nativa do navegador.
- Validação inline preserva dados e foca primeiro erro; duplicidade SKU/barcode vem do servidor (409). Submit tem trava, campos desabilitados enquanto grava e estado Salvando. Save-and-new limpa item/imagem/detalhes, mantém categoria/unidade e retorna foco ao código de barras.
- TanStack Query é fonte de dados; invalidar produto/produtos/categorias/movimentos/painel após sucesso. Não recarregar a página para atualizar saldo. Preservar estados de carregamento/vazio/falha com recuperação. Não prometer WebSocket ou atualização contínua entre usuários.


## Estados operacionais — 02/10/2026

- Primary: ação principal preenchida em azul. Secondary: superfície discreta e borda para alternativas importantes. Tertiary: controle leve com área de clique, hover e foco para cancelar/limpar/voltar. Destructive: vermelho contido para descartar um rascunho, com confirmação.
- Estados de hover, pressed, disabled e focus-visible são compartilhados em styles.css. Foco azul, transições de 150 ms e alvos de 44 px para os controles principais no mobile. Respeitar prefers-reduced-motion. Estado desabilitado mantém legibilidade e cursor coerente.
- Selects continuam nativos, com chevron, borda, superfície, padding e foco do produto; teclado/opções continuam sob controle do navegador. Quantidade aceita teclado; Entrada/Saída usa radios nativos com seleção explícita, texto e sinais.
- Linhas de Produtos/Histórico respondem à linha inteira; Enter/Space abrem detalhes. Chevron aparece em hover/focus no desktop e permanece disponível no touch. Seleção possui superfície azul distinta. Badges permanecem informativos, sem hover de botão.
- Histórico mostra nome/SKU na linha; UUID completo pertence ao detalhe, com Copiar ID. Período invertido mantém os campos, mostra erro junto às datas e desabilita a consulta antes da API.
- O painel destaca produtos ativos, evitando somar unidades incompatíveis. Zero alertas usa superfície positiva; alertas usam laranja. O gráfico usa número de registros por dia, com tooltip de data/entradas/saídas em hover, foco e toque; Escape dispensa o tooltip. Os campos entryRecords/exitRecords foram acrescentados à resposta da API para essa apresentação.
- Scanner reduz a presença visual após identificar o item. Saldo previsto atualiza durante o preenchimento; Confirmar entrada/saída executa a operação. A API continua autoritativa para saldo e conflitos. Sucesso bloqueia nova confirmação até a próxima leitura, evitando repetição acidental.
- Drawers usam o componente compartilhado com header fixo, conteúdo rolável, fechar com alvo adequado e edição como botão secundário. Desktop e mobile são modais nesta rodada.

Evidências e limites em UI_INTERACTION_REVIEW.md e artifacts/ui-interaction-20261002.

## Feedback operacional — 07/10/2026

Usar FeedbackProvider/useFeedback para resultados de ações, Alert para problemas persistentes da página, FieldError para preenchimento e ConfirmDialog para descarte/inativação. ConfirmDialog reutiliza o comportamento modal de DetailDrawer. Manter cor como pequeno acento, com ícone e texto; usar tokens existentes. Não criar avisos por clique, Undo sem operação de domínio ou sucesso de download sem comprovação.

Success 4 s, info 5 s, warning 7 s; error e mensagens com CTA permanecem até ação/dispensa. Pausar em hover, foco, aba oculta ou superfície modal. No máximo três visíveis, fila para as demais. Desktop inferior direito, acima do footer sticky; mobile no topo com margens e quebra de texto. A fila atravessa navegação e é limpa ao encerrar/rejeitar sessão; não persiste no reload. Detalhes de importação/auditoria permanecem na página. O painel mantém seus alertas próprios de reposição.

Uma falha de atualização com sessão/dados já conhecidos não deve desmontar um formulário e perder rascunho. 401 segue revogando acesso. Relatório, mensagens e evidências em artifacts/feedback-20261007/REVIEW.md.

## Acesso por perfil — 08/10/2026

Consultar `hasPermission` da política shared para ações restritas; matriz em `docs/PERMISSOES.md`. OPERATOR mantém Novo produto e detalhes, mas não Editar produto, Categorias ou Importar planilha. Backups aparece apenas para ADMIN. Acesso direto a uma rota restrita mostra Alert com retorno ao catálogo e não monta o formulário. Não oferecer um botão que terminará em 403 para o perfil conhecido; a API continua autoritativa quando o perfil muda durante uma sessão.
