# Direção visual da V2

O produto é uma ferramenta operacional de estoque. A leitura deve começar pelo saldo, mostrar rapidamente o que precisa de atenção e manter o rastro de entradas, saídas e ajustes.

## Linguagem

- Base grafite escura, azul cobalto como identidade principal, laranja contido em alertas e verde para disponibilidade. Vermelho fica reservado ao estoque zerado e às saídas. O bloco de alerta usa superfície escura e destaque laranja em texto e borda.
- Composição assimétrica no painel: um saldo dominante, um bloco de atenção, atividade recente e fila de reposição. Métricas equivalentes não formam uma parede de cards.
- A sidebar separa painel, operação e rastreio. O item ativo usa azul, uma linha vertical e tipografia forte; não repetir numeradores em cada item.
- Listas são densas e legíveis. Produto, SKU, saldo e situação têm pesos diferentes; barras expressam a relação entre saldo e mínimo, com o mínimo marcado no meio da escala.
- Movimentações incluem uma área visual de leitura de código e um produto fictício identificado como exemplo. O campo permanece desativado e sinalizado como prévia visual enquanto não houver integração real.
- Histórico mostra cada alteração como uma sequência de saldo anterior, movimento e saldo final.

## Tokens e implementação

Os tokens semânticos ficam em `apps/web/src/styles.css`: `background`, `surface`, `surface-muted`, `surface-strong`, `border`, `border-strong`, `text-primary`, `text-secondary`, `text-muted`, `accent`, `accent-contrast`, `success`, `warning`, `danger` e `info`. O tom laranja principal também usa o token `orange-panel`.

Conservar contraste, foco visível, rótulos de status e números tabulares. Cor nunca é a única indicação de estado. Evitar barras, ícones e marcas sem função informativa. No desktop, preservar a composição e densidade; no mobile, reorganizar linhas em blocos de leitura sem rolagem horizontal. Os dados locais devem permanecer claramente identificados como fictícios durante a prévia visual.
