# GAVYO — aplicação da auditoria de UI e motion

14/10/2026, sobre c77d835. Implementação dos 20 itens de `../ui-motion-audit-20261014/REVIEW.md`, sem novas dependências, alterações de API, migration ou configuração de banco.

## Matriz da entrega

| Item | Implementação |
|---|---|
| 1. Carregamento | Skeleton estável no primeiro acesso; listas preservam resultados anteriores, identificados e temporariamente sem interação quando correspondem a outro filtro. |
| 2. Confirmação em execução | Estado Processando, indicador, aria-busy; cancelar, fechar e Escape bloqueados durante execução. |
| 3. Movimentação | Entrada discreta do produto selecionado, correspondências e feedback de prévia/erro/sucesso. Sem atraso na disponibilidade do código ou contagem animada de saldo. |
| 4. Navegação/rolagem | Nova área volta ao início e recebe foco; mapa de posições para voltar. Mudança de query não dispara a entrada de página nem a rolagem. |
| 5. Drawer | Fechamento solicitado por X/Escape/cancelar usa saída de 160ms, preservando bloqueio de fundo e foco até desmontar. Troca de rota e fechamento provocado pelo resultado da operação continuam imediatos. |
| 6. Itens de compra | Entrada da linha, destaque em foco e remoção com saída curta; foco no próximo item ou na busca. Remoção em curso bloqueia salvar/remover novamente. |
| 7. Erros/avisos | Espaço de feedback nos campos; entrada discreta de mensagens sem tremor nem replay da página. |
| 8. Botões | Indicador visual compartilhado por aria-busy; atributos nos envios de produto, fornecedor, compra, categoria, contagem, scanner e backup, preservando rótulos específicos. |
| 9. Consulta/paginação | Debounce de 220ms em busca de produtos e movimentos, aviso localizado de atualização, paginação com status e bloqueio de execução. Histórico sincroniza filtros/período/página com URL. |
| 10. Contagem física | Linha editada e texto Não salvo/Salvando/Salvo, derivado de drafts e resposta real. Linhas não mudam de ordem por animação. |
| 11. Operações longas | Indicadores indeterminados nos controles, sessão e importação; importação PROCESSING consulta o resultado a cada 2s. Sem porcentagem inventada. Backup mantém o monitor existente. |
| 12. Toast | Saída e redução do espaço do aviso; pausa em hover/foco/modal/aba oculta e anúncios existentes preservados. |
| 13. Disclosure | Altura, opacidade e fechamento progressivos com CSS nativo; fade existente como fallback. |
| 14. Ação da linha | Aparecimento suave por opacidade; mantém acesso por foco e touch. |
| 15. Estoque | Transição curta da largura/cor da barra; números permanecem imediatos. |
| 16. Imagem | Área estável, indicador de carregamento, reveal quando carregar e fallback de erro; edição por URL com transição e devolução de foco. |
| 17. Copiar | Ícone/texto Copiado temporários, status e mensagem de falha preservados. |
| 18. Navegação | Indicador ativo com fade; backdrop mobile com entrada/saída, aproveitando movimento da lateral. |
| 19. Tema | Cores das superfícies transitam brevemente; ícone troca com entrada discreta. Contexto/formulários não remontam ao alternar. |
| 20. Entrada de página | Superfície de rota única, acionada por pathname; refetch, filtro e tema não repetem entrada da página. |

## Validação

- Lint, TypeScript e build do frontend: logs nesta pasta.
- 19 testes existentes do frontend: dashboard/links, feedback, precisão decimal, produto, compras e inventário físico. Esses testes não substituem QA de interação dos novos timers.
- Navegador local: Produtos nos dois temas; busca sem resultado e limpar filtros; aviso de atualização sem substituir a tabela; categorias abre e fecha por Escape; retorno visual do foco ao acionador; página rolada de Produtos → Histórico abre no início.
- Novo produto: nome fictício digitado, alternância escuro → claro manteve preenchimento; saída mostrou confirmação; Continuar preenchendo fechou e manteve nome; Descartar e sair retornou a Produtos. O rascunho não foi salvo.
- Compras: lista carregou com skeleton; novo pedido local, busca por SKU fictício, inclusão do produto com foco na quantidade e remoção retornando ao estado sem itens. Rascunho descartado pela confirmação; nenhum pedido foi gravado.
- Capturas são integrais da janela do aplicativo, não screenshots de viewport 1440px. Dados são de QA local.

## Limites e comportamento deliberado

A implementação cobre todas as famílias da auditoria; a validação visual atual é representativa, não uma certificação de todos os fluxos. Ainda falta testar celular físico, leitor de tela, movimento reduzido no dispositivo e Safari/Firefox, além de execução lenta real de recebimentos, importação, contagem e backups. Regras CSS de movimento reduzido e fallbacks estão incluídas. A auditoria original permanece como registro do estado anterior.

Saídas animadas são de interação explícita. Navegação, erro de sessão e conclusão de operação não aguardam um efeito visual. Selects continuam nativos e os valores de estoque/dinheiro não são animados. Não foi executada uma operação de escrita em banco compartilhado.
