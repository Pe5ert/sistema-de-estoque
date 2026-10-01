# Correção pontual da imagem do produto

## Comparação

As rodadas anteriores ainda estão sem commit. O histórico Git contém a base V2 (`0e665c8`); por isso a comparação imediata também usa o snapshot de código anterior ao polimento, preservado em `%TEMP%/stock-product-polish-20261001`, e seus prints. O estado no início desta correção foi preservado separadamente em `%TEMP%/stock-image-correction-20261001`.

- [Antes do último polimento](../product-polish-20261001/before/novo-produto-1440.png): imagem com painel próprio, preview de 132 × 118 px.
- [Estado após o polimento](../product-polish-20261001/novo-produto-1440.png): preview reduzido para 106 × 96 px, mas imagem ainda em uma coluna independente de 220 px, com título e ações separados.
- [Correção atual](novo-produto-1440.png): imagem dentro da identificação, ao lado de Nome/SKU e Categoria/Unidade; sem seção própria.
- [Produto com imagem](editar-produto-1440.png): preview de 104 × 96 px e ações discretas Trocar/Remover. A faixa de apoio tem 132 px, sem painel próprio. Barcode segue na primeira linha, com a apresentação de scanner preservada.
- [Contexto mobile](imagem-mobile-contexto.png): preview de 76 × 70 px, dentro da identificação; ações acessíveis acima do rodapé ao receber foco.

## Restaurado e preservado

Recuperada a função da imagem como apoio próximo dos identificadores. Estado vazio usa um único botão compacto com ícone discreto. Comercial, estoque, detalhes, ações do formulário, ordem de Tab/Enter, validação e identidade global mantidos. Nenhuma mudança de backend ou de outras páginas nesta rodada.

## Diff desta rodada

Somente três arquivos de implementação: ProductForm.tsx (+1/-1), ProductImageField.tsx (+7/-6), styles.css (+12/-13). Total: 20 inserções e 20 remoções. [Estatística isolada](qa/diff-stat-round.txt).

O [git diff --stat completo](qa/git-diff-stat.txt) inclui alterações anteriores e não inclui arquivos ainda não rastreados; não representa apenas esta correção. Evidências e o script de QA ficam nesta pasta de artifacts.

## Validação

- lint: PASS.
- typecheck: PASS.
- build: PASS.
- git diff --check: PASS.
- QA: 38 verificações PASS, incluindo desktop 1440/1024, mobile 390, seleção, troca, remoção, formato inválido, preview, navegação por teclado, saldo preservado, salvar e criar outro e imagem na edição da sessão. [Resultados](qa/results.json).
- Revisão visual: cadastro e edição nas três larguras, comparados aos prints das duas versões anteriores.

Persistem os avisos já existentes: Node 24 em ambiente com engines configurado para Node 22 e anotações PURE da dependência Zod durante build. Não impediram os comandos. Dados e imagens permanecem somente na sessão local de demonstração.
