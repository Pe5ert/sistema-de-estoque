# Testes de uso da dashboard — 02/10/2026

Checkout: `918feb4`, branch `sistema-de-estoque-v2`.

## Ambiente e limite

A tentativa inicial de acesso real ficou bloqueada pela ausência de `.env` e API/banco. Depois, o usuário autorizou criar um ambiente temporário até fornecer a configuração real.

Foi criado `.env` local, ignorado pelo Git, com `VITE_API_URL=http://localhost:3100/api`. `fixture-server.cjs` fornece respostas HTTP fictícias, em memória, somente em `127.0.0.1:3100`. O frontend é o código real da checkout, sem alterações. A conta aparece como **Teste · dados fictícios**.

Os testes validam interface e integração do frontend com essas respostas. Não validam NestJS, autenticação JWT real, PostgreSQL, migrations, persistência, transações ou concorrência. Nenhum banco real, migration ou seed foi usado.

## Resultado

36 verificações aprovadas, mais 3 problemas encontrados. Lista completa em `result.json`.

Verificados: indicadores/custo, sete dias do gráfico, tooltip por teclado e clique no mobile, Escape, filtro de produtos em atenção, drawer de produto/retorno de foco, atalhos Novo produto e Movimentar estoque, consulta, saldo insuficiente, saída simulada 80→60, atualização do painel sem reload, histórico, navegação mobile, contenção de Tab, logout/login fictícios, 503/retry/recuperação, estoque sem alertas e catálogo vazio.

Revisão visual em 1440×900, 1024×900 e 390×844, sem overflow horizontal. A consulta de logs do navegador não retornou erros/avisos; não houve overlay de erro do Vite.

## Problemas encontrados, sem correção nesta rodada

1. **Fila de reposição corta o terceiro produto no desktop de 1440 px.** O painel possui `overflow: hidden`, 281 px de altura interna e 310 px de conteúdo. A última linha fica parcialmente escondida. Não ocorre no cenário conferido em 1024/mobile. Evidência: `dashboard-desktop.jpg`. Regras envolvidas em `apps/web/src/styles.css`: grade com linhas fixas e painel com overflow hidden.
2. **Depois de localizar produto com Enter, foco continua em `#scan-code`.** Esperava-se foco em `#movement-quantity`, conforme o fluxo implementado. O produto foi encontrado e o campo de quantidade habilitado, mas foi preciso avançar manualmente. Ver `apps/web/src/MovementWorkbench.tsx`.
3. **Menu mobile abre com foco no body.** Confirmado ao abrir por clique e por Enter. O conteúdo de fundo fica inert; a contenção de Tab funciona quando o foco já está num link, e Escape fecha/restaura foco no botão. Falta transferir o foco inicial à navegação. Ver `apps/web/src/App.tsx`.

## Capturas

- `dashboard-desktop.jpg`: cenário inicial de atenção, 6 produtos e custo R$ 1.220,00.
- `dashboard-mobile.jpg`: primeira tela no mobile; `dashboard-mobile-full.jpg`: página completa.
- `dashboard-1024.jpg`: cenário após saída simulada, custo R$ 975,00.
- `movement-result.jpg`, `mobile-menu.jpg`, `dashboard-clear.jpg`, `dashboard-empty.jpg`, `dashboard-error.jpg`: estados/interações adicionais.
- `blocked-desktop.jpg`/`blocked-mobile.jpg`: tentativa inicial sem ambiente configurado, antes da autorização para fixtures.

## Reproduzir a prévia temporária (ambiente isolado)

O `.env` local já foi substituído pela configuração real fornecida depois desta rodada. Para reproduzir as fixtures sem alterar esse arquivo, iniciar em dois terminais na raiz:

```sh
node artifacts/dashboard-check-20261002/fixture-server.cjs
VITE_API_URL=http://localhost:3100/api pnpm dev:web
```

Abrir http://localhost:5173. Conta exclusiva das fixtures: `qa@example.test`, senha `teste-dashboard`. São valores fictícios; não são credenciais de usuário real. Reiniciar o servidor de fixtures restaura os dados. Substituir o `.env` pelo ambiente autorizado e iniciar a API real antes de validar persistência.

Nenhuma alteração em código da aplicação, commit ou push nesta rodada.


## Correção autorizada na sequência

O usuário autorizou corrigir os três problemas e enviar à branch V2. Ver `FIXES.md`, `fix-results.json` e as capturas `fixed-*.jpg` para o estado corrigido. As seções anteriores documentam o diagnóstico antes das correções.
