# Correções da sidebar — 14/10/2026

Base ea6fa26. Sem alterações de API, banco ou dependências.

## Problemas corrigidos

1. **Janela baixa / página longa:** altura de viewport com conteúdo maior e sem scroll próprio deixava itens inferiores fora do alcance. Sidebar desktop agora fica fixa, com coluna reservada e rolagem independente. Filhos não encolhem para tentar caber.
2. **Resize com menu aberto:** estado mobile podia continuar aplicado no desktop, mantendo workspace inert e comportamento de foco indevido. Breakpoint de 900px fecha o estado mobile ao ampliar; desktop nunca recebe o bloqueio do menu.
3. **Botão de fechar inacessível:** o toggle do cabeçalho está dentro do workspace bloqueado. Adicionado botão de fechar dentro da sidebar, visível somente em mobile.
4. **Rolagem de fundo em mobile:** abertura do menu agora trava a página, mantendo scroll no próprio menu. Trava compartilhada com drawers para evitar que um feche/destrave por cima do outro ou deixe a página permanentemente travada.
5. **Foco:** Tab/Shift+Tab ficam no menu; Escape fecha e devolve foco ao botão de abrir; navegação não força foco de volta a um botão escondido no desktop. Sidebar mobile fechada fica inert.
6. **Animação sobrescrita:** transição de cores do tema substituía a transição de transform/visibility da sidebar. Regras mobile agora preservam os dois comportamentos e movimento reduzido.

## Verificação real no navegador local

- Desktop 989×572: após rolar a página até scrollY 467, sidebar fixa manteve top=0. Conteúdo da sidebar tem 864px e viewport 572px, agora com overflow próprio.
- Mobile 390×700: abrir focou Fechar navegação, body overflow hidden e bloqueio do fundo. Escape restaurou overflow vazio, workspace sem inert e foco no botão Abrir menu.
- Menu aberto em 390px → desktop 1024px: overflow restaurado, workspace/sidebar sem inert, backdrop removido.
- Mobile: Shift+Tab a partir do primeiro link voltou a Sair sem sair da sidebar. Não foi acionado logout.
- Selecionar Produtos fechou o menu e liberou o conteúdo. Override de viewport foi removido; estado final 989×572, sem bloqueio, sem botão mobile no desktop.
- Capturas `mobile-open.png` e `desktop-final.png` são do viewport da aplicação.

Lint, TypeScript/build e 23 testes passaram; teste novo cobre travas de scroll sobrepostas, ordem de liberação e liberação idempotente. Logs nesta pasta. Sem gravações no estoque.

Celular físico e leitor de tela ainda não foram testados. Validação de mobile foi feita com viewport do navegador.
