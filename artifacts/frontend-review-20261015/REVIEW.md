# GAVYO — prioridades de frontend, 15/10/2026

Base 090ec2f. Revisão de código atual e comparação com o levantamento de 14/10. Nenhuma alteração funcional, escrita no Neon ou nova reprodução no navegador nesta rodada. As evidências visuais citadas no relatório de 14/10 são históricas; o código dos problemas abaixo foi reconferido hoje.

## Alta

1. CategoryManager.tsx: seleção de categoria e Nova categoria substituem campos sem verificar alterações não salvas. Durante mutation.isPending os botões da lista também continuam acionáveis; a resolução do salvamento limpa o formulário, podendo apagar o preenchimento da seleção seguinte. Proteger troca/fechamento e impedir troca durante salvamento. Reproduzir com rascunho, troca de categoria e resposta lenta.
2. GlobalSearch.tsx: selected deriva do índice active. Produtos assíncronos entram antes das funções, deslocando o destino escolhido com setas. Usar identidade estável para seleção. Validar consulta lenta e Enter antes/depois da chegada dos resultados.

## Média

3. ProductImageField.tsx e ProductForm.tsx: novo ponto. O texto digitado em Usar link fica em draft local; só Aplicar URL/Enter chama onChange. Salvar produto ignora esse texto e a proteção dirty não conhece esse rascunho. Usuário pode salvar sem a nova imagem, ou sair sem aviso se apenas digitou o link. Aplicar/validar o link na submissão ou bloquear salvamento até resolver edição pendente; incluir draft na proteção de saída.
4. App.tsx: não há rota final de página não encontrada. Adicionar 404 com navegação e recuperação; conferir separadamente tratamento de falhas de renderização.
5. data-controls.tsx: erro de refetch pode substituir children por alerta mesmo com cache válido, quando retainContentOnError não é usado. Manter conteúdo com aviso de desatualização e retry; distinguir erro inicial, refetch e mudança de filtro. Impacto de rede ainda precisa de reprodução específica.
6. inventory-api.ts/GlobalSearch.tsx: mutações não invalidam global-search; busca pode exibir resultados anteriores após edição. Invalidar cache relacionado e anunciar refetch. Confirmar com alteração de nome, SKU e situação em banco de QA.
7. Consultas de estoque/dashboard: ausência de atualização explícita entre operadores com tela aberta. Adicionar última atualização, recarregar e revalidação adequada sem apagar formulários. Não é evidência de erro no saldo transacional.
8. ProductForm.tsx: sem categoria ativa, a orientação manda cadastrar categoria também para OPERATOR, que não tem essa permissão. Usar orientação por perfil.

## Baixa

9. LoginPage.tsx: novo ponto. finally sempre limpa password após falha, inclusive indisponibilidade/rede. Manter senha em falhas transitórias e direcionar foco/anúncio de erro; limpar ao concluir ou quando fizer sentido no fluxo. Não adicionar recuperação de senha sem definir fluxo seguro.
10. ProductImageField.tsx: novo ponto. Erro de arquivo usa image-url-error, mas aria-describedby está somente no input de URL; seletor e ações de arquivo não têm associação ao erro. Associar erro/dica aos controles e verificar anúncio com leitor de tela.
11. Compras/Fornecedores/paginação: revisão anterior permanece aplicável: rótulo de status quebrado no meio, documentos sem máscara de apresentação, filtros sem reset uniforme e singular/plural incorreto. Rever em desktop estreito e mobile antes de corrigir.

## Ordem proposta

Primeiro integridade do preenchimento e seleção por teclado (1–3); depois recuperação e atualização (4–8); por último acabamento/acessibilidade restante (9–11). Preservar composição e raio de 2 px. Não implementar tudo sem delimitar a próxima rodada.
