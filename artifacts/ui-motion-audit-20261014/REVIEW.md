# GAVYO — auditoria de UI, UX e movimento

Data: 14/10/2026. Base: c77d835, branch sistema-de-estoque-v2.

## Escopo e evidência

Inventário e análise do código das famílias de componentes do frontend: navegação, autenticação/permissões, Dashboard/gráficos, tabelas/filtros/paginação, formulários/campos/quantidades, imagens, detalhes/confirmações, alertas/toasts, movimentação, categorias, fornecedores, compras/recebimentos, inventário físico, importação e backups. CSS global e tema claro também revisados.

Observação atual no navegador: Dashboard e navegação para Produtos, no modo claro e com dados fictícios locais. As duas imagens nesta pasta são capturas integrais da janela do aplicativo; não são screenshots de viewport desktop de 1440px. Nenhuma operação de estoque, compra, importação, backup ou banco compartilhado foi executada nesta auditoria.

**V** = observado nesta sessão no navegador. **C** = confirmado pela implementação. **P** = comportamento ou impacto precisa de teste dirigido. Ausência de animação é uma oportunidade de acabamento, não prova de defeito funcional. P1 significa prioridade de experiência operacional; não implica falha crítica de dados.

## Achados prioritários

### 1. P1 — carregamento desfaz a estrutura da lista [V/C]

`data-controls.tsx:5`, `inventory-api.ts:12–22`, `Products.tsx:53`, `History.tsx:36`.

O componente substitui o conteúdo por “Carregando…”. Produtos e Histórico não usam preservação de resultados entre chaves de consulta, ao contrário do Dashboard. Na navegação observada, o corpo da tabela ficou reduzido a uma faixa antes de os resultados aparecerem.

Reproduzir: abrir Produtos sem cache; observar durante a resposta. Para ampliar a inspeção: mudar filtros/páginas sob conexão lenta.

Correção: skeleton com cabeçalho/linhas e altura estável no primeiro acesso; manter resultados anteriores ao atualizar, sinalizando claramente que pertencem à consulta anterior. Bloquear ações que poderiam operar sobre registros desatualizados enquanto necessário. Fade curto no conteúdo pronto, sem animar linha por linha. Não apresentar resultado antigo como resultado do novo filtro.

### 2. P1 — confirmação de operação não mostra seu estado de execução [C/P]

`feedback.tsx:85–86`, `Purchases.tsx:92`.

`busy` desabilita a confirmação, mas mantém o rótulo; cancelar e fechar continuam disponíveis no componente compartilhado. No recebimento, isso pode ocultar a operação ainda em curso. Não foi executado um recebimento para medir o impacto.

Reproduzir em QA: revisar recebimento, confirmar sob resposta lenta e tentar cancelar/fechar. Conferir se o resultado permanece visível e se uma nova tentativa é impedida.

Correção: estado explícito “Registrando recebimento…” com indicador discreto e `aria-busy`; política consistente para cancelamento durante execução. Fechar o painel não pode sugerir cancelamento de uma requisição já enviada. Preservar idempotência e travas existentes; animação não substitui esses controles.

### 3. P1 — movimentação muda de etapa sem continuidade visual [C/P]

`MovementWorkbench.tsx:105–145`, `styles.css:389–395`.

Consulta, produto selecionado, saldo previsto, erro e resultado são conteúdos condicionais sem transição específica. Já existem proteção contra repetição, texto de execução e regiões de status; falta acabamento entre as etapas.

Correção: regiões com altura estável e entrada de 120–180ms; sucesso identificado com texto/ícone e saldo final imediato. O campo para o próximo código deve continuar pronto sem esperar a animação. Não animar números nem atrasar leitura do bipador.

### 4. P2 — navegação preserva rolagem e esconde o início da nova tela [V/C]

`App.tsx:56,123–127`. Evidências: `products-loading.jpg`, `products-after-navigation.jpg`.

Reprodução realizada: Dashboard já rolado até o gráfico → clicar Produtos na lateral → destino permanece rolado; título, ações e filtros ficam acima da área visível. Depois do carregamento, a tela permanece no meio/final da lista.

Correção: definir restauração de rolagem e foco por tipo de navegação. Nova área abre no início; voltar à lista pode restaurar posição/filtros. Mudança de filtro não deve mandar o usuário ao topo de toda a aplicação. Não adicionar rolagem suave obrigatória.

### 5. P2 — drawers têm entrada, mas fecham imediatamente [C]

`DetailDrawer.tsx:10,37–46`, `styles.css:1233–1239`.

Painel entra em 240ms e backdrop em 180ms; desmontagem não tem etapa de saída. Afeta detalhes de produtos, movimentos, categorias e confirmações.

Correção: saída curta de 120–180ms, mantendo bloqueio do fundo e gestão de foco até concluir. Restaurar foco ao acionador uma única vez. Testar Escape, Tab, fechamento rápido e select aberto dentro do painel.

### 6. P2 — inclusão/remoção de itens de compra não orienta o olhar [C/P]

`PurchaseForm.tsx:70–75`, `styles.css:24–26,1103–1108`.

As linhas são inseridas/removidas diretamente; as demais mudam de posição sem continuidade. O resultado da busca já tem entrada animada, mas a transição para a linha escolhida não.

Correção: entrada curta, destaque temporário do item adicionado e foco na quantidade; após remover, foco no próximo controle apropriado. Saída/reorganização leve somente se não mover a linha enquanto a pessoa digita. Totais monetários devem atualizar imediatamente, sem contagem animada.

### 7. P2 — erros e avisos empurram campos sem preparação [C/P]

`form-controls.tsx:6–15`, `feedback.tsx:78–82`, `styles.css:568,988–989`.

Erro de campo e alerta aparecem condicionalmente, sem transição própria. A inserção acrescenta altura e pode deslocar ações.

Correção: prever espaço nos campos mais sujeitos a erro e entrada curta dos avisos; preservar mensagem, vínculo ao campo e foco no primeiro erro. Evitar tremor, piscadas ou animar cada validação a cada tecla. Testar textos longos em mobile e tema claro.

### 8. P2 — botões de execução não seguem um padrão único [C]

`auth/LoginPage.tsx:78`, `MovementWorkbench.tsx:135`, `PurchaseForm.tsx:75`, `CategoryManager.tsx:22`, `Backups.tsx:67–68,126`.

Login e movimentação já usam `aria-busy`; outros fluxos dependem principalmente de rótulo e desabilitação. Não há indicador de execução visual compartilhado. É inconsistência de apresentação, não prova de double submit.

Correção: componente/contrato para idle, hover, pressed, pending, success e disabled; largura estável; texto específico da operação e indicador sem movimento quando reduzido. Manter as travas específicas de cada operação.

### 9. P2 — filtros e paginação não têm continuidade de atualização [C/P]

`data-controls.tsx:8–11`, `Products.tsx:29–35,44`, `History.tsx:19–28`.

Paginação compartilhada não recebe estado de execução nem gerencia foco. Busca em Produtos muda a consulta a cada alteração. Histórico mantém filtros editados em estado local, enquanto o link de entrada inicial está na URL.

Correção: atualização localizada, sinal de consulta em andamento, debounce curto para texto e feedback da quantidade resultante. Considerar URL consistente também no Histórico para reload/compartilhamento. Testar paginação por teclado; não perder foco ao trocar o conteúdo.

### 10. P2 — contagem física precisa sinalizar o que foi salvo [C/P]

`PhysicalInventoryDetail.tsx:138–152` e rotinas de salvamento em lotes.

Há progresso textual, erros e reconferência, mas não um padrão visual de transição por linha entre digitado, salvando e salvo.

Correção: estado discreto por linha, acompanhando a confirmação real do servidor. Não destacar linhas como salvas antes da resposta; não reordenar ou animar posição durante digitação. Preservar drafts e resolução de conflito.

### 11. P2 — processamento longo tem pouca indicação de atividade [C/P]

`ProductImport.tsx:106,124,136`, `Backups.tsx:67–86`, `auth/ProtectedRoute.tsx:7`.

Importação, geração de backup e verificação de sessão usam sobretudo texto. A apresentação pode parecer parada; isso não comprova travamento.

Correção: indicador indeterminado + etapa real, com mensagens distintas para processando, concluído e falha. Só usar porcentagem se existir progresso real. Auditar atualização automática, timeout e recuperação separadamente; não foram simulados jobs longos nesta sessão.

## Acabamento secundário

| # | Prioridade / evidência | Família e problema | Ajuste proposto | Local |
|---|---|---|---|---|
| 12 | P3 / C | Toast entra, mas some e reorganiza a pilha instantaneamente | Saída curta e reorganização discreta; preservar pausa em hover/foco, anúncios e prioridade de erros | `feedback.tsx:21,56–68`; `styles.css:987–992` |
| 13 | P3 / C | Disclosure anima apenas os filhos ao abrir; fechar e mudar altura é imediato | Entrada/saída e indicador coerentes; conteúdo longo não deve ganhar dezenas de animações | `appearance.css:47–51`; `DashboardCharts.tsx:36` |
| 14 | P3 / C | A ação de detalhes da linha aparece por salto de opacidade | Transição de opacidade de 100–140ms; continuar visível no foco e em dispositivos sem hover | `styles.css:774–776,820–822` |
| 15 | P3 / C | Barra de estoque muda largura diretamente | Transição curta somente nas atualizações reais; número e status atualizam sem atraso | `inventory-ui.tsx:30`; `styles.css:215–220` |
| 16 | P3 / C | Imagem passa diretamente de imagem para fallback; edição por URL abre/fecha abruptamente | Placeholder estável, carregamento/erro claros, reveal discreto quando carregar e foco restaurado após cancelar | `inventory-ui.tsx:12–15`; `ProductImageField.tsx:18–25` |
| 17 | P3 / C | Copiar ID mostra texto, mas o botão não comunica mudança | Texto/ícone “Copiado” temporário, mantendo anúncio e erro de clipboard | `History.tsx:46–51` |
| 18 | P3 / C | Navegação anima cores, mas indicador ativo e backdrop mobile são instantâneos | Fade localizado do indicador/backdrop; aproveitar o movimento já existente da lateral | `styles.css:135,421–423`; `App.tsx:56–72` |
| 19 | P3 / C | Mudança de tema e ícone é abrupta fora dos controles com transição | Transição curta de cores nas superfícies principais, sem remontar formulários nem transicionar todas as propriedades | `Theme.tsx`; `appearance.css:40–45` |
| 20 | P3 / C | Entrada de páginas não cobre todos os formatos de raiz | Contrato consistente para listas, formulários e detalhes; executar só na navegação, não em refetch nem remount da edição | `styles.css:1234–1235`; `ProductForm.tsx:107`; `Suppliers.tsx:53` |

## Famílias que já têm uma base útil

- Selects: abertura/fechamento, seta, opções e foco já tratados por melhoria progressiva nativa em `appearance.css:53–75`. Não substituir todos por dropdown JavaScript apenas para animar. Fallback em outros motores e Escape dentro do drawer ainda precisam de teste.
- Quantidade e seletor Entrada/Saída: hover, pressed, foco e seleção já existem (`styles.css:756–767`). Um indicador deslizante é opcional e de baixo retorno; controles rápidos não precisam de efeito adicional.
- Checkbox/radio: manter semântica nativa. Revisar alinhamento, área clicável e feedback de seleção antes de investir em animação.
- Gráficos: barras, troca de período, links e inspector já têm trabalho específico. Melhorias restantes são locais: continuidade do inspector, clareza da seleção persistente e estados sem movimento. A seleção ficar após hover é uma decisão a validar, não bug confirmado.
- Vazios e permissões: há mensagens, retry, limpar filtros e retorno em diferentes telas. Auditar uniformidade da recuperação; não acrescentar ilustrações animadas. `PermissionRoute.tsx` já orienta falar com administrador e voltar aos produtos.
- Login/sessão: já há feedback de envio, erro, retry e preservação do preenchimento na falha de atualização. Prioridade adicional é estabilidade e atividade durante espera, não animação decorativa do formulário.
- Backups: uma operação sensível exige estado e resultado confiáveis. Não usar movimento para sugerir sucesso antes da confirmação nem testar restauração em banco compartilhado.

## Ordem recomendada de execução

1. **Feedback operacional:** carregamento estável, confirmações/botões em execução, rolagem e foco ao navegar, etapas da movimentação. Maior retorno para o trabalho diário.
2. **Mudanças dentro da tela:** drawers com saída, erros/avisos, linhas de compra, filtro/paginação e contagem física.
3. **Acabamento:** toast/disclosure, detalhes de linha, imagens, barras de estoque, copiar ID, navegação e tema.

Preservar raio de 2px, composição existente e desempenho. Preferir CSS e estado local; nenhuma necessidade demonstrada de adicionar biblioteca de animação. Padrão sugerido: 100–160ms para feedback pequeno, 160–240ms para painel. Não aplicar `transition: all`, stagger em tabelas inteiras, contador animado de dinheiro ou atraso no foco.

## Critérios de aceite para as correções

- `prefers-reduced-motion` remove deslocamentos e movimentos não essenciais sem esconder estado/feedback.
- Teclado: Tab, Shift+Tab, Enter, Space e Escape; foco preservado durante carregamento e restaurado ao fechar.
- Conexão lenta/falha: conteúdo não colapsa; dados anteriores ficam identificados; erro oferece próxima ação.
- Envio repetido: proteção funcional mantida, estado de execução visível e resultado consistente após reload.
- Formulário: tema, animações e refetch não apagam drafts nem remontam campos sem necessidade.
- Testar tema escuro/claro, desktop, mobile, textos longos e listas maiores; comparar layout/performance antes/depois.

## Limites desta auditoria

Não é QA interativo completo de todas as telas. A cobertura ampla é de código; a confirmação visual atual cobre Dashboard, carregamento e destino de Produtos. Mobile físico, leitor de tela, motores alternativos, redução de movimento, rede lenta e operações de escrita continuam pendentes de validação dirigida. As recomendações acima não foram implementadas neste levantamento.
