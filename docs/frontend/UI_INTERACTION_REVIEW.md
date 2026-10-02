# Polimento operacional de UI/UX — 02/10/2026

## Escopo e decisões

Rodada sobre a aplicação real já integrada. Identidade grafite/cobalto, composição assimétrica, tabelas, páginas de formulário e sidebar mantidas. As imagens anexadas orientaram interação e consistência. A referência WareTrack apoiou hierarquia/legibilidade; não houve troca de linguagem visual.

Antes da implementação: leitura de AGENTS.md, DESIGN.md, prompt, componentes e estilos. Capturados oito estados do commit 6167a23: Dashboard, Produtos, Movimentações, Histórico, cadastro, edição, drawer e login. Os arquivos before-*.png usam fixtures HTTP identificadas de QA, sem gravar no Neon.

## Componentes revisados

| Componente | Mudança |
| --- | --- |
| Buttons | Primary, Secondary, Tertiary e Destructive com hover, pressed, disabled legível e foco azul; links de navegação contextual mantêm semântica de link |
| Selects | Nativos, chevron próprio, superfície/padding/altura coerentes, hover/focus/error/disabled; opções continuam nativas |
| Inputs | Foco e hover coerentes entre campos, grupos monetários, quantidade, URL, busca e scanner; erro próximo do campo |
| Rows | Hover na linha inteira, Enter/Space, chevron contextual e seleção azul distinta |
| Drawers | Modais no desktop/mobile, fundo inert, trap de foco, Escape/restauração, header fixo, fechar 40/44 px e conteúdo rolável |
| Toolbars | Controles alinhados, datas agrupadas, Limpar filtros como tertiary e limpeza incluindo situação do cadastro |
| Navigation | Hover distinto do ativo, foco azul, menu mobile inclui botão Sair no ciclo de Tab; fechar menu ao solicitar navegação permite confirmar descarte |
| Badges | Cor + texto de disponibilidade/movimento, sem cursor ou hover de ação |

### Hierarquia de ações

- **Primary:** Salvar produto, Entrar, Confirmar entrada/saída e Novo produto como navegação contextual principal. Azul preenchido.
- **Secondary:** Salvar e criar outro, Editar produto, Categorias e Movimentar estoque. Superfície e borda próprias.
- **Tertiary:** Cancelar, Próximo produto, Limpar filtros e Copiar ID. Área clicável e resposta visual, com peso menor.
- **Destructive:** Descartar e sair aparece na confirmação de rascunho.

Hover muda superfície/borda; pressed aprofunda o tom. Focus-visible azul independente da cor de status. Disabled preserva texto legível, borda neutra e cursor não disponível. Radios escondidos visualmente mantêm comportamento nativo e seleção acessível. Linhas selecionadas diferem do hover.

## Por tela

### Dashboard

Ações superiores viraram controles compactos. Produtos ativos substitui o total de unidades incompatíveis. Zero alertas mostra Estoque sob controle com superfície positiva e link para o catálogo; laranja permanece quando há atenção. Tooltip do gráfico mostra data e contagens de registros em hover/foco/toque, com Escape. Foram adicionados **somente dois campos de contagem à consulta/resposta do painel**: entryRecords e exitRecords. Sem alteração de modelos, auth, transações ou dados de estoque. A posição/ordem dos blocos foi conservada; cabeçalho perdeu o eyebrow repetido e topbar ficou mais curta.

### Produtos

Hover cobre a linha inteira; Enter/Space e botão de detalhe abrem o drawer. Chevron discreto em desktop e explícito no touch; seleção azul fica identificável atrás do drawer. Filtro Cadastro também participa de Limpar filtros. Thumbnail/nome/SKU/saldo/status mantêm densidade e ordem existentes.

### Movimentações

Scanner reduz a presença depois da identificação. Quantidade permanece editável com +/− e teclado. Radios têm seleção clara, texto, sinais e suporte às setas. Saldo previsto aparece ao digitar; Confirmar entrada/saída substitui a passagem obrigatória por Ver prévia. Mantidos validação, motivo, proteção contra saldo insuficiente, trava de envio e erro do servidor. Após sucesso, outra confirmação fica bloqueada até a próxima leitura.

### Histórico

UUID retirado das linhas e disponível no drawer com Copiar ID e feedback. Nome/SKU, data, movimento, antes/depois, motivo e responsável permanecem. Datas controladas validam De ≤ Até antes da API; erro inline mantém valores. Linha clicável, seleção, drawer e controles seguem Produtos.

### Formulários e login

Composição preservada. ProductForm usa useBlocker do React Router em navegação interna/sidebar/Voltar, reutilizando a confirmação inline de descarte. Para habilitar o bloqueio, BrowserRouter foi substituído por createBrowserRouter/RouterProvider, conservando as rotas e AuthProvider. Salvar com sucesso navega sem pedir descarte. beforeunload permanece. Login recebeu somente os estados compartilhados e aria-busy; autenticação permanece existente.

## Acessibilidade e responsividade

QA em **1440×900, 1024×768 e 390×844**. Tab, Shift+Tab, Enter, Space, Escape, setas dos selects/radios; fundo inert/restauração, dirty sidebar no mobile e períodos invertidos. Sem overflow horizontal nas páginas verificadas. Drawer fullscreen no mobile. Fechar o drawer agora é necessário antes de selecionar outro registro: decisão alinhada ao pedido de modal/focus trap em todas as larguras.

## Validação

| Gate | Resultado |
| --- | --- |
| pnpm lint | PASS |
| pnpm typecheck | PASS |
| pnpm test | PASS — 35 testes locais |
| pnpm build | PASS |
| git diff --check | PASS |
| QA navegador | PASS — 10 grupos de fluxos + 3 verificações com touch habilitado, 16 screenshots after, zero pageerrors |
| API/Neon | PASS — login 200, painel com 7 dias e novas contagens, logout 204, health database up |

**Limites:** os testes de escrita do navegador usam fixtures HTTP; não gravam produtos ou estoque no Neon. A captura real usa login e consultas, sem escrita de produto/estoque. A suíte de concorrência PostgreSQL permanece SKIP por falta de TEST_DATABASE_URL separado. Avisos existentes: Node 24 fora da faixa declarada, comentários PURE do Zod e bundle JS maior que 500 kB. Não houve mudança no .env.

## Antes/depois e evidências

- Before: oito prints do estado anterior (fixtures). After: dez grupos de QA com screenshots e result.json.
- Cinco prints com dados reais do Neon: [Dashboard](../../artifacts/ui-interaction-20261002/real-dashboard.png), [Produtos](../../artifacts/ui-interaction-20261002/real-products.png), [Movimentações](../../artifacts/ui-interaction-20261002/real-movements.png), [Histórico](../../artifacts/ui-interaction-20261002/real-history.png), [Drawer](../../artifacts/ui-interaction-20261002/real-drawer.png).
- Controles antes tinham foco verde, selects com seta padrão, secundários sem hover definido e ações terciárias sublinhadas como links. Agora compartilham estados explícitos e hierarquia própria.
- Código/resultado de QA: artifacts/ui-interaction-20261002/check.cjs e result.json. Usar PLAYWRIGHT_MODULE/CHROME_PATH/QA_BASE_URL conforme a máquina. real.cjs recebe QA_EMAIL/QA_PASSWORD somente no ambiente do processo; nenhuma credencial está nos arquivos.

## Git

Diff da rodada: frontend de interação, os dois campos adicionais do painel/shared, docs e artifacts desta rodada. Conferir git status --short e git diff --stat antes de commitar; não incluir .env ou scripts temporários com credenciais. Estado inicial estava limpo na branch sistema-de-estoque-v2, commit 6167a23.

