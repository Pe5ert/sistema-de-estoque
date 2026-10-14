# GAVYO — Interações e primeira versão do modo claro

## Escopo e decisões

Refinamento de um produto operacional existente: equipe interna filtra produtos, compras e inventários, preenche formulários e consulta detalhes. Prioridade: escolha legível e rápida, feedback de abertura/foco e preservação do preenchimento. Manter React, HTML nativo, geometria de 2px, hierarquia e ações azuis; nenhuma dependência ou alteração de dados/autenticação.

## Implementação

- Selects simples usam `appearance: base-select` apenas onde suportado, sem substituir campos ou eventos por componentes JavaScript. Menu e seta entram/saem com transições de 180ms, seleção destacada, checkmark e opções com área de toque. Rolagem limita menus grandes. Navegadores sem suporte conservam o select convencional e os estados de foco.
- Botões, campos e foco têm transições de 120–150ms. Conteúdo de disclosures e resultados da busca de produtos em Compras entram em 180ms. Movimentos decorativos desativados com reduced-motion.
- Escape prioriza o select aberto antes de fechar o drawer que o contém. Valores, validação, envio e permissões permanecem nos componentes existentes.
- Claro/escuro acessíveis pelo cabeçalho do sistema e login. Preferência local `gavyo.theme`, aplicação antes da primeira pintura e sincronização entre abas. Se o armazenamento estiver bloqueado, a troca ainda funciona na aba atual. Escuro permanece o padrão sem preferência.
- Paleta clara para fundo, superfícies, texto, bordas, inputs, tabelas, alertas, estados e detalhes. Hero azul preserva a identidade e os indicadores de situação. Links Abrir de inventários deixam de quebrar em letras na largura intermediária.

## Verificação realizada

No navegador do aplicativo: modo claro na lista de inventários e Dashboard; menu aberto com fundo/seleção/foco corretos; seta Down seguida de Enter selecionou Em contagem e retornou estado vazio esperado; reload preservou o tema claro. Capturas: `dropdown-light.jpg` e `dashboard-light.jpg`, incluindo a janela do aplicativo na largura disponível.

Houve falha do contexto de autenticação durante hot reload de um componente compartilhado. Um carregamento completo recuperou o sistema e o tema salvo; não apareceu durante a troca de tema. Não confundir essa recuperação do ambiente de desenvolvimento com teste de implantação em produção.

Lint e build/typecheck do frontend passaram. Os 19 testes web passaram. Backend/banco não foram alterados. Cores principais verificadas matematicamente em `contrast.json`: texto auxiliar 5,78:1, ação branca/azul 5,07:1 e borda de campo 3,5:1; não é uma certificação completa de acessibilidade.

## Limites desta primeira versão

Ainda conferir todas as páginas/formulários/drawers nos dois temas, celular físico, Safari/Firefox, leitor de tela e a preferência de movimento reduzido efetivamente ativada. O teste real de preenchimento durante troca de tema não foi concluído; a implementação preserva os componentes sem remontagem por tema. Nada de GSAP, bibliotecas de selects ou animations sobre números.

Referência técnica verificada: [MDN — Customizable select elements](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select). A compatibilidade é limitada e a melhoria progressiva conserva o comportamento convencional nos demais navegadores.
