# Verificação da importação com PostgreSQL — 08/10/2026

Comando executado com Node 22.23.0, pnpm 11.24.0, schema/migrations atuais e uma base nova loopback terminada em `_import_test`:

```sh
TEST_IMPORT_DATABASE_URL=postgresql://import_qa@127.0.0.1:5549/stock_review_import_test \
  /tmp/estoque-import-runtime-20261008/run-qa --filter @stock/api exec tsx \
  --tsconfig tsconfig.test.json --test src/imports/imports.postgres.spec.ts
```

Resultado: exit 0; 13 testes passaram, nenhum erro, cancelamento ou teste ignorado. Duração total reportada pelo runner: 172,389 s; bloco funcional de testes: 89,781 s. A máquina também executava outras verificações durante a rodada; estes tempos não são um benchmark de produção.

Os 12 subcasos verificaram:

1. Lote de 10 produtos com duas confirmações concorrentes do mesmo job e leitura posterior persistida.
2. Mesmo fluxo com 100 produtos.
3. Mesmo fluxo com 1.000 produtos.
4. Mesmo fluxo com 2.000 produtos, o limite do formato.
5. Excel com zeros iniciais preservados, preços nulos e quantidades decimais exatas; preview não escreve produtos, saldo zero não gera movimento, saldo positivo gera entrada auditada.
6. Excel com linhas válidas e inválidas: erros referenciam linhas originais e o lote inteiro fica sem gravação.
7. Dois jobs distintos tentando cadastrar os mesmos códigos: apenas um lote completo persiste.
8. Falha injetada após todas as gravações: categorias, produtos e movimentos revertem na mesma transação.
9. Categoria desativada depois da prévia impede confirmação sem gravação.
10. SKU/barcode cadastrado depois da prévia é revalidado antes da confirmação.
11. Restrição do banco impede conflito inserido após a validação e mantém a atomicidade.
12. HTTP real: multipart, origem, perfil atual da sessão, isolamento por autor, modelo Excel e confirmação repetida.

A auditoria conferiu autor, motivo `INITIAL_STOCK`, saldo anterior zero, saldo resultante/quantidade exatos e preservação do código de barras textual.

Adicionalmente, os dois modelos foram baixados da API da prévia mediante autenticação fictícia: CSV retornou HTTP 200 e 102 bytes, Excel retornou HTTP 200 e 6.627 bytes; ambos com `Content-Disposition` de attachment correto e conteúdo/formato válido. Essa checagem é da API; a evidência de download/interação do navegador deve ser registrada separadamente.

Log integral: `postgres-import.log`. Ambiente: `RUNTIME.md`. Somente dados fictícios em bases novas isoladas; nenhum acesso de escrita ao Neon ou banco real.
