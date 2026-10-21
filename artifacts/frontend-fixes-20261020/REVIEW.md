# Correções de frontend — 20/10/2026

Implementação sobre 5e1469c, sem mudanças de API, banco ou dependências. Mantidos grafite/azul e geometria de 2 px.

## Entregue

- Histórico identifica o produto filtrado e oferece remover somente esse filtro, preservando a busca e os demais filtros; página volta para 1.
- Entrada oferece Compra, Devolução, Ajuste de inventário (conforme permissão) e Outro. Saída oferece Venda, Uso interno, Devolução, Perda, Ajuste e Outro. Ao mudar o tipo, motivo incompatível é limpo e também validado antes de enviar. A regra é de prevenção na interface, sem alterar contratos da API.
- Pedido mostra orientação para cadastrar fornecedor e link explícito para outra aba, mantendo seu formulário montado. Atualizar fornecedores limpa a busca e atualiza a lista sem sair do pedido.
- Campo de pesquisa do catálogo limitado a 200 caracteres; termos maiores vindos de links também são limitados antes da consulta.
- Nome do fornecedor marcado com asterisco; legenda esclarece que os demais dados são opcionais.
- Eixo do gráfico usa máximo par mínimo 2, evitando rótulos inteiros repetidos em períodos vazios ou com poucos registros.

## Verificação

- Frontend build com verificação TypeScript: aprovado. Avisos não impeditivos de comentários de dependência e tamanho do bundle permanecem.
- Lint: aprovado.
- 29 testes existentes do frontend: aprovados.
- Navegador em http://localhost:5173, servidor normal: filtro visível; removê-lo recuperou 4 registros da busca QA-20261002-01.
- Entrada não oferece Venda; selecionar Compra e mudar para Saída limpa o motivo e retira Compra da lista.
- Pedido sem fornecedores exibe orientação, cadastro abriu outra aba e pedido permaneceu aberto; nenhum formulário foi salvo.
- Pesquisa colada com 240 caracteres ficou em 200 e apresentou estado vazio normal, sem erro de carregamento.
- Eixo do gráfico vazio conferido no DOM: 0, 1, 2.
- Pedido em 390×844: largura do documento 385 px, sem transbordamento horizontal. Cadastro de fornecedor conferido na nova aba em mobile.
- Nenhum erro de console capturado na aba usada para essas verificações. Tamanho do navegador restaurado ao final.

## Limites

Não houve gravação em Neon nem teste completo do cadastro e seleção de um fornecedor recém-criado. O teste de outra aba usou pedido vazio; a preservação de itens depende de manter o mesmo formulário montado, sem armazenamento adicional de rascunhos. Back-end continua aceitando seus contratos existentes. Não foi feita regressão integral de todas as páginas e perfis.

Screenshots nesta pasta registram o estado validado. Correções incluídas na publicação da branch em 21/10/2026; conferir o commit e a referência remota para o estado atual.
