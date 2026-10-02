# Direção visual da V2

O produto é uma ferramenta operacional de estoque. A leitura deve começar pelo saldo, mostrar rapidamente o que precisa de atenção e manter o rastro de entradas, saídas e ajustes.

## Linguagem

- Base grafite escura, azul cobalto como identidade principal, laranja contido em alertas e verde para disponibilidade. Vermelho fica reservado ao estoque zerado e às saídas. O bloco de alerta usa superfície escura e destaque laranja em texto e borda.
- Composição assimétrica no painel: um saldo dominante, um bloco de atenção, atividade recente e fila de reposição. Métricas equivalentes não formam uma parede de cards.
- A sidebar separa painel e operação. Produtos, Movimentações e Histórico pertencem ao mesmo grupo operacional. O item ativo usa azul, uma linha vertical e tipografia forte; não repetir numeradores em cada item.
- Listas são densas e legíveis. Produto, SKU, saldo e situação têm pesos diferentes; barras expressam a relação entre saldo e mínimo, com o mínimo marcado no meio da escala.
- Movimentações consultam a API por SKU/barcode, mostrando produto, thumbnail, saldo e situação. Fluxo: localizar → quantidade → entrada/saída → motivo → prévia → confirmar → próximo produto. Só mostrar operação registrada depois de sucesso do POST, com saldos retornados pela API. Quantidades aceitam vírgula/ponto e até três casas; unidade acompanha o produto.
- Histórico usa tabela de auditoria real com produto/registro, data/hora, movimento, saldo anterior/final, motivo e responsável. Mantém trilho de cor/divisores, paginação e filtros de servidor. Clique neutro/Enter abre detalhe; ações internas não disparam seleção.
- Produtos usa tabela densa com thumbnail, nome/SKU/categoria, estoque visual, mínimo, preço quando informado e situação. Busca, filtros de servidor e paginação ficam visíveis. Totais pertencem ao cabeçalho. Detalhe é drawer modeless no desktop, permitindo trocar seleção sem fechar; fullscreen/modal no celular, com foco contido, fundo inert, Escape e edição. Novo Produto é ação azul acima do catálogo.
- Imagens são opcionais, com tamanho fixo e `object-fit: contain`. Imagem ausente ou quebrada tem placeholder. Os quatro SVGs locais são ilustrações dos produtos de exemplo; fotos/storage ficam para integração futura. Não armazenar base64.

## Tokens e implementação

Os tokens semânticos ficam em `apps/web/src/styles.css`: `background`, `surface`, `surface-muted`, `surface-elevated`, `surface-strong`, `border`, `border-strong`, `text-primary`, `text-secondary`, `text-muted`, `accent`, `accent-hover`, `accent-contrast`, `success`, `warning`, `danger` e `info`. Superfícies de contexto, scanner, alertas, campos e thumbnails também são centralizadas ali. Não espalhar cores de interface pelos componentes.

Geometria: radius de 4px em superfícies/controles e sem radius por linha. Tipografia Arial/Segoe UI sans-serif; título 30–38px, seções 15–24px, tabela 12–13px, metadata 11px e labels 10–11px. Números usam tabulares. Espaçamento segue ritmo de 4/8/12/16/24px; linhas do catálogo têm aproximadamente 66px no desktop. Sem sombras em superfícies comuns; sombra apenas no detalhe sobreposto.

Referências concretas: composição azul/laranja de Maruf domina identidade e hierarquia; IronNest orienta organização/sidebar; a tabela verde orienta thumbnail + nome/SKU e densidade. O layout preserva o painel assimétrico já existente e usa laranja para atenção, sem mapas, gráficos ou indicadores inventados.

Conservar contraste, foco visível, rótulos de status e números tabulares. Cor nunca é a única indicação de estado. No desktop, preservar composição/densidade; no mobile, reorganizar linhas sem rolagem horizontal. Dados das telas vêm exclusivamente da API. Fixtures pertencem somente aos testes, com identificação explícita nos relatórios; não colocar dados de exemplo como fallback em falhas de servidor.

## Formulários operacionais

- Novo Produto e Editar Produto usam uma página dedicada e o mesmo componente. Identificação é dominante, com heading mais forte e Nome maior ao lado de SKU. Imagem opcional é compacta e sem painel próprio. Comercial e controle de estoque aproveitam a largura com tipografia e divisores horizontais na mesma superfície, sem contorno externo arredondado ou divisórias verticais entre grupos. Descrição pertence a Detalhes opcionais. Sem wizard ou card para cada campo.
- As referências de formulário orientam composição, não identidade: Basit aproxima grupos comerciais e inventário; Muhammadullah orienta preenchimento imediato e imagem; ERP orienta distribuição horizontal entre identificação e controle. Não trazer contas, impostos, fornecedores ou vendas para este escopo.
- Código de barras físico é opcional e abre o cadastro, com ícone de scanner e indicação de leitura como teclado. Tab segue código de barras → Nome → SKU → Categoria → Unidade, incluindo depois a imagem opcional e os campos comerciais/estoque. Enter no barcode segue para Nome; Enter no SKU segue para Categoria; outros inputs não submetem prematuramente. Em edição, o foco inicial é Nome. SKU é interno, obrigatório e pode existir sem barcode.
- Nome, categoria e unidade são essenciais; custo/venda próximos e opcionais. Categoria usa select nativo abastecido pela API; cadastro/inativação fica no catálogo. Números são texto/inputMode decimal sem máscara ao digitar. Valores enviados são strings exatas, preços vazios viram null; edição usa o valor persistido.
- Estoque mínimo é configuração; saldo nunca é editável. Cadastro oferece Sem saldo inicial / Registrar entrada inicial, com quantidade e motivo fixo Estoque inicial. Produto nasce com zero e entrada inicial é criada na mesma transação. Edição mostra saldo consultado da API; não oferece alteração direta.
- Imagem principal usa URL HTTP(S)/null persistida, preview, trocar/remover e placeholder. Não usar URL temporária de arquivo como dado persistente. Upload de arquivo depende de storage futuro. No cadastro repetido a imagem é limpa.
- Salvar produto é primário, Salvar e criar outro é secundário e Cancelar é discreto. Barra sticky compacta, sem caixa externa, com ordem visual coerente com Tab. Campos/erros focados ficam acima das ações; ajuste de rolagem por mouse ocorre depois do clique, preservando abertura de detalhes/seleção. Cancelar com preenchimento pede confirmação inline; continuar mantém dados. Recarregar/sair da página recebe a proteção nativa do navegador enquanto há alterações.
- Validação inline preserva dados e foca primeiro erro; duplicidade SKU/barcode vem do servidor (409). Submit tem trava, campos desabilitados enquanto grava e estado Salvando. Save-and-new limpa item/imagem/detalhes, mantém categoria/unidade e retorna foco ao código de barras.
- TanStack Query é fonte de dados; invalidar produto/produtos/categorias/movimentos/painel após sucesso. Não recarregar a página para atualizar saldo. Preservar estados de carregamento/vazio/falha com recuperação. Não prometer WebSocket ou atualização contínua entre usuários.
