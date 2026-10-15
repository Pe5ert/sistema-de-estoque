# Correções de UX e formulário — 15/10/2026

Base: 090ec2f. Escopo autorizado: corrigir os achados da revisão e simplificar o formulário de produto. Nenhuma migration ou alteração em regras de saldo/permissões. Escritas desta rodada somente no PostgreSQL local de QA.

## O que mudou

- Categorias: confirmação dentro do próprio drawer para trocar/fechar com rascunho, foco na decisão, proteção de navegação/reload e lista bloqueada enquanto salva; trava síncrona contra envio duplicado.
- Busca: identidade do destino preservada quando resultados chegam; seleção indisponível é anunciada; refetch visível e cache invalidado após alterações de estoque/produto/compras.
- Imagem: link pendente entra na validação e no salvamento principal, com foco no erro; rascunho participa da proteção de saída. Erro/dica associados ao grupo/seletor e anúncio de erro.
- Recuperação: 404 dentro do sistema e fallback para erro de renderização. Listas e painel preservam conteúdo em falha de refetch com aviso de possível desatualização.
- Atualização: horário da consulta, botão Atualizar e revalidação a cada 60 segundos em listas/painel visíveis. Não há polling nos formulários, detalhes de inventário ou pedidos em edição. Não se trata de sincronização instantânea.
- Permissões: falta de categoria tem orientação executável por ADMIN/MANAGER ou pedido de ajuda para OPERATOR.
- Login: senha preservada em tentativa com erro, limpa após autenticar.
- Compras/fornecedores: Limpar filtros, status sem quebra no meio da palavra, CPF/CNPJ formatado apenas na apresentação, telefone/e-mail acionáveis e texto completo no título do e-mail.
- Paginação: singular/plural e controles apenas com mais de uma página.

## Formulário

Identificação começa pelo nome, seguido de Código interno (SKU), categoria e unidade explicada. Foto/código de barras são opcionais. Estoque pergunta primeiro se já existe quantidade disponível; depois explica o mínimo. Preços vêm em seção separada e opcionais. Descrição/situação permanecem recolhíveis. Mantidos raio de 2px, tema, upload, confirmação de inativação e salvamento transacional. Cadastro comum começa no nome; ao cadastrar outro após leitura de barcode, foco volta ao barcode.

## Verificação

- Lint e build frontend (inclui TypeScript) passaram; aviso preexistente de bundle grande permanece.
- 27 testes frontend passaram, incluindo 3 regressões novas de recuperação de cache, paginação e apresentação de documentos.
- Navegador com API real e PostgreSQL local: link inválido bloqueou salvar e manteve formulário; link válido salvo sem Aplicar URL. Consulta direta ao banco de QA confirmou o link persistido.
- Categorias: tentativa de trocar pediu confirmação, Continuar preenchendo manteve o rascunho; fechar também pediu confirmação; descarte explícito fechou sem criar categoria.
- Busca: Novo produto escolhido com setas enquanto Buscando produtos permaneceu selecionado após a resposta.
- Rota inexistente apresentou Página não encontrada e retorno.
- Formulário conferido em desktop padrão, 1024 e 390 px, sem overflow horizontal global (1019/1019 e 385/385 úteis). Overrides removidos. Prints nesta pasta. Full-page screenshots podem capturar o rodapé sticky na posição do viewport.

Limites: não houve teste prolongado com leitores de tela nem múltiplos operadores físicos; polling e invalidação foram revisados no código. Falha de refetch tem regressão de renderização, sem simulação manual completa de perda de rede. Login com falha transitória e exibição de fornecedores com dados longos foram revisados no código; não houve escrita de dados empresariais para fabricar exemplos. Nenhum teste de QA foi feito no Neon.
