# Backups — QA de 05/10/2026

Pull fast-forward da branch sistema-de-estoque-v2: c0a7344 → c966316. Alterações locais de artifacts/stress-20261002 preservadas. Esta rodada implementa backups; nenhum commit/push foi feito.

## Funcionalidade

ADMIN: cópia completa manual, download e agenda semanal/mensal. Padrão mensal no primeiro dia às 02:00 America/Fortaleza; retenção de 365 dias. Agenda persistida em arquivo privado, trabalhos assíncronos 202, trava de concorrência, arquivo parcial separado, validação do índice, SHA-256, download autenticado e controle de retenção após sucesso. Uma cópia automática por período; recuperação do período atual após servidor desligado e retentativa de falha após uma hora.

## Verificações

- pnpm lint, typecheck, build e git diff --check: PASS com Node 22.23.3 / pnpm 11.24.0. Avisos já conhecidos de PURE/Zod e tamanho do bundle.
- Suíte geral pnpm test: PASS; auth/Decimal/contratos e formulário. Testes reais opt-in aparecem SKIP nessa execução geral.
- Suíte específica final de backup: **8/8 PASS**, incluindo PostgreSQL real 17.10 com ferramentas 17.11, duas bases loopback isoladas de exportação/restauração. O teste exige nomes _backup_test / _backup_restore_test e rejeita destino remoto. Sem uso de Neon para fixtures ou restauração.
- Restauração: produto original preservado após mudança no banco de origem; saldo 80.125, mínimo 10.001, custo 12.34 e venda null exatos; categorias, usuários, histórico e constraints recuperados.
- HTTP: 401 anônimo, 403 operador/gerente/origem não autorizada, 400 agenda inválida, 202 geração, 409 concorrência, arquivo PGDMP em download, no-store, corrupção recusada com 503.
- Serviço: agenda/fuso/virada de mês/semana, persistência após reiniciar, arquivo parcial removido em falha, timeout de subprocesso, recuperação de trabalho interrompido e trava de processo morto, retenção e ausência de duplicação automática.
- UI pelo navegador: criar → aguardando → disponível → baixar; alternar semanal/mensal; dia da semana/horário por teclado; salvar e recarregar conserva valores; aviso de alteração pendente e feedback salvo; operador não vê Backups e recebe mensagem de acesso negado em rota direta; falha real com ferramenta temporariamente ausente não libera download.
- Desktop 1440×900, intermediário 1024×768 e mobile 390×844: sem overflow horizontal. Tabela reorganizada no mobile. Arquivo baixado pela interface conferido como dump no teste HTTP. Carregamento final após reload sem erros de console. Ocorreram interrupções de processos da prévia e um erro transitório de HMR durante edições; a conferência final usou processos de QA reabertos e reload limpo.

## Evidência real Neon e limites

Consulta somente de leitura confirmou PostgreSQL 18 no Neon. Instaladas ferramentas oficiais PostgreSQL 18.6 em diretório do usuário, sem instalar servidor ou alterar versões do monorepo. Caminhos privados de ferramentas/pasta foram adicionados ao .env local; credenciais e demais variáveis preservadas.

Primeira cópia completa real: concluída, 16.269 bytes, índice pg_restore legível, SHA-256 e tamanho iguais ao manifesto, arquivo 600 / pasta 700. Arquivo em var/backups, ignorado pelo Git. Não transportar dump, manifesto real, credenciais ou .env nos artifacts. Não houve escrita de produto/estoque, seed, reset ou restauração no Neon. A restauração funcional foi testada somente com dados fictícios nas bases isoladas PostgreSQL 17; não afirmar restauração de dados privados do Neon.

Aplicação iniciada com a configuração local real: frontend em localhost:5173 e API em localhost:3000. Health 200/database up; GET /api/backups sem sessão retorna 401. A aba real foi deixada no login, para entrada com a conta da equipe; a prévia de QA em localhost:5175 permanece separada.

Backup é lógico do banco. Não copia .env, roles globais PostgreSQL ou conteúdo externo das URLs de imagens. Agenda depende da API em execução e pasta persistente; esta versão se destina a um servidor com armazenamento local. Manual de configuração/recuperação: docs/BACKUPS.md.

## Prints

Todos os prints abaixo usam **dados fictícios do banco isolado de QA**:

- monthly-desktop.jpg / weekly-desktop.jpg: comparação mensal e semanal.
- monthly-1024.jpg / monthly-mobile.jpg: responsividade.
- operator-denied-mobile.jpg: navegação restrita ao papel.
- failed-mobile.jpg: falha simulada, download indisponível, mensagem legível.
- final-desktop.jpg: mensal ativo, cópia manual e automática válidas, falha simulada preservada no histórico.


## Rodada adicional de uso — 05/10/2026

Escopo confirmado pelo usuário: testar somente o backup para uso por empresas de qualquer ramo; não acrescentar funcionalidades próprias de lavanderia.

**12/12 verificações de uso PASS**, pela interface real em localhost:5175 com API e PostgreSQL locais isolados. Clique duplo criou somente um novo registro; rascunho semanal/sexta-feira preservado enquanto a lista atualizava; agenda semanal persistiu após reload; manual funcionou com automático desativado; a geração concluiu após sair da tela para Produtos e voltar; agenda mensal ativa persistiu após reload. Falha simulada da rodada anterior permanece legível e sem download. Mobile de 390 px sem overflow; perfil OPERATOR recebe acesso negado e não vê o item de menu; download concluiu no navegador; sem erros de console nesta rodada.

O arquivo efetivamente baixado pelo navegador foi restaurado em uma nova base local temporária. **7/7 verificações PASS**: assinatura PGDMP, SHA-256/tamanho iguais ao manifesto, comparação sem diferenças de todas as linhas de User/Category/Product/StockMovement e presença de constraints. O banco de restauração foi removido depois da conferência. O dump não foi copiado para o repositório. Os dados de teste desta rodada são pequenos (um registro por entidade); esta rodada não mede capacidade de backup de grandes bases.

O perfil fictício foi devolvido a ADMIN e a agenda de QA a mensal ativa/02:00; viewport temporário removido. Neon e configuração real não foram alterados. Sem mudanças de implementação, commit ou push; foram acrescentadas somente estas evidências de QA.

Resultados: usability-results.json e usability-restore-results.json. Prints: usability-desktop.png, usability-mobile.png e usability-operator-denied.png.

## Guia de restauração e commit autorizado — 05/10/2026

Incluída a ajuda recolhível **Como restaurar um backup** na tela, com quatro passos: escolher a data, baixar o arquivo .dump, solicitar a restauração ao responsável técnico pela instalação e conferir produtos/saldos/histórico. O texto esclarece que lançamentos posteriores à cópia não estão nela e orienta conservar uma cópia atual antes de substituir os dados. O procedimento técnico permanece em docs/BACKUPS.md; não foi criado endpoint de restauração.

QA do guia: **10/10 PASS**, estado inicial recolhido, Enter/Espaço e foco, quatro passos, clique/toque, larguras 1440/1024/390 sem overflow e reload limpo sem erros de console. Resultados em restore-guide-results.json; capturas restore-guide-desktop.png, restore-guide-1024.png e restore-guide-mobile.png. Uma ação de captura após remover o viewport temporário precisou ser retomada por timeout do navegador; nova captura com viewport explícito concluída. Nenhum dado real do Neon foi alterado.

O usuário autorizou o commit da funcionalidade de backups, guia e evidências. artifacts/stress-20261002 pertence à rodada anterior e fica fora deste commit, assim como .env, ferramentas e arquivos reais de backup.

## Responsabilidade da empresa — 05/10/2026

Texto ajustado conforme o modelo informado: a própria empresa administra as cópias do banco de sua instalação licenciada. O guia encaminha a restauração ao administrador do banco de dados da empresa e orienta conservar cópias em outro local. Mudança restrita aos textos da tela e documentação, sem alterar geração/agendamento, conexão de banco ou autorização.

Conferência visual: **5/5 PASS**, texto correto, 1440/1024/390 sem overflow e reload limpo sem erro de console. Lint, typecheck, build e diff --check PASS na revisão textual. Evidências: company-backup-results.json e company-backup-desktop.png.

Pesquisa solicitada de relatórios: conferidos rotas/componentes da V2, controllers, menções a relatórios/reports e exportação PDF/CSV/Excel. Existem dashboard e histórico filtrável; não existe módulo de relatórios nem exportação desses dados na V2. A menção a relatórios em docs/legacy-diagnosis.md descreve o legado. Nenhuma funcionalidade de relatório foi implementada.
