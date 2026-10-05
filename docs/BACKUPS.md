# Backups completos — 05/10/2026

Em **Administração → Backups**, somente ADMIN pode criar e baixar cópias, ou salvar o agendamento. Operador e gerente recebem 403 mesmo chamando a API diretamente. Os endpoints usam a sessão HttpOnly existente; POST/PATCH também exigem a origem autorizada.

Cada empresa administra as cópias do banco de dados configurado em sua instalação licenciada. O administrador da empresa cria, baixa e guarda os backups; a recuperação é feita pelo administrador do banco de dados da própria empresa.

## Uso

- **Criar backup:** inicia uma cópia completa do banco naquele instante; o sistema continua disponível. O botão não modifica produtos, saldos ou movimentos. O arquivo inclui todas as datas, não apenas o último mês.
- **Baixar:** disponível somente após conclusão e verificação de arquivo/checksum. O navegador recebe um `.dump` PostgreSQL, sem carregar o banco inteiro na memória do frontend.
- **Backup automático:** o ADMIN escolhe mensal (primeiro dia) ou semanal (dia da semana), ajusta o horário e salva. Pode desativar o automático sem desativar a geração manual.
- Padrão: mensal no primeiro dia às 02:00, fuso `America/Fortaleza`. O servidor verifica a agenda a cada minuto. Na inicialização gera a cópia pendente do período atual caso o horário já tenha passado. Não fabrica cópias de períodos históricos perdidos.
- Uma execução automática concluída por período. Falhas são registradas e tentadas novamente após uma hora. A geração manual não substitui o registro de execução automática.
- Retenção inicial: **365 dias**, configurável no servidor. Cópias vencidas são removidas somente depois de concluir uma nova cópia; a nova/última cópia válida permanece. A tela mostra até os 100 registros mais recentes.

O agendamento persiste em `schedule.json` na pasta privada de backup. A pasta precisa de volume persistente ao implantar em contêiner. Os valores BACKUP_AUTO_ENABLED/BACKUP_HOUR do ambiente são os padrões de primeira inicialização; o agendamento salvo pelo ADMIN tem prioridade.

## Configuração do servidor

Instalar `pg_dump` e `pg_restore` da versão principal do PostgreSQL do servidor ou uma versão mais recente compatível. **pg_dump 17 não exporta um servidor PostgreSQL 18.** Conferir a versão do banco antes de instalar. As ferramentas não são dependências npm do projeto. Elas podem estar no PATH ou em caminhos explícitos `BACKUP_PG_DUMP_PATH` / `BACKUP_PG_RESTORE_PATH`.

Variáveis documentadas em `.env.example`:

| Variável | Padrão / finalidade |
| --- | --- |
| BACKUP_DIRECTORY | `../../var/backups`, relativo ao processo da API, iniciado pelo pnpm em apps/api. Em produção preferir caminho absoluto privado. |
| BACKUP_DATABASE_URL | Opcional; conexão de exportação. Prioridade sobre DIRECT_URL e DATABASE_URL. |
| DIRECT_URL | Opcional; conexão direta/unpooled. Preferida à conexão agrupada do Neon. |
| BACKUP_AUTO_ENABLED | `true`; padrão inicial, substituído pelo agendamento salvo na tela. |
| BACKUP_HOUR / BACKUP_TIME_ZONE | `02:00` / `America/Fortaleza`. |
| BACKUP_RETENTION_DAYS | `365`, permitido entre 31 e 3650 dias. |
| BACKUP_TIMEOUT_SECONDS | `1800`; limite por subprocesso. |

Usar usuário PostgreSQL com acesso de leitura a todos os dados que devem entrar no backup. A operação usa `pg_dump --format=custom`, uma exportação lógica consistente do banco. Não há reset, migration ou seed durante o backup.

Arquivos ficam com permissão 600, pasta 700, fora do frontend e ignorados pelo Git (`/var/backups`). São dados privados, incluindo hashes de senha. Downloads exigem ADMIN e `Cache-Control: no-store`. Senha PostgreSQL é passada ao subprocesso pelo ambiente, nunca nos argumentos, manifestos ou respostas. Saída bruta das ferramentas não é exposta, pois pode conter informações de conexão.

Há uma trava de filesystem para impedir gerações simultâneas. Arquivos parciais não são listados como disponíveis. Ao reiniciar, trabalhos de um processo interrompido são marcados como falha. O arquivo só é publicado após pg_dump concluir, pg_restore ler o índice e SHA-256 ser calculado. O checksum é conferido novamente antes do download. Falha na limpeza por retenção não invalida uma cópia concluída.

Esta versão usa um servidor de API com armazenamento persistente local. Não usar pastas independentes em réplicas/serverless: cada uma teria sua própria agenda e seus próprios arquivos. Uma agenda externa/armazenamento compartilhado para implantação distribuída é uma etapa separada.

## Restaurar

Na tela, **Como restaurar um backup** explica ao usuário como escolher a data, baixar o arquivo, solicitar a restauração ao administrador do banco de dados da própria empresa e conferir os dados depois. O guia também esclarece que lançamentos posteriores à cópia não estarão nela e orienta guardar uma cópia atual antes de substituir os dados, conservando os backups também em outro local.

A restauração é uma operação administrativa fora da interface. Primeiro restaurar em **um banco novo e isolado**, conferir dados e só então planejar a troca da aplicação. Não há botão que sobrescreve silenciosamente o banco de operação.

Usar variáveis libpq locais (PGHOST, PGPORT, PGUSER, PGDATABASE, PGPASSWORD e SSL conforme o ambiente), sem colar credenciais no terminal compartilhado/chat. Apontar PGDATABASE para a base nova e executar:

```sh
pg_restore --list /caminho/estoque-copia.dump
pg_restore --no-owner --no-privileges --exit-on-error --single-transaction \
  --dbname "$PGDATABASE" /caminho/estoque-copia.dump
```

Conferir categorias/produtos, usuários, saldo materializado e auditoria, valores Decimal e constraints. Conservar a cópia original durante a conferência. O dump contém schema, dados e migrations do banco; não contém `.env`, JWT_SECRET, configurações do servidor, roles globais PostgreSQL nem os arquivos externos de imagens (somente suas URLs persistidas). Guardar também configuração e storage necessários à recuperação.

As cópias permanecem inicialmente no servidor da API. Para recuperação após perda dessa máquina/volume, baixar e guardar em outro local. Esta exportação lógica complementa a recuperação oferecida pelo provedor do banco; não implementa replicação nem recuperação de cada alteração entre duas cópias.

## Testes

A suíte local verifica agenda/fuso, configuração inválida, credenciais fora dos argumentos, falha sem arquivo publicável, bloqueio de concorrência, persistência do agendamento e recuperação de execução interrompida.

Teste real opt-in em `apps/api/src/backups/backups.integration.spec.ts`: duas conexões **loopback** independentes; nomes precisam terminar em `_backup_test` e `_backup_restore_test`. O teste recria o schema somente nessas duas bases. Nunca apontar para Neon, produção ou DATABASE_URL da aplicação.

Configurar TEST_BACKUP_DATABASE_URL, TEST_BACKUP_RESTORE_URL, TEST_PG_DUMP_PATH e TEST_PG_RESTORE_PATH no processo e rodar `pnpm test`. O teste HTTP inclui 401/403, proteção de origem, validação do agendamento, geração 202, bloqueio 409, download binário, restauração completa, preservação de Decimal/constraints, retenção, ausência de duplicidade automática e recusa de arquivo adulterado. Sem as conexões isoladas, esse teste aparece como SKIP.

Referências: [pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html).
