# Revisão dos formulários

Prévia local: http://localhost:5173/products/new

## Três capturas principais

1. `novo-produto-desktop.png` — cadastro dedicado, identificação/imagem e preços/estoque.
2. `editar-produto-desktop.png` — dados preenchidos, imagem atual, saldo somente para consulta.
3. `movimentacao-desktop.png` — produto encontrado e prévia de saída, sem gravação.

`novo-produto-preenchido.png` mostra também imagem selecionada e entrada inicial preparada. `qa/` contém revisão em 1440×900, 1024×768 e 390×844, resultados de comportamento e snapshots Git. As capturas mobile de página inteira registram o footer na posição sticky do viewport capturado.

Os dados cadastrados/editados e imagens ficam apenas na sessão. Recarregar restaura os exemplos. Entrada inicial e movimentações não alteram saldo nem histórico. Backend, auth, vendas e migrations não foram modificados.

## Reproduzir QA

Com Vite na porta 5173, Node com suporte a stripping de TypeScript e Playwright disponível, executar da raiz:

```powershell
$env:PLAYWRIGHT_PACKAGE = 'caminho/para/node_modules/playwright'
$env:CHROME_EXECUTABLE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
node --experimental-strip-types artifacts/forms-20261001/qa/verify.cjs
```

O teste usa Chrome em headless e somente dados fictícios no frontend. Relatório completo: `docs/frontend/FORMS_REVIEW.md`.
