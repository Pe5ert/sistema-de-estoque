# Importação: correção no arquivo original — 08/10/2026

Estado local sobre ef9168d. Sem commit/push. Inventário físico e outros trabalhos anteriores preservados. Não alterados .env real, migrations ou banco Neon.

## Fluxo solicitado

A pessoa envia a planilha → API valida os dados e mantém a conferência → tela aponta linha original, campo e problema → pessoa corrige o arquivo no computador → reenvia → confirma somente uma conferência válida.

Removidos da interface os editores de colunas e categorias, a validação dessas escolhas e o clique para expandir cada linha. Erros visíveis em tabela, 20 por página, CSV completo. Cabeçalho é identificado separadamente, sem inventar linha de produto. Mensagens de categoria/cabeçalho orientam corrigir o arquivo; categoria nova deve ser cadastrada em Produtos → Categorias antes do envio. Valores do arquivo não são corrigidos automaticamente.

API de configuração mantida para compatibilidade com operações anteriores. Importações antigas com escolhas de categoria salvas exigem reenvio na interface, evitando confirmar escolhas ocultas. Nova conferência preserva o arquivo anterior nas operações recentes. Arquivo selecionado ainda não enviado tem proteção de saída. Confirmação, revisão do servidor e escrita atômica preservadas.

## Evidências

| Etapa | Resultado | Evidência |
| --- | --- | --- |
| UI de erros | PASS | Dez diagnósticos visíveis em duas linhas, zero selects/inputs de edição no conteúdo; erros-desktop.png |
| Responsividade | PASS | 1440, 1024 e 390 px sem overflow horizontal; erros-mobile.png; corrigidos rótulos duplicados por CSS global mobile |
| Paginação | PASS | Primeira página: vinte erros, linhas 2–21; próxima: cinco erros, linhas 22–26; retorno preservado |
| Cabeçalho | PASS | Coluna Nome não reconhecida: localização Cabeçalho, orientação para usar Nome; nenhum botão de importar |
| Seleção de arquivo | PASS | Botão abre seleção; navegar antes de enviar pede confirmação; cancelar mantém arquivo |
| Reenvio corrigido | PASS | Mesmo nome de arquivo, novo job 692a9343-6a6a-4429-8f41-023e683f47a0, zero erros, prévia de dois produtos, confirmação antes de gravar |
| API → PostgreSQL | PASS | Base loopback stock_ui_import_test; antes: zero produtos deste lote; depois: dois produtos, uma entrada INITIAL_STOCK, autor Administrador QA, saldo exato 2.500 e barcode com zeros; database-before.json/database-after.json |
| Resultado | PASS | Dois produtos criados, zero categorias criadas, uma entrada; resultado-corrigido.png |
| Conferência original | PASS | Job 365aba17-6e4a-4a66-9d9d-888423d8daa2 permanece com dez erros e sem produtos importados |

O banco de QA já tinha produtos de rodadas anteriores. As contagens acima se referem ao lote QA-CORRIGIDO-20261008-*, não ao banco inteiro. Nenhuma operação inválida tinha importedRows positivo. Apenas fixtures fictícias foram utilizadas. Isso não representa teste com cliente leigo nem validação em produção.

## Gates

- pnpm lint: PASS.
- Typecheck dos três pacotes, executado sequencialmente para reduzir carga: PASS.
- Build dos três pacotes, sequencial: PASS. Build web final após o ajuste CSS mobile também PASS (build-web-final.log). Avisos conhecidos de Zod e bundle acima de 500 kB.
- Testes focados da API de importação: 17 PASS (parser e fixture transacional, não PostgreSQL).
- Testes do frontend: 15 PASS (inclui relatório, localização Cabeçalho e saldo inicial; logs neste diretório).
- git diff --check: PASS.

Nesta rodada não repetimos o teste de carga/concorrência PostgreSQL da entrega anterior: as regras transacionais não mudaram. A checagem real de persistência acima verifica o fluxo de reenvio/confirmar com dados fictícios em loopback.
