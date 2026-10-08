# QA das permissões — 08/10/2026

## Escopo e decisões

GAVYO é a ferramenta operacional de estoque da equipe. O operador identifica/cadastra produtos e registra entradas/saídas; o gerente mantém o catálogo e o administrador controla backups. A decisão inicial permanece identificar o produto ou escolher uma tarefa no catálogo. Sucesso requer confirmação da API; acesso negado orienta falar com o administrador ou voltar aos produtos. Desktop/mobile preservam a composição e Novo produto como ação principal. Mantidos os componentes, tokens, tabelas clicáveis e drawers; sem redesign, biblioteca ou migration.

Matriz em [PERMISSOES.md](../../docs/PERMISSOES.md). OPERATOR pode criar produto com entrada inicial, mas não editar/inativar, gerir categorias, importar, ajustar ou acessar backups. Custos/preços continuam visíveis. MANAGER mantém cadastro/edição/categorias/importação/movimentos/ajustes; backups são exclusivos do ADMIN. A tela atual de movimentação continua oferecendo Entrada/Saída, sem nova UI de ajuste.

## API e banco

`permissions.spec.ts` usa HTTP/controllers/guards/cookies/DTOs reais com serviços stubados: 27 combinações de endpoint/ação por perfil (81 solicitações autenticadas) e 27 sem sessão. As expectativas de acesso são explícitas e independentes da matriz usada pela implementação. Cada ação negada comprova zero chamadas ao serviço. Inclui leitura, cadastro com entrada inicial, edição/inativação, categorias, ambos os tipos de ajuste, motivo de ajuste disfarçado de entrada/saída, importação/modelos/confirmação, backup/download/agenda. Cookie mantém claim ADMIN enquanto o repositório muda para MANAGER/OPERATOR, comprovando que prevalece o perfil atual. Conta inativa e perfis desconhecidos/ausentes também verificados.

PostgreSQL 17.11 loopback em base dedicada `gavyo_stock_test`. Suíte real de estoque ativada: OPERATOR cadastra com saldo inicial e autor correto; PATCH, categoria e ajustes retornam 403 sem alterar produto, categoria, saldo ou auditoria. Rebaixamento de MANAGER para OPERATOR bloqueia a edição na mesma sessão; restaurado somente o usuário fictício do teste. Os três cenários de concorrência anteriores continuam passando, agora com MANAGER + OPERATOR. Nenhuma escrita no Neon nem alteração de `.env`.

## Browser interativo

API/web locais em 3001/5174, contas fictícias ADMIN/MANAGER/OPERATOR. Todas as URLs alternativas de banco dos backups foram definidas explicitamente para o banco local e backup automático ficou desligado.

- OPERATOR: login, painel, catálogo com Novo produto e sem Categorias/Importar/Backups; detalhe por Enter e Escape sem Editar; cadastro real salvo e presente após reload; entrada real registrada com acesso ao Histórico. Motivo de ajuste indisponível no formulário (continua consultável no filtro histórico).
- Rotas diretas `/products/:id/edit`, `/products/import` e `/backups` recusadas para OPERATOR. Formulário de edição não montado; retorno ao catálogo por Enter funcionou.
- MANAGER: ações de categorias/importação/novo produto visíveis; edição real salva e refletida no catálogo; drawer Categorias abriu; tela de importação carregou; rota Backups recusada.
- ADMIN: navegação Administração/Backups presente; consulta de cópias/agenda/ações carregou. Geração/restauração/download de backup não foram repetidos nesta rodada.
- 1440×900: catálogo OPERATOR. 1024×768: catálogo MANAGER e backups ADMIN. 390×844: bloqueio de importação, retorno por teclado e entrada OPERATOR. Sem overflow horizontal nos checks de layout.

Evidências: [operador desktop](operador-desktop.jpg), [gerente tablet](gerente-tablet.jpg), [acesso negado mobile](acesso-negado-mobile.jpg), [admin backups](admin-backups-tablet.jpg). Dados das capturas são fictícios. Browser e serviços de QA encerrados ao concluir.

## Gates e limites

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `git diff --check` aprovados. A suíte real de estoque foi ativada; suítes opt-in de importação/backup PostgreSQL não foram repetidas. Build mantém avisos existentes de Zod e bundle web acima de 500 KB.

O browser verificou acessos/tarefas reais com contas de QA; a cobertura de todas as rotas negadas está nos testes HTTP. Não houve teste com leitor de tela físico nem espera por oito horas de sessão. Perfil na UI segue a atualização periódica existente, enquanto API revalida em cada requisição. Nenhum papel de usuário real foi modificado, e não foi criada tela para gestão de usuários.
