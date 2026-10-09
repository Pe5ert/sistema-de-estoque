# Importação Excel/CSV — revisão local de 08/10/2026

Acesso: **Produtos → Importar planilha**. A base V1 já existia no repositório. Esta rodada conclui refinamentos de validação/interação e amplia a evidência de uso; não cria outro importador.

## Git e divisão do trabalho

Antes de continuar, a branch `sistema-de-estoque-v2` foi atualizada de `1308bb4` para `ef9168d`, incorporando permissões por perfil e testes de concorrência remotos. As alterações locais de inventário físico foram preservadas numa combinação de três vias dos arquivos sobrepostos. Nenhum commit, push, reset ou seed no banco real.

Três agentes dividiram a demanda: parser/validação e regressões, fluxo React/relatório CSV, infraestrutura PostgreSQL isolada e testes reais. A integração, conferência de domínio, gates e testes interativos ficaram com o agente principal.

## Mudanças desta rodada

- Etapas e próximo passo explícitos; ajuda com modelo, SKU, unidades, preços, zeros à esquerda e saldo inicial.
- Campos obrigatórios identificados, confirmação antes da gravação e resultado com textos em português.
- Atualizar validação informa o resultado e preserva escolhas pendentes. Outra sessão que valida a operação gera conflito de revisão: o usuário escolhe usar a configuração salva ou manter as próprias escolhas, e valida novamente.
- Proteção de saída com escolhas pendentes; controles travados durante processamento e contra envio repetido. Confirmação positiva usa botão azul; confirmações de descarte mantêm o estilo anterior.
- CSV: linhas originais corretas mesmo com CRLF dentro de campos entre aspas; limite físico reconhece CR/LF/CRLF sem criar um array por quebra; linhas vazias finais contadas.
- Excel: referências externas também são recusadas em fórmulas compartilhadas com resultados em cache. Sugestões de mapeamento ignoram propriedades herdadas de objetos.
- Relatório CSV separado em função testável, mantendo BOM, todas as mensagens, escape de aspas/quebras e proteção contra interpretação de fórmulas.

Contratos de saldo/transação e autorização foram preservados: ADMIN/MANAGER importam, OPERATOR é recusado; somente produtos novos; lote inteiro ou nenhuma gravação; saldo positivo cria entrada `INITIAL_STOCK` auditada. Nenhuma migration nova de importação.

## Evidência de uso no navegador

API e PostgreSQL reais, exclusivamente nas bases novas de QA descritas em [RUNTIME.md](RUNTIME.md). Não são fixtures HTTP que simulam gravação, nem dados da empresa.

| Caso | Resultado observado |
| --- | --- |
| Entrada Produtos → Importar planilha | Página, modelos, ajuda e etapas acessíveis |
| CSV com duas linhas inválidas | Dez erros por linha/campo, incluindo códigos duplicados; importação bloqueada |
| Escolha de coluna pendente + Atualizar | Escolha preservada, aviso de atualização e rascunho exibidos |
| Sair com escolha pendente + Continuar conferindo | Confirmação de saída e escolha preservada |
| CSV válido, cancelar confirmação com Escape e confirmar | Dois produtos criados, uma entrada; recarga mantém resultado |
| XLSX com SKU/barcode numéricos | Dois erros específicos, instrução para Texto e importação bloqueada |
| XLSX com categoria nova | Validar bloqueado até autorização explícita; dois produtos, uma categoria e uma entrada após confirmar |
| Confirmação pelo teclado no celular | Enter concluiu a operação e resultado foi exibido |
| Revisão validada por segunda sessão HTTP | Coluna pendente preservada; botão Validar bloqueado até decidir; diálogo Manter escolhas exibido |
| 1440×900, 1024×768 e 390×844 | Sem overflow horizontal; campos/tabela reorganizados no celular |

A consulta SQL posterior conferiu **quatro produtos, duas entradas auditadas e zero produtos atribuídos a operações inválidas**; códigos mantiveram zeros, autoria e motivo foram preservados. Evidência fictícia: [ui-database.json](ui-database.json). Console final sem avisos/erros capturados.

Prints: [resultado desktop](resultado-desktop.png), [confirmação](confirmacao-desktop.png), [erros CSV](erros-desktop.png), [Excel inválido tablet](excel-invalido-tablet.png), [Excel válido mobile](excel-valido-mobile.png), [resultado mobile](resultado-mobile.png).

## Testes automatizados e gates

- **17 testes unitários de importação PASS**: parser, 2.000 linhas, formatos/limites, linhas multilinha/vazias, fórmulas compartilhadas, mapeamento, duplicidades, validação e serviço/idempotência. Log [test-import-unit.log](test-import-unit.log).
- **13 testes PostgreSQL PASS**, sem skips: 10/100/1.000/2.000 produtos, confirmações concorrentes/repetidas, dois jobs com mesmos códigos, XLSX, Decimal, autoria, revalidação, rollback após escritas reais, constraints e HTTP. Detalhes em [POSTGRES.md](POSTGRES.md).
- **14 testes web PASS**, incluindo três novos de relatório CSV e regressões existentes de produto/feedback/inventário. Log [test-web.log](test-web.log).
- **PASS**: `pnpm lint`, `pnpm typecheck`, `pnpm build` e `git diff --check`. Logs `lint.log`, `typecheck.log` e `build.log`. O build final terminou com exit 0; conserva avisos conhecidos de comentários PURE do Zod e chunk JavaScript maior que 500 kB.

Comandos dos testes focados, com Node 22/pnpm 11.24 configurados, a partir de `apps/api`:

```sh
pnpm exec tsx --tsconfig tsconfig.test.json --test src/imports/imports.spec.ts
pnpm exec tsx --test ../web/tests/*.test.mjs
# Somente banco loopback dedicado, migrado, terminado em _import_test:
TEST_IMPORT_DATABASE_URL=postgresql://import_qa@127.0.0.1:5549/stock_review_import_test \
  pnpm exec tsx --tsconfig tsconfig.test.json --test src/imports/imports.postgres.spec.ts
```

## Limites práticos

CSV UTF-8/XLSX de uma aba preenchida, até 2.000 produtos/5 MB/30 colunas. XLS/XLSM, atualização de produtos existentes e importação parcial ficam fora da V1. Testar em QA não mede capacidade da instalação do cliente.

O navegador embutido não retornou o evento de download do relatório Blob. A geração integral/segura do CSV passou nos testes, e os modelos CSV/XLSX foram efetivamente baixados pela API autenticada; **salvamento do relatório pelo navegador não foi confirmado nesta rodada**. Algumas chamadas da automação sofreram timeout sob carga, com estado posterior conferido antes de continuar.

As tentativas da suíte global e de um build sob carga foram interrompidas externamente (exit 143), sem conclusão global. O build foi repetido e aprovado com a carga reduzida. Os testes focados acima foram concluídos; não declarar `pnpm test` global como PASS a partir daqueles logs parciais. Nenhuma escrita/migration de QA no Neon ou alteração no `.env` real. Inventário físico segue local e sua migration real continua pendente.
