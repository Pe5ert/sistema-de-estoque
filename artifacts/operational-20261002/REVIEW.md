# QA de apresentação — 02/10/2026

`check.cjs` usa **fixtures HTTP somente no navegador de teste**, sem bypass/in-memory provider no frontend. As telas exercitam os endpoints e TanStack Query efetivos; as respostas de teste não comprovam persistência PostgreSQL.

Verificações concluídas (detalhes em `result.json`): clique neutro, troca de produto sem fechar, Enter/Escape, categoria salva, cadastro com entrada inicial, leitura depois de reload, edição sem enviar stock, falha 500 preservando campos, lookup SKU, saída confirmada 100→80, histórico, painel e drawer fullscreen/mobile com fundo inert. Nenhum erro JavaScript capturado.

O teste revelou que o Enter podia transferir foco ao botão Fechar antes do keyup e fechar o drawer imediatamente. O handler agora cancela a ação padrão do Enter; botões internos continuam com comportamento próprio.

## Evidências

- `products-drawer-desktop.png`
- `product-form-desktop.png`
- `movements-desktop.png`
- `history-drawer-desktop.png`
- `dashboard-desktop.png`
- `product-drawer-mobile.png`
- `product-form-mobile.png`

No print fullPage mobile, a barra sticky aparece na posição correspondente ao viewport de captura; os campos abaixo são acessados por rolagem. Foi verificada ausência de overflow horizontal da página. Preservados tokens e composição existentes.

Banco/auth reais, migration e concorrência PostgreSQL permanecem pendentes. Consulte `docs/OPERATIONAL_INTEGRATION.md` antes de retomar em outra máquina.
