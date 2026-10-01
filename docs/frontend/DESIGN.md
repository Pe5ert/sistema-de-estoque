# Direção visual da V2

O produto é uma ferramenta operacional de estoque. A leitura deve começar pelo saldo, mostrar rapidamente o que precisa de atenção e manter o rastro de entradas, saídas e ajustes.

## Linguagem

- Base grafite escura, azul cobalto como identidade principal, laranja contido em alertas e verde para disponibilidade. Vermelho fica reservado ao estoque zerado e às saídas. O bloco de alerta usa superfície escura e destaque laranja em texto e borda.
- Composição assimétrica no painel: um saldo dominante, um bloco de atenção, atividade recente e fila de reposição. Métricas equivalentes não formam uma parede de cards.
- A sidebar separa painel e operação. Produtos, Movimentações e Histórico pertencem ao mesmo grupo operacional. O item ativo usa azul, uma linha vertical e tipografia forte; não repetir numeradores em cada item.
- Listas são densas e legíveis. Produto, SKU, saldo e situação têm pesos diferentes; barras expressam a relação entre saldo e mínimo, com o mínimo marcado no meio da escala.
- Movimentações têm um posto de consulta local por SKU ou código de barras cadastrado na sessão e um produto identificado com thumbnail, saldo e status. O fluxo é localizar → quantidade → entrada/saída → motivo → prévia → próximo produto. Quantidades aceitam vírgula/ponto e até três casas; a unidade acompanha o produto. Nenhum movimento é gravado; não apresentar feedback de operação concluída.
- Histórico usa tabela de auditoria com produto/registro, data/hora, movimento, saldo anterior/final, motivo e responsável. Mantém o trilho de cor por tipo, divisores e filtro local de movimento.
- Produtos usa tabela densa com thumbnail, nome/SKU/categoria, estoque visual, mínimo, preço quando informado e status. Busca e filtros ficam visíveis. Os totais pertencem ao cabeçalho do catálogo, sem repetir um banner. O detalhe usa dialog nativo, com foco, Escape e acesso à página de edição. Novo Produto é uma ação azul visível acima do catálogo.
- Imagens são opcionais, com tamanho fixo e `object-fit: contain`. Imagem ausente ou quebrada tem placeholder. Os quatro SVGs locais são ilustrações dos produtos de exemplo; fotos/storage ficam para integração futura. Não armazenar base64.

## Tokens e implementação

Os tokens semânticos ficam em `apps/web/src/styles.css`: `background`, `surface`, `surface-muted`, `surface-elevated`, `surface-strong`, `border`, `border-strong`, `text-primary`, `text-secondary`, `text-muted`, `accent`, `accent-hover`, `accent-contrast`, `success`, `warning`, `danger` e `info`. Superfícies de contexto, scanner, alertas, campos e thumbnails também são centralizadas ali. Não espalhar cores de interface pelos componentes.

Geometria: radius de 4px em superfícies/controles e sem radius por linha. Tipografia Arial/Segoe UI sans-serif; título 30–38px, seções 15–24px, tabela 12–13px, metadata 11px e labels 10–11px. Números usam tabulares. Espaçamento segue ritmo de 4/8/12/16/24px; linhas do catálogo têm aproximadamente 66px no desktop. Sem sombras em superfícies comuns; sombra apenas no detalhe sobreposto.

Referências concretas: composição azul/laranja de Maruf domina identidade e hierarquia; IronNest orienta organização/sidebar; a tabela verde orienta thumbnail + nome/SKU e densidade. O layout preserva o painel assimétrico já existente e usa laranja para atenção, sem mapas, gráficos ou indicadores inventados.

Conservar contraste, foco visível, rótulos de status e números tabulares. Cor nunca é a única indicação de estado. Evitar barras, ícones e marcas sem função informativa. No desktop, preservar a composição e densidade; no mobile, reorganizar linhas em blocos de leitura sem rolagem horizontal. Os dados locais devem permanecer claramente identificados como fictícios durante a prévia visual.

## Formulários operacionais

- Novo Produto e Editar Produto usam uma página dedicada e o mesmo componente. Identificação é dominante, com heading mais forte e Nome maior ao lado de SKU. Imagem opcional é compacta e sem painel próprio. Comercial e controle de estoque aproveitam a largura com tipografia e divisores horizontais na mesma superfície, sem contorno externo arredondado ou divisórias verticais entre grupos. Descrição pertence a Detalhes opcionais. Sem wizard ou card para cada campo.
- As referências de formulário orientam composição, não identidade: Basit aproxima grupos comerciais e inventário; Muhammadullah orienta preenchimento imediato e imagem; ERP orienta distribuição horizontal entre identificação e controle. Não trazer contas, impostos, fornecedores ou vendas para este escopo.
- Código de barras físico é opcional e abre o cadastro, com ícone de scanner e indicação de leitura como teclado. Tab segue código de barras → Nome → SKU → Categoria → Unidade, incluindo depois a imagem opcional e os campos comerciais/estoque. Enter no barcode segue para Nome; Enter no SKU segue para Categoria; outros inputs não submetem prematuramente. Em edição, o foco inicial é Nome. SKU é interno, obrigatório e pode existir sem barcode.
- Nome, categoria e unidade são essenciais; custo e venda ficam próximos, opcionais. Categoria usa select nativo porque o catálogo atual tem três categorias. Unidades aparecem em português; números são texto com inputMode decimal, sem máscara durante a digitação. Preços na edição são apresentados com duas casas.
- Estoque mínimo é configuração de reposição; saldo atual nunca é editável. Cadastro oferece Sem saldo inicial / Registrar entrada inicial e explica que a entrada será uma movimentação. Quantidade inicial e motivo fixo Estoque inicial ficam dentro dessa operação, separados do mínimo. Nesta demonstração, a entrada é somente preparada e o produto nasce com saldo zero. Edição mostra o saldo como consulta e preserva a entrada preparada.
- Imagem principal aceita selecionar/arrastar um JPG, PNG ou WEBP até 5 MB, valida leitura do arquivo, mostra prévia e permite substituir/remover. URLs temporárias são liberadas; nada vai para storage ou base64. No cadastro repetido, a imagem é limpa.
- Salvar produto é primário, Salvar e criar outro é secundário e Cancelar é discreto. Barra sticky compacta, sem caixa externa, com ordem visual coerente com Tab. Campos/erros focados ficam acima das ações; ajuste de rolagem por mouse ocorre depois do clique, preservando abertura de detalhes/seleção. Cancelar com preenchimento pede confirmação inline; continuar mantém dados. Recarregar/sair da página recebe a proteção nativa do navegador enquanto há alterações.
- Validação inline preserva dados e foca o primeiro erro na ordem visual; duplicidade de SKU/barcode é verificada apenas na sessão. Submit possui trava contra repetição e estado Salvando. Save-and-new limpa o item, fecha detalhes opcionais, mantém somente categoria/unidade e retorna o foco ao código de barras após o reset, pronto para a próxima leitura ou Tab para Nome.
- DemoCatalogProvider é estado de apresentação em memória: cadastro/edição aparecem imediatamente no catálogo, painel e consulta local. Recarregar restaura os exemplos; não promete persistência ou atualização entre usuários.
