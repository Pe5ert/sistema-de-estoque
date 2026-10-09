# GAVYO — simplificação operacional, 09/10/2026

## Resultado

Implementação sobre 53cb7b0, depois de auditar nove telas reais e inspecionar as referências descritas em [AUDIT.md](AUDIT.md). Mesma identidade grafite/azul e 2 px. Ações aproximadas dos títulos; descrições de finalidade e cabeçalhos duplicados removidos; tabelas e busca ganham prioridade. Fornecedores usa contagens reais compactas. Histórico começa pelos filtros/registros. Novo pedido mantém fornecedor → itens → resumo, com observações opcionais recolhidas e abertas quando já preenchidas em edição.

Backend, migrations, contratos, navegação e regras de negócio não foram alterados. As confirmações de envio/recebimento, efeito no saldo, erros inline, avisos de conexão, recuperação idempotente, limites da importação e instruções do inventário foram preservados.

## Antes/depois mensurável

Coordenadas da tabela na página, medidas no DOM real; valores arredondados. Não são tempos de execução de usuários.

| Tela | Desktop: antes → depois | Mobile 390 px: antes → depois |
| --- | --- | --- |
| Produtos | 438 → 276 px | 525 → 429 px |
| Fornecedores | 514 → 277 px | 658 → 376 px |
| Histórico | 395 → 267 px | 520 → 391 px |

Novo pedido vazio no mobile passou de 1.408 para 1.161 px de altura. O cadastro e recebimento de QA acrescentaram um produto e um pedido durante o trabalho; portanto contagens e a altura total das listagens podem diferir entre as capturas. Não atribuir essas diferenças à mudança visual. Métricas completas: `before-metrics.json`, `after-metrics.json`, `responsive-metrics.json`.

## Fluxos verificados no navegador

Somente API local na porta 3011 e PostgreSQL loopback isolado; dados identificados como QA.

- Busca por SKU encontrou apenas o produto correspondente. Busca inexistente apresentou vazio e ação de limpar filtros.
- Linha de produto abriu o drawer por Enter. Escape fechou e devolveu foco à mesma linha. Tab após Novo produto passou a Importar planilha, seguindo a ordem visual e de leitura.
- Produto QA simplificação 20261009 foi cadastrado sem saldo inicial. Cadastro e estado sem estoque persistiram após reload.
- Entrada de 4 unidades por código + Enter foi registrada. Clique duplo gerou um único movimento 0 → 4; Histórico filtrado mostrou apenas essa entrada naquele momento.
- Saída de 5 com saldo 4 mostrou insuficiência e deixou Confirmar saída desabilitado.
- Dashboard refletiu o novo produto e a entrada, preservando os alertas dos dois produtos com estoque baixo.
- Pedido PC-000027: fornecedor selecionado, produto incluído por código + Enter, quantidade 2 e custo 3,50; total 7,00. Observações opcionais puderam ser abertas/preenchidas, foram salvas e apareceram abertas na edição do rascunho.
- Marcar como enviado continuou exigindo confirmação, explicando que registra situação sem enviar mensagem ao fornecedor nem alterar estoque.
- Receber 3 quando havia 2 pendentes mostrou erro e bloqueou revisão. Receber 1 apresentou confirmação antes da gravação.
- A compilação reiniciou a API durante essa confirmação. A interface preservou a tentativa e os campos, mostrou falha de conexão e permitiu conferir a tentativa antes de repeti-la. Recuperação com o mesmo identificador registrou uma única entrada 4 → 5. Pedido ficou parcialmente recebido, com 1 recebido e 1 pendente, persistente após reload. Link do recebimento abriu o Histórico filtrado com exatamente sua entrada; Dashboard mostrou a nova atividade e Produtos confirmou saldo 5.
- Período inválido no Histórico, alterado pelo teclado: De 11/10 e Até 10/10. Erro explicou a correção e substituiu a consulta por orientação para ajustar o período.
- CSV de QA com SKU vazio mostrou linha 2, campo SKU e erro, sem oferecer confirmação de importação. Resultado persistiu após reload; o arquivo não criou produto.
- Não foram observados erros JavaScript no log consultado do navegador ao final desses fluxos.

## Responsividade e evidências

Nove telas capturadas antes/depois: Dashboard, Produtos, Movimentações, Histórico, Compras, Novo pedido, Fornecedores, Inventário físico e Importação. [Galeria](index.html): desktop + mobile, 36 capturas principais; originais PNG preservados e prévias JPEG geradas pelo script `build-gallery.py`. Estados adicionais: recebimento parcial, período inválido, busca vazia e planilha inválida.

O navegador de automação manteve 1280 px apesar do controle de viewport. Para não apresentar um desktop como mobile, a verificação responsiva usa o sistema real em iframe de 390 × 844 px no mesmo computador. O documento interno confirma largura 390 e aplica os media queries reais. `responsive.html` permite também 768 e 1024 px. Todas as nove telas terminaram sem transbordamento horizontal da página nessas três larguras e no desktop. Em tablet, tabelas largas podem usar a rolagem interna já existente.

A revisão encontrou transbordamento em Movimentações/Histórico a 768 px: texto acessível de uma coluna posicionava-se fora da área rolável. Corrigidos o dimensionamento do grid e o contexto de posicionamento da tabela; repetição da verificação das nove telas em 768/1024 px não detectou transbordamento.

Limite: comandos de clique/teclado dentro do iframe não foram aceitos pela ferramenta. Foram verificados renderização e preenchimento/seleção onde suportados; o fluxo completo foi executado na aba desktop. Não equivale a testar aparelho físico, teclado virtual, leitor de tela ou scanner. Também não é uma pesquisa com usuários iniciantes: essa aprovação depende de pessoas reais realizarem encontrar/cadastrar produto, entrada, identificar falta, criar pedido e receber sem instruções.

## Checagens técnicas

- Typecheck, lint, suíte padrão `pnpm test` e build do monorepo passaram. A etapa final `git diff --check` inicialmente encontrou espaços finais nos trechos removidos; foram corrigidos e a checagem passou.
- A suíte padrão executou também os 16 testes de modelo do frontend. Suítes PostgreSQL opt-in não foram repetidas: não houve mudança de backend ou regra, e não se deve confundir as suítes ignoradas com uma nova validação delas.
- Build final do frontend passou após os ajustes de responsividade. Permanecem os avisos anteriores sobre tamanho do bundle e anotações de dependência; não houve falha de compilação.
- Não foi executado reset, seed, migration ou QA no Neon compartilhado.

## Próxima validação de produto

Pedir a integrantes da operação para executar as seis tarefas de aprovação sem explicação prévia, registrando onde hesitam. Priorizar correções de localização/entendimento antes de acrescentar ajuda. Fazer rodada em aparelho físico e com teclado/leitor reais. O QA desta entrega não revelou bloqueio novo nos fluxos desktop exercitados, mas não sustenta uma afirmação de ausência de todos os problemas possíveis.
