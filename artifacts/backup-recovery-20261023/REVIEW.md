# Backup e restauração verificados — 23/10/2026

Escopo autorizado após auditoria: configurar ferramentas no servidor normal, gerar cópia pela aplicação e comprovar restauração isolada. Sem migration, seed, reset, mudança de saldo, agenda ou código de negócio.

## Resultado comprovado

- Banco configurado e ferramentas: PostgreSQL **18.6**. A conexão de exportação foi conferida contra a base da aplicação (incluindo equivalência pooler/direta).
- Causa da falha anterior: `pg_dump`/`pg_restore` sem caminhos configurados, indisponíveis no PATH do processo da API.
- Configurados somente `BACKUP_PG_DUMP_PATH` e `BACKUP_PG_RESTORE_PATH` no `.env` local, preservando os demais valores e guardando cópia privada da configuração anterior. API reiniciada, frontend mantido.
- Cópia manual gerada pela tela de Backups em **23/10/2026, 15:08, horário de São Paulo/Fortaleza**, listada como Disponível, aproximadamente **56,6 KB**. SHA-256 do download conferiu com o manifesto publicado pelo serviço.
- O arquivo **baixado pela interface**, e não uma exportação alternativa, foi restaurado com `pg_restore --no-owner --no-privileges --exit-on-error --single-transaction` em uma base nova local, PostgreSQL 18.6, porta loopback 55433. Servidor de teste exigiu senha SCRAM; não foi usado trust para os dados reais restaurados.
- **14 tabelas / 186 registros:** contagens e fingerprints de todas as linhas correspondem à origem, incluindo histórico de migrations. Origem permaneceu idêntica entre a leitura anterior à geração e a leitura após o restore.
- Restrições conferidas entre origem/destino: **19 CHECK, 20 FK, 108 NOT NULL e 14 PK**, todas validadas. Índices e schema foram carregados pelo restore; esta contagem específica é de pg_constraint.
- Comparação de fingerprints usa ordenação C e sessão UTC nas duas bases. Uma divergência inicial apenas em timestamps com fuso de `_prisma_migrations` foi resolvida ao normalizar o fuso da conexão; nenhum dado foi corrigido ou regravado para obter igualdade.
- Pasta privada de backups com ACL Windows explícita para usuário atual, SYSTEM e Administradores; novas cópias herdam essa proteção. Cópia baixada e ambiente restaurado permanecem na pasta privada, fora do Git.
- PostgreSQL de teste encerrado após a validação. API normal permanece disponível; as tentativas antigas com falha continuam no histórico.

## Evidências e continuidade

Dados sensíveis e scripts auxiliares em `var/backups/backup-verification-20261023/`, ignorados pelo Git: configuração anterior, arquivo baixado, manifesto, fingerprints before/after/restore, resultado booleano da comparação, log de restore e data directory local. Não anexar essa pasta a relatórios públicos ou commits: contém dados reais, hashes de senha e configuração privada.

Print não sensível da aplicação em `backups-ready.jpg`. A tela afirma disponibilidade do arquivo; não foi alterada para apresentar um selo permanente de recuperação. A validação de restauração aqui registrada se refere especificamente à cópia testada.

### Retomada em outra máquina

Os caminhos dos executáveis são específicos desta instalação e ficam no `.env`, sem Git. Conferir a versão principal do servidor e instalar/configurar ferramentas compatíveis antes de iniciar a API. Ferramentas locais de QA 17.11 não substituem as 18.6 usadas aqui. As ferramentas existentes de migração continham inicialmente somente bin; recursos share/lib foram extraídos do arquivo local já existente para iniciar o servidor isolado 18.6.

Rever ACL com a conta de serviço real ao implantar. Confirmar `BACKUP_DIRECTORY` em volume persistente, ferramentas, conexão de exportação e prioridade da agenda salva em `schedule.json` sobre os padrões de ambiente. Não sobrescrever a configuração da empresa com os caminhos desta máquina.

## Limites e próximos passos

1. **Cópia externa não configurada.** Duas cópias no mesmo computador não protegem contra perda da máquina. Definir destino privado, acesso, responsável, rotina e evidência de envio/recuperação antes de afirmar proteção externa.
2. **Imagens não restauradas.** O dump inclui URLs/metadados, não os arquivos do Cloudinary. É necessário verificar a configuração da conta e testar recuperação de um asset de teste, separadamente e com escopo próprio.
3. Agenda semanal/mensal existente foi preservada. A geração manual passou; não foi forçada uma execução automática alterando relógio/agenda. O teste isolado do módulo executado na auditoria anterior cobriu agenda/retenção; próxima execução real ainda deve ser observada.
4. Não foi feita troca da aplicação para o banco restaurado, login na cópia com usuários reais ou ensaio completo de indisponibilidade da empresa. O restore comprovou schema/dados/restrições desta cópia; tempo total operacional de recuperação ainda não foi medido.
5. Nenhuma mudança foi enviada ao Git remoto nesta rodada. Os ajustes de formulários e protótipos de rodadas anteriores foram preservados.
