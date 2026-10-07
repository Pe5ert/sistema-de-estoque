# Feedback operacional — 07/10/2026

Implementação na branch `sistema-de-estoque-v2`, sobre `a4b3c38`. O remoto foi conferido antes de começar; o onboarding anterior foi preservado fora deste escopo. Sem migration, biblioteca nova ou alteração das regras de estoque.

## Direção e componentes

GAVYO é uma ferramenta operacional para a equipe cadastrar produtos, registrar entradas/saídas e consultar o rastro do estoque. A prioridade é resultado → motivo → próximo passo. O primeiro passo continua sendo identificar o produto ou revisar a planilha. Sucesso significa operação confirmada pela API, com histórico/saldo atualizados. Recuperação mantém o formulário e aponta o campo ou a consulta que precisa de correção. No mobile, salvar/confirmar permanece na posição existente.

Camada compartilhada: `FeedbackProvider`, `useFeedback`, `Alert`, `FieldError` e `ConfirmDialog`. Contexto separado em `feedback-context.ts` para evitar substituição de contexto durante HMR. `ConfirmDialog` reutiliza `DetailDrawer`: foco contido, fundo inert, Escape, restauração do foco. Sem dependência adicional.

Referências consultadas: [Dmitry Sergushkin](https://dribbble.com/shots/26985331-Toast-Notification-System), [Sudarshan V](https://dribbble.com/shots/26980746-Toast-UI-Components), [Yogesh](https://dribbble.com/shots/18791338-Toast-Notification-UI) e [Agata Kivilšo](https://dribbble.com/shots/25997723-Centralized-Notification-Dashboard-UI). A referência principal orientou hierarquia, descrição curta e ação. Preservados grafite, cobalto, tipografia e geometria do GAVYO. Não foi implementada central de notificações, barra temporal ou ação Desfazer.

## Política

- Toast: resultado de uma ação recente. Success 4 s, info 5 s, warning 7 s; error permanece até ser dispensado. Com CTA, permanece para permitir leitura/ação.
- Até três toasts visíveis; os demais aguardam sem perda de mensagens. Chave opcional substitui avisos do mesmo fluxo. Pausa com mouse, foco, aba oculta e drawer/menu modal aberto.
- Desktop: canto inferior direito, acima da barra sticky do formulário. Mobile: topo com margens de 16 px, texto quebrado e área rolável limitada a 45% da altura. Assim o cadastro não fica encoberto pelo toast no desktop e as ações inferiores ficam livres no celular.
- Ícone + texto + pequeno acento semântico. Fundo neutro. Entrada de 180 ms e respeito a reduced motion. Sem barras decorativas.
- Regiões vivas existentes anunciam novos avisos; erros usam alert, demais status. Dismiss por botão ou Escape quando o toast está focado, com devolução do foco. Escape não é capturado globalmente por toast.
- Logout/401 limpam avisos e metadados de mutações privadas. A fila não é persistida em storage: reload não reapresenta sucessos antigos.

## Migração e catálogo de mensagens

| Fluxo | Mensagem/padrão | Local |
| --- | --- | --- |
| Produto criado | Produto criado com sucesso. | Toast success |
| Produto editado | Produto atualizado com sucesso. | Toast success |
| Produto inativado | Produto inativado. | ConfirmDialog antes, toast após API |
| Falha ao salvar produto | Não foi possível salvar o produto. + motivo + seus dados continuam no formulário | Toast error persistente |
| SKU/barcode duplicado | Este SKU já está em uso. / Este código de barras já está em uso. | FieldError e foco no campo |
| Entrada/saída | Entrada/Saída registrada com sucesso. + produto/saldo retornado pela API | Toast success com Ver no Histórico |
| Saída maior que saldo | Saldo insuficiente para esta saída | Prévia contextual; quantidade recebe erro se rejeitada pela API |
| Falha de movimentação | Não foi possível registrar a movimentação. + conferir Histórico/saldo antes de tentar novamente | Toast error |
| Código ausente/não encontrado/ambíguo | Mensagens existentes junto ao leitor, com identificação dos candidatos | Contextual; sem toast a cada leitura |
| Análise da planilha | Planilha pronta para revisão. / A planilha precisa de revisão. | Toast info/warning |
| Categorias desconhecidas | Há categorias para revisar. | Alert warning persistente |
| Mapeamento alterado | Mapeamento alterado. | Alert warning até validar |
| Importação concluída | Importação concluída: N produto(s) adicionado(s). | Toast success com singular/plural |
| Resultado da importação | Contagens, categorias, entradas, linhas ignoradas, ID e acesso ao catálogo | Alert success persistido pelo job |
| Arquivo inválido/falha de importação | Não foi possível concluir a importação. + motivo | Alert error, mantendo relatório detalhado |
| Job falhou/processando | Não foi possível importar o lote. / Importação em andamento. | Toast e detalhe do job |
| Login inválido | E-mail ou senha inválidos. | Alert error no login |
| Sessão rejeitada | Sua sessão expirou ou foi encerrada. Entre novamente para continuar. | Alert warning no login |
| Reconexão com sessão conhecida | Não foi possível atualizar sua sessão. O preenchimento permanece aberto. | Alert warning e Tentar novamente |
| Logout | Você saiu do sistema. | Toast info |
| Backup iniciado | Backup iniciado. Você pode continuar usando o sistema. | Toast info + estado contextual em Backups |
| Backup concluído/falhou | Backup concluído. / Não foi possível gerar o backup. | Toast success/error com Ver backups, inclusive durante navegação |
| Último backup falhou | O último backup falhou. | Alert warning persistente na página de backups |
| Agendamento | Agendamento salvo. / Alterações ainda não salvas. / Não foi possível salvar o agendamento. | Toast success / Alert warning/error |
| Categorias | Categoria salva. / Não foi possível salvar a categoria. | Alert dentro do drawer; duplicidade junto ao Nome |
| Consultas | Não foi possível carregar os dados. + motivo | Alert error e Tentar novamente |
| Datas/imagem inválidas | Erro específico de data/URL | FieldError |

Downloads não mostram sucesso fictício: clicar num link não comprova que o arquivo terminou de baixar. Detalhes de erros da importação, auditoria de movimentos e prévia de saldo foram preservados. Alertas de baixo/zero estoque do painel continuam contextuais, com ações existentes. Futuras áreas podem consumir a mesma camada; não foram criados módulos novos.

## Problemas encontrados e corrigidos

1. **P1 — rascunho perdido durante reconexão.** Preencher um produto, interromper a API e aguardar a atualização de `/auth/me` podia desmontar o formulário. `SessionGate` agora mantém a superfície quando há usuário em cache e mostra aviso de reconexão; `DataState` conserva o formulário com dados já conhecidos se uma atualização da consulta falha. Uma resposta 401 continua revogando acesso.
2. **P1 — backup real falhava no Windows.** Criar backup com ferramentas disponíveis gerava `EPERM` em `fsync`, pois o arquivo estava aberto somente para leitura. `syncBackupArchive` usa acesso leitura/escrita no Windows, sem truncar o arquivo, mantendo O_NOFOLLOW e fechamento em finally. Teste nativo de regressão e backup real local concluíram.
3. **P2 — sucesso reaparecia ao voltar ao catálogo.** Removida a mensagem persistida em `location.state`, substituída por toast de ação.
4. **P2 — toast apertado contra a margem no mobile.** Largura relativa ao viewport de layout, em vez de `100vw` incluindo a barra de rolagem. Validado left=16 px e largura=343 px no viewport 390 px com scrollbar.
5. **P2 — conclusão rápida de backup podia escapar da observação de RUNNING.** Monitor acompanha também a mutação que criou a cópia, anuncia uma vez e permanece no shell durante navegação.

## Verificação

Browser interativo com API/PostgreSQL local e conta fictícia. Nenhuma alteração de dados ou migration no Neon. Para backups de QA, `DATABASE_URL`, `BACKUP_DATABASE_URL` e `DIRECT_URL` devem apontar explicitamente para o banco local; as URLs alternativas têm precedência no serviço de backup.

Resoluções: 1440×900, 1024×768 e 390×844. Exercitados: login inválido/correto/logout; SKU e barcode duplicados com foco; cadastro; navegação com toast; entrada e registro no Histórico; saída sem saldo bloqueada; drawer por Enter; modal de descarte e Escape; inativação, Shift+Tab contido e persistência após reload; importação inválida/válida, info + success consecutivos e resultado após reload sem novo toast; texto longo; foco pausando timeout por mais de 4 segundos; erro persistente; reconexão sem perda do rascunho; backup falho e concluído fora da página; estado vazio e loading.

Gates: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `git diff --check` passaram. Incluem dois testes da fila e teste real de sincronização de arquivo. As suítes opcionais de backup/estoque PostgreSQL não foram ativadas no comando geral; os fluxos de UI desta rodada usaram PostgreSQL real local. As suítes amplas de importação/concorrência da rodada anterior não foram repetidas.

Evidências principais: [desktop — backup durante navegação](backup-desktop.png), [mobile — toast longo e foco](success-mobile.png), [tablet — backup durante navegação](backup-tablet.png), [reconexão — rascunho preservado](reconnect-tablet.png), [mobile — confirmação de inativação](inactivate-mobile.png), [SKU duplicado](duplicate-desktop.png), [login inválido](login-error-desktop.png), [estado vazio](empty-desktop.png).

As capturas adicionais registram etapas intermediárias do QA. `backup-desktop.png`, `backup-tablet.png` e `success-mobile.png` mostram a posição final dos toasts.

Limites: leitura com leitor de tela real e bipador físico não foi feita; ARIA e teclado foram verificados no navegador. O banner de sessão expirada foi migrado preservando o mecanismo existente; a passagem de 8 horas não foi aguardada. O build mantém os avisos já existentes de anotações Zod e bundle acima de 500 KB. Para produção Windows, as ferramentas de backup ainda precisam estar configuradas nas variáveis locais; não foram modificadas credenciais ou `.env`.
