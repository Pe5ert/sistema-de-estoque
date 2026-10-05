# Leitura de código — 05/10/2026

Movimentações trabalha com um produto por operação: código → identificação → quantidade/tipo/motivo → confirmação → próxima leitura.

## Como usar sem bipador

1. Cadastre um código de barras em Produtos ou use o SKU existente. Código de barras é texto; zeros à esquerda são preservados.
2. Abra Movimentações. Digite ou cole o código no campo SKU OU CÓDIGO DE BARRAS e pressione Enter (ou Localizar).
3. Confira produto e saldo. O foco permanece no código, que fica somente leitura enquanto o produto estiver selecionado. Uma nova leitura nesse campo não troca silenciosamente o item nem vai automaticamente para Quantidade.
4. Use Tab ou clique em Quantidade; informe quantidade positiva, Entrada/Saída e motivo. Confira o saldo previsto e confirme pelo botão.
5. Após sucesso da API, código/produto/motivo são limpos, quantidade volta a 1, Entrada/Saída é mantida e o campo de código recebe foco. O último resultado continua visível até a próxima leitura.

Próximo produto troca o item antes de confirmar e descarta essa preparação sem registrar movimento. Enter nos campos de texto não confirma estoque. Erro de registro mantém produto, quantidade, tipo e motivo para correção/repetição; saldo insuficiente bloqueia a saída. Código desconhecido informa o problema; colisão entre SKU e barcode exige escolher o produto.

## Compatibilidade e limite

Preparado para leitor configurado como teclado com sufixo Enter. O leitor escreve no campo que estiver com foco: durante edição manual de Quantidade, não faça outra leitura; confirme ou use Próximo produto antes. Não há captura global por velocidade de digitação, câmera ou driver específico. Hardware e configuração do sufixo ainda precisam ser validados com o aparelho.

## Validação desta rodada

- Lint, typecheck, build e os 35 testes locais existentes passaram. Suíte PostgreSQL de concorrência continua sem execução por ausência de TEST_DATABASE_URL separado.
- Consulta real autenticada ao Neon por barcode encontrou produto e saldo. Não houve escrita de estoque no Neon nesta rodada.
- QA interativo com servidor HTTP isolado e dados fictícios: barcode com zeros, SKU, vazio/desconhecido, colisão, Enter/Tab, leitura repetida, decimal, quantidade zero, motivo obrigatório, saldo insuficiente, clique duplo, loading, resposta atrasada, erro de consulta, erro de registro/repetição e próxima leitura automática.
- Clique duplo produziu um POST de sucesso; erro simulado produziu um POST recusado e um retry separado. Histórico/painel e saldo após reload foram conferidos nesse servidor em memória; isso não comprova persistência PostgreSQL.
- Desktop 1440×900, intermediário 1024×768 e mobile 390×844 sem overflow horizontal; dica de Tab/troca permanece visível após identificação. Confirmação mobile restaura foco na leitura.

Alterações: MovementWorkbench.tsx e uma regra em styles.css. Sem dependências, mudanças de API, schema, auth, seed ou migrations. Avisos existentes de Node 24 fora da faixa declarada, PURE do Zod e tamanho do bundle; testes executados com Node 22.23.3.
