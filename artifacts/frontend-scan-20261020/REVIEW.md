# GAVYO — revisão focada no frontend, 20/10/2026

Servidor normal: http://localhost:5173. Commit 5e1469c. Revisão no navegador em desktop 1440×900, formulário/menu em 390×844 e drawer de produto em 320×740. Nenhum cadastro ou movimento foi salvo. Não foram aplicadas correções.

## 1. P2 — Histórico mantém filtro de produto invisível

Reproduzido na rodada imediatamente anterior: Produtos → detalhes de Caixa organizadora M → Consultar histórico completo → buscar QA-20261002-01. Resultado: zero, embora a mesma pesquisa no Histórico geral tenha quatro registros. A URL conserva productId, mas a tela não informa o produto filtrado.

Correção: chip “Produto: Caixa organizadora M” com remoção individual e indicação de busca restrita. Origem: apps/web/src/History.tsx:31–51. Evidências em ../error-scan-20261020/historico-filtro-oculto.jpg e historico-busca-geral.jpg.

## 2. P2 — Novo pedido fica sem orientação quando não há fornecedores

Reprodução: banco atual sem fornecedores → Compras → Novo pedido. O campo Fornecedor abre com “Nenhum resultado encontrado.” e Salvar rascunho fica desabilitado. Não há explicação sobre o pré-requisito nem ação contextual para cadastrar fornecedor. A navegação lateral existe, mas exige que a pessoa descubra como sair do impasse, e inserir itens antes disso torna a saída mais delicada.

Natureza: falha de orientação/recuperação, não erro de persistência. Correção: estado vazio específico “Cadastre um fornecedor para criar o pedido”, com ação Novo fornecedor e retorno ao pedido preservando seu preenchimento. Evidência: pedido-sem-fornecedor.jpg. Origem: PurchaseForm.tsx e SearchCombobox.tsx.

## 3. P2 — Tipo e motivo da movimentação se contradizem

Reprodução: Movimentações → localizar CAB-USB-C-1M → manter Entrada → selecionar motivo Venda. A prévia apresenta “Entrada de 1 un”, “Venda”, saldo 24 → 25 e botão Confirmar entrada. Nenhuma gravação foi feita.

Natureza: prevenção de erro e clareza do formulário. A lista de motivos não muda com o tipo. Antes de bloquear combinações, confirmar as regras operacionais para devolução e ajustes; o frontend deve oferecer motivos coerentes e orientar exceções explicitamente. Correção sugerida: motivos contextuais ao tipo e limpeza/revalidação ao trocar Entrada/Saída. Evidência: entrada-motivo-venda.jpg. Origem: MovementWorkbench.tsx:134.

## 4. P3 — Pesquisa longa aceita texto que a API rejeita e mostra erro genérico

Reprodução: Produtos → colar “Produto ” repetido 30 vezes (240 caracteres) na pesquisa. A tabela desaparece e aparece “Não foi possível carregar os dados. Confira os campos informados.” com Tentar novamente. Repetir não resolve porque o termo continua inválido. Limpar a pesquisa recupera a tabela.

Correção: alinhar maxLength ao limite de 200 caracteres da API, validar links com termos maiores e apresentar orientação junto ao campo. Não oferecer apenas repetição de uma consulta sabidamente inválida. Evidência: busca-longa-erro-generico.jpg. Origem: Products.tsx:54; inventory.dto.ts, ProductQuery.search.

## 5. P3 — Cadastro de fornecedor não identifica campos obrigatórios/opcionais

Reprodução: Fornecedores → Novo fornecedor. Nome ou razão social é obrigatório no input, mas o label não mostra asterisco nem há legenda ou orientação. Os oito campos aparecem com peso semelhante; a pessoa não sabe que pode cadastrar apenas o nome. Contrasta com o formulário de Produto, que identifica obrigatórios e opcionais.

Natureza: melhoria de UX e consistência. Correção: marcar Nome ou razão social como obrigatório e explicar que os demais campos são opcionais; agrupar identificação, contato e detalhes. Evidência: fornecedor-obrigatorios.jpg. Origem: Suppliers.tsx:58.

## 6. P3 — Gráfico de período vazio repete valor no eixo

Reprodução: Visão geral → 7 dias, atualmente sem movimentações no período. As marcas do eixo são 0, 1 e 1. O código usa máximo mínimo 1 e arredonda metade de 1 para 1, duplicando o rótulo em alturas diferentes.

Correção: escala de contagens com passos inteiros únicos, ou estado vazio sem eixo enganoso. Evidência: dashboard-eixo-repetido.jpg. Origem: DashboardCharts.tsx:36.

## O que funcionou e limites

- Cadastro de Produto vazio mostrou erros locais em nome, SKU e categoria, com foco no primeiro erro.
- Menu mobile abriu, isolou o conteúdo e fechou ao navegar para Movimentações.
- Drawer de produto coube em 320 px sem rolagem horizontal interna e fechou por Escape.
- Busca de produto no pedido encontrou Cabo USB-C 1 m.
- Não houve salvamento de pedidos, fornecedores ou produtos nesta rodada.
- Não foram concluídos testes de todos os perfis, modo claro, upload, redes lentas/indisponíveis, todas as telas de inventário/importação/backups ou mudanças durante sessão expirada.
- Esta é uma revisão de frontend e UX. Os riscos de backend do relatório anterior não foram tratados como novos achados desta rodada.
