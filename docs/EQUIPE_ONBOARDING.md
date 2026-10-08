# Entrada de desenvolvedor e agente na equipe

Preparado em 06/10/2026. Base conferida: `f6b486c`, branch `sistema-de-estoque-v2`. Este guia cobre o início do trabalho; leia também o código e as instruções do repositório antes de cada tarefa.

## 1. Projeto e estado atual

Repositório: https://github.com/Pe5ert/sistema-de-estoque.git. A V2 é uma reimplementação do sistema de estoque. `master` conserva o PHP/MySQL legado como referência; não misturar arquivos do legado com a V2. A checkout do autor está em `C:\Users\Office Estagio 3\Documents\Workspace\sistema-de-estoque-v2`; no seu notebook escolha sua própria pasta.

Aplicação operacional em português: login, Dashboard/Visão geral, Produtos, categorias, cadastro/edição, Movimentações, Histórico e Administração → Backups. O catálogo consulta API e PostgreSQL; não há fallback de demonstração em memória. Os mocks de QA pertencem aos testes.

Últimos commits relevantes:

- `c0a7344`: fila de reposição e foco mobile.
- `c966316`: fluxo de leitura por código e preparação da próxima operação.
- `1f1e4c9`: backups completos e guia de restauração.
- `f6b486c`: responsabilidade da empresa por seus backups.

Em 06/10 os dois commits de backups foram puxados sem conflito; código e remoto estavam sincronizados. Esta atualização não foi seguida de nova execução da suíte por este agente. Os resultados dos autores estão em `artifacts/backups-20261005/REVIEW.md`; trate-os como evidência daquela rodada, não como teste executado no seu notebook.

Na rodada de códigos, em 05/10, lint/typecheck/build e 35 testes existentes passaram; consultas autenticadas ao Neon funcionaram. Escritas e erros do fluxo foram testados com servidor fictício isolado. Aparelho físico de código de barras ainda não foi testado. Testes reais de concorrência de estoque e restauração exigem bases separadas.

Há textos históricos em README, AGENTS e documentos de 02/10 falando de demo, banco indisponível, drawers não modais ou integração pendente. Essas descrições foram superadas parcialmente: confira datas, documentos específicos recentes e código atual. No notebook de origem, a conexão Neon foi salva no `.env` local em 05/10; o trecho antigo que diz conexão apenas no processo descreve a rodada de 02/10. Configuração privada não viaja pelo Git.

Pendências que não são autorização para implementar: upload/storage de imagens, sincronização entre usuários, matriz completa de permissões, implantação distribuída e validação com scanner físico. Alinhe a tarefa antes de expandir o escopo.

## 2. Stack e mapa

| Parte | Tecnologia/responsabilidade |
| --- | --- |
| `apps/web` | React 19, TypeScript strict, Vite 7, Tailwind 4, Router, TanStack Query, RHF, Zod |
| `apps/api` | NestJS REST, Prisma 7, PostgreSQL, DTOs, autenticação e inventário |
| `packages/shared` | Contratos/enums sem Nest ou Prisma Client |
| `apps/api/prisma` | Schema, migrations, preflight somente leitura, seed DEV |
| `docs` | Regras, contratos, retomada e decisões de produto |
| `artifacts` | Evidências históricas de QA; scripts podem exigir adaptação local |
| `var/backups` | Dados privados/agenda de backup; ignorados pelo Git |

Arquivos centrais: `App.tsx` (rotas/shell/painel), `Products.tsx` (catálogo/detalhe), `ProductForm.tsx` (cadastro/edição), `MovementWorkbench.tsx` (códigos/movimento), `Backups.tsx`, `inventory-api.ts` (queries/invalidação), `product-form-model.ts` (parsing/validação), `styles.css` (tokens/componentes). Backend: `src/auth`, `src/inventory`, `src/backups`, `src/config/env.ts`. Não editar `src/generated/prisma` manualmente.

## 3. Primeira instalação no Windows

Instale Git, Node **22.x >=22.13 e <23** e pnpm **11.24.0**. Use o lockfile existente. Node 24 passou em alguns comandos antigos, mas está fora da faixa declarada; use 22 para evitar resultados divergentes. Se pnpm não estiver disponível, instale a versão fixada com o gerenciador oficial:

```powershell
npm install --global pnpm@11.24.0
node --version
pnpm --version
git clone --branch sistema-de-estoque-v2 --single-branch https://github.com/Pe5ert/sistema-de-estoque.git sistema-de-estoque-v2
Set-Location sistema-de-estoque-v2
git status --short
pnpm install --frozen-lockfile
```

Precisa ter acesso autorizado ao repositório. Não copie `node_modules` de outra máquina. Docker não é necessário para acessar o Neon já existente.

Para uma checkout existente, primeiro confirme raiz/branch e mudanças. Só troque de branch se as alterações locais estiverem protegidas:

```powershell
git rev-parse --show-toplevel
git branch --show-current
git status --short
git fetch origin
git pull --ff-only origin sistema-de-estoque-v2
pnpm install --frozen-lockfile
```

`--ff-only` pode recusar divergência; isso exige revisar os commits, não executar reset. Não rode pull sobre mudanças não protegidas. Preserve `.env` existente.

## 4. Ambiente, login e inicialização

O responsável disponibiliza a configuração por arquivo privado. O pacote interno desta entrega contém `.env.equipe`, com a conexão compartilhada autorizada, JWT novo para o notebook e backups automáticos desativados. Transfira-o fora do Git. Na raiz de uma clone nova, copie-o para `.env` somente se esse arquivo ainda não existir:

```powershell
if (-not (Test-Path -LiteralPath '.env')) {
  Copy-Item -LiteralPath 'C:\CAMINHO\DO\PACOTE\.env.equipe' -Destination '.env'
}
```

Sem o pacote, copie `.env.example` e peça a conexão ao responsável; nunca presuma que a senha do exemplo é a senha atual. Valores obrigatórios:

| Chave | Configuração local |
| --- | --- |
| DATABASE_URL | Conexão PostgreSQL autorizada, com SSL do provedor |
| JWT_SECRET | Segredo local aleatório de pelo menos 32 caracteres |
| WEB_ORIGIN | `http://localhost:5173`, sem barra final |
| VITE_API_URL | `http://localhost:3000/api` |
| API_PORT | `3000` |
| NODE_ENV | `development` |
| BACKUP_AUTO_ENABLED | `false` no notebook inicial |

Conta do aplicativo e usuário PostgreSQL são coisas distintas. Login interno conhecido está no arquivo privado LEIA-ME; foi validado em 05/10 e pode ser alterado pela equipe depois. Senhas da aplicação são hashes Argon2id; não existe uma senha legível no painel Neon. Não rode seed para corrigir login: o seed pode atualizar o hash do administrador e alterar dados compartilhados.

Inicie sem reset, seed ou migrations automáticas:

```powershell
pnpm db:generate
pnpm --filter @stock/shared build
pnpm dev
```

Abra `http://localhost:5173/login`. Health: `http://localhost:3000/api/health`; Swagger: `http://localhost:3000/api/docs`. Para conferir apenas a disponibilidade:

```powershell
Invoke-RestMethod -Uri 'http://localhost:3000/api/health'
```

Esperado: HTTP 200, `status: ok`, `database: up`. Isso comprova conexão; não comprova login ou persistência. Teste login e telas separadamente. `pnpm dev:web` inicia só o Vite; não substitui a API. Pare o processo com Ctrl+C. Mudou `.env`? Reinicie API e Vite. O build de shared é necessário numa clone nova: a API importa `dist/index.js`, que não vem pelo Git. Ao alterar os contratos de shared durante desenvolvimento, recompile esse pacote e confira a API.

Migrations do banco compartilhado já foram aplicadas nas rodadas anteriores. Para verificar o estado sem aplicar mudanças: `pnpm --filter @stock/api exec prisma migrate status`. Se houver migration nova, revise SQL/preflight, combine com a equipe e só então execute `pnpm --filter @stock/api db:deploy`. Autoria de migration usa banco de desenvolvimento isolado. Nunca aceitar reset de `migrate dev` como solução de erro.

## 5. Regras de domínio que não podem quebrar

- Saldo é materializado. Não editar `Product.stock` por PATCH, SQL avulso ou frontend. Toda alteração deve criar StockMovement dentro da transação, com lock por produto, autor autenticado e saldos antes/depois.
- Não permitir saldo negativo, quantidade zero/negativa ou produto inativo movimentado. Cadastro nasce com zero; entrada inicial opcional pertence à mesma transação do produto.
- Não excluir/editar movimentações para desfazer estoque: conservar a auditoria. Discutir correção operacional com o responsável.
- Valores Decimal trafegam como strings com ponto. Até 2 casas para preço e 3 para quantidade/saldo/mínimo. Usar Decimal no domínio; não trocar por float para gravar. Preço desconhecido é null, não zero inventado.
- SKU é único sem distinguir maiúsculas/minúsculas; barcode é texto opcional único, preserva zeros. Um SKU de um produto pode coincidir com barcode de outro; consulta exige escolha explícita nesses casos.
- Autor vem da sessão; não confiar em `userId` enviado pelo cliente. Campos desconhecidos são rejeitados pelo DTO.
- Produtos/categorias são desativados; preservar relações e histórico. Não criar exclusão física por conveniência.
- Queries devem ser invalidadas após sucesso para catálogo, detalhe, histórico e painel. Não criar arrays de exemplo para esconder falhas da API.

## 6. Autenticação e permissões

JWT de 8 horas em cookie HttpOnly, SameSite=Lax; `/auth/me` é fonte da sessão. Produção exige HTTPS/Secure e configuração apropriada de mesmo site/proxy. Não transportar token/senha para localStorage. Não remover guards, rate limit ou proteção de Origin para fazer funcionar localmente.

WEB_ORIGIN exato protege CORS e escritas, incluindo login. Chamadas CLI de escrita precisam desse Origin. Usuário autenticado é necessário nas rotas operacionais; Backups exige ADMIN no frontend e backend. A matriz fina de papéis de outras áreas ainda é pendência: não presumir restrições que o código não implementa, nem ampliar permissões silenciosamente.

## 7. UI e leitura de códigos

Preservar grafite/cobalto, tabelas densas, painel assimétrico e tokens de `styles.css`. Não redesenhar páginas por efeito colateral de um bug. Reutilizar Fields/QuantityInput/estados existentes. Erros conservam valores e focam o primeiro campo inválido; loading e disabled precisam ser claros.

Drawers são modais em desktop/mobile: foco contido, fundo inert, Escape/Fechar e restauração de foco. Cadastro/edição protegem rascunho em navegação/reload. Imagem persiste por URL/null; arquivo local não é upload real. Testar fallback de imagem.

Movimentações: código + Enter consulta, não registra. Mantém foco no código readonly após identificar; Tab/clique vai para quantidade. Escolher quantidade/tipo/motivo, conferir prévia e confirmar. Sucesso limpa para próxima leitura, quantidade 1, mantém tipo, conserva último resultado até nova leitura. Erro mantém preenchimento. Próximo produto descarta a preparação atual. Não converter scanner em envio automático ou carrinho sem tarefa específica. Leitor físico digita no campo com foco: não bipar enquanto editando Quantidade. Ainda falta validar hardware/sufixo Enter.

## 8. Backups e restauração

Cada empresa administra os backups da própria instalação. ADMIN gera, baixa e agenda. Restauração é tarefa do administrador do banco da empresa, fora da UI. Não restaurar sobre o Neon compartilhado para testar.

Ferramentas `pg_dump`/`pg_restore` precisam ser compatíveis com o servidor (Neon registrado nesta rodada: PostgreSQL 18). Não são pacotes npm. Instale ferramentas oficiais e ajuste BACKUP_PG_DUMP_PATH/BACKUP_PG_RESTORE_PATH ou PATH; caminhos do outro notebook não são portáveis.

Padrão da aplicação: mensal, primeiro dia às 02:00 America/Fortaleza, retenção 365 dias. A API checa a agenda inclusive ao iniciar e pode gerar uma cópia pendente. Por isso a configuração do colega começa com automático false. `schedule.json` salvo tem prioridade sobre env: se reutilizar uma pasta que já tem agenda, conferir também esse arquivo/tela. Não copiar pasta de backup de outra máquina como parte de instalação rotineira.

BACKUP_DIRECTORY deve ser privado e persistente; default `../../var/backups` relativo à API. Conexão para dump usa BACKUP_DATABASE_URL, depois DIRECT_URL, depois DATABASE_URL; direta/unpooled é preferida no Neon. Configurar com o responsável, não deduzir URL nova. Backup contém dados completos e hashes de usuários; não versionar dump/manifestos, expor por pasta pública ou colocar credenciais em logs.

Não habilitar o mesmo agendamento em vários notebooks por acidente. A trava é de filesystem local, não coordenação entre servidores com pastas independentes. Restaure primeiro em banco novo/isolado; compare schema, auditoria, Decimal, constraints e dados antes de planejar a troca. Backup lógico não inclui .env, JWT, roles globais ou arquivos externos de imagens. Leia `docs/BACKUPS.md` por completo antes de mexer nessa área.

## 9. Trabalho em equipe e Git

Antes de começar: fetch/status, alinhar tarefa e quais arquivos estão sendo mexidos. Recomendação para trabalho paralelo: branch própria a partir da V2 atualizada, por exemplo `git switch -c feat/nome-da-tarefa`; nome ilustrativo, combine o padrão com a equipe. PR para `sistema-de-estoque-v2` permite revisão. Só publicar/mesclar onde o responsável autorizou; uma tarefa de código não é autorização automática para deploy ou alterar dados.

Faça mudanças pequenas, revise o diff e mantenha dependências/lockfile. Não usar `reset --hard`, `clean`, force push ou descarte do trabalho de colega para facilitar integração. Divergência ou conflito: leia os dois lados, preserve o comportamento necessário, valide novamente; não aceite um lado inteiro sem entender.

Antes de enviar, use git add com caminhos específicos, confira `git diff --cached` e segredos. Commit descreve problema e resultado. Para pull/push autorizado na V2: atualizar sem força e conferir sincronização depois. Não enviar `.env`, pacote interno, senhas, dumps ou runtime gerado.

### Protocolo de commits para todos os desenvolvedores e agentes

**Um commit deve conter uma mudança coerente, de autoria identificada e validada.** Não misturar correção de bug, redesign, atualização de dependências e trabalho pendente de outro colega no mesmo commit. Não criar commits automáticos apenas porque a edição terminou; seguir a autorização da tarefa. Não publicar um commit que o agente ainda não revisou.

1. **Conferir antes de trabalhar:** raiz, branch, status, arquivos já staged e commits recentes. Se houver merge/rebase/cherry-pick em andamento, entender e concluir ou combinar a interrupção antes de iniciar outra tarefa. Alterações existentes não pertencem automaticamente ao agente.
2. **Atualizar a base antes da tarefa:** com árvore limpa e na V2, fetch e pull com `--ff-only`. Depois criar a branch da tarefa com nome combinado. Não trabalhar em `master` nem fazer vários agentes alterarem a mesma checkout ao mesmo tempo. Para tarefas paralelas, cada desenvolvedor/agente deve ter branch e checkout/worktree próprios; combinar mudanças nos mesmos arquivos.
3. **Validar a mudança:** executar os checks da seção 10 e revisar o diff. Mudança documental exige revisão/diff; não exige recompilar o sistema. Não registrar testes não executados como PASS.
4. **Selecionar somente os arquivos da tarefa:** evitar `git add .` e `git add -A`. Examinar também arquivos novos; `git diff` sozinho não os mostra. Se um arquivo contém mudanças de outra tarefa, separar os trechos com cuidado (`git add -p`) ou alinhar a autoria antes de commitar. Se já houver arquivos staged de colega, não incluir nem retirar silenciosamente.
5. **Revisar o que realmente vai entrar:** `git diff --cached --name-status`, `git diff --cached`, `git diff --cached --check`. Verificar que não há segredos, dumps, arquivos gerados, credenciais de fixtures, mudanças de ambiente, alterações acidentais do lockfile ou marcadores de conflito. Conferir `.env` ignorado com `git check-ignore .env`. O diff staged deve corresponder exatamente à tarefa.
6. **Criar commit legível:** `feat: ...` para funcionalidade, `fix: ...` para correção e `docs: ...` para documentação. Usar mensagem concreta, por exemplo `fix: manter quantidade apos erro de movimentacao`. Não usar apenas `update`, `ajustes` ou `final`. Depois conferir `git show --stat HEAD` e `git status --short`; nunca afirmar que ficou limpo sem conferir.
7. **Reconsultar o remoto antes de publicar:** colegas podem ter enviado código durante a tarefa. Fazer fetch novamente, integrar a V2 na branch da tarefa e validar o resultado da integração. Preferir PR para V2. Push na branch compartilhada só quando explicitamente autorizado.
8. **Confirmar o envio:** checar saída e código de retorno do push. Commit local não significa push feito; push não significa deploy. Informar hash, branch, arquivos e validações. Alterações pendentes de outra autoria podem continuar locais e devem ser relatadas, não apagadas para deixar o status limpo.

Exemplo de seleção e revisão; os caminhos são ilustrativos e devem ser substituídos pelos arquivos reais da tarefa:

```powershell
git status --short
git diff
git add -- apps/web/src/MovementWorkbench.tsx docs/frontend/BARCODE_WORKFLOW.md
git diff --cached --name-status
git diff --cached
git diff --cached --check
# Somente depois de revisar e validar:
git commit -m "fix: manter quantidade apos erro de movimentacao"
git show --stat HEAD
git status --short
```

Para integrar atualizações na **branch da tarefa**, após preservar/commitar o trabalho autorizado e deixar a árvore limpa:

```powershell
git fetch origin
git log --oneline HEAD..origin/sistema-de-estoque-v2
git merge origin/sistema-de-estoque-v2
# Se houver conflito, resolver e validar antes de enviar.
# Se a integração modificar código, repetir os checks relevantes.
```

O merge acima é na branch da tarefa, não uma autorização para mesclar um PR na V2. Não executar os comandos seguintes se o anterior falhou. **Push rejeitado por non-fast-forward não é motivo para force push:** fetch, revisar commits locais/remotos, integrar e testar novamente. Na V2 compartilhada, `--ff-only` recusado significa divergência que precisa ser tratada; não ignorar nem resetar para contornar.

### Quando houver conflito

- Ler a tarefa e os dois lados do arquivo, inclusive chamadas/contratos/testes relacionados. Não resolver tudo com `--ours`/`--theirs` ou escolher a versão mais recente pela data.
- Preservar a intenção das duas alterações quando compatíveis. Se forem incompatíveis, explicar o conflito concreto ao responsável e pedir a decisão necessária; continuar somente no trabalho independente.
- Remover os marcadores do conflito, revisar `git diff` e `git diff --cached --check`, adicionar apenas os arquivos resolvidos e concluir o merge conforme `git status`. Depois testar o comportamento combinado. Um merge sem conflito de texto também pode quebrar regras do sistema.
- Não fazer rebase/amend de commits já publicados na branch compartilhada, não usar `push --force`/`--force-with-lease`, não apagar branches de colegas nem descartar mudanças para facilitar o merge. Alterar histórico publicado exige uma tarefa explícita e coordenação específica da equipe.
- Se precisar voltar atrás numa mudança publicada, propor um novo commit de reversão (`git revert`) após revisar dependências e obter autorização para a reversão. Não usar reset do histórico remoto como atalho.

## 10. Validação e entrega

Para mudanças de implementação:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Prisma Client gerado não significa banco migrado. Testes locais sem PostgreSQL não provam persistência/concorrência. SKIP não é PASS de integração real. `TEST_DATABASE_URL` deve ser banco de teste separado. Testes reais de backup/restauração exigem duas bases loopback próprias, nomes terminando `_backup_test` e `_backup_restore_test`; recriam schema, nunca apontar para DATABASE_URL/Neon. Leia o spec antes de rodar.

Para UI, conferir desktop 1440×900, intermediário 1024 e mobile390: overflow, foco, Tab/Shift+Tab, Enter, Escape, radios/setas, loading, erro, vazio, imagem, rascunho e operação alterada. Teste duplo clique/envio e resposta atrasada quando relevante. Writes de QA só em fixture ou base isolada autorizada; não mexer no saldo de produtos compartilhados como teste. Capturar evidência e registrar o ambiente utilizado.

Entrega informa: mudança e motivo, arquivos, comandos e resultados, QA real versus fixture, limites e próximos passos. Não alegar funcionamento só porque compilou. Não repetir suíte sem motivo após passar; novas mudanças/falhas exigem validação apropriada.

## 11. Diagnóstico rápido

| Sintoma | Verificar primeiro |
| --- | --- |
| Página não abre | Processo Vite, porta5173, erro do terminal |
| Sessão não pode ser verificada | API3000, VITE_API_URL, health, conexão/SSL |
| Senha não funciona | Conta da aplicação, senha atual, ativo, limite de tentativas; não seed/reset |
| Escrita403 | Origin exato, cookie, papel autorizado; não afrouxar guard |
| Sem atualização após salvar | Erro POST, invalidação/query keys, API authoritative |
| Prisma ausente | `pnpm db:generate`, ambiente obrigatório; não editar gerado |
| Import de @stock/shared/dist falha | `pnpm --filter @stock/shared build`; recompilar após alterar shared |
| API cai durante typecheck/build | Geração do Prisma pode disparar tsx watch; ao terminar, reiniciar `pnpm dev` |
| Backup falha | Ferramentas/versão, caminho, permissão, conexão direta, logs sem segredos |
| Alterar env não surte efeito | Reiniciar processos; conferir agenda persistida para backups |

## 12. Prompt inicial para o agente do colega

Copie este bloco como primeira orientação e acrescente a tarefa concreta:

> Regra de commits: siga integralmente o protocolo da seção 9. Antes de editar, identifique branch, mudanças locais e staged de terceiros. Trabalhe em branch/checkout próprios para tarefas paralelas. Use git add com caminhos/trechos específicos e revise o diff staged antes do commit. Um commit por mudança coerente, mensagem concreta e checks apropriados. Atualize o remoto antes do push, integre mudanças dos colegas e valide o resultado combinado. Não sobrescreva alterações, não resolva conflitos em massa escolhendo um lado e não force push. Se um comando Git falhar, pare a sequência dependente e trate o erro. Não reescreva commits publicados. Ao entregar, informe hash/branch, resultado real do push, validações e mudanças locais restantes; não confunda commit, push, merge e deploy.

> Você está colaborando no Sistema de Estoque V2. Confirme cwd, raiz Git, branch, status e commits antes de agir. Leia AGENTS.md, docs/EQUIPE_ONBOARDING.md, docs/RETOMADA.md, docs/PROJECT_STATUS.md e os documentos da área da tarefa. Há trechos históricos superados: reconcilie datas com código e evidências; não presuma que demo ou pendências antigas descrevem o estado atual. Preserve alterações locais e trabalho de colegas. Explique brevemente o fluxo e a mudança proposta; faça o menor ajuste que resolve a tarefa e valide. Não redesenhe, troque dependências ou amplie escopo sem necessidade. Configuração privada fica em .env ignorado; não imprimir credenciais/tokens, commitar o pacote interno ou transmitir segredos a terceiros. Acesso à base compartilhada não autoriza reset, seed, migrations não revisadas, SQL corretivo, restauração, exclusão ou movimentos de teste. Use fixtures/base isolada para writes de QA. Estoque só muda pela transação de StockMovement; preserve Decimal, locks, autoria e auditoria. Preserve auth/cookies/Origin/guards. Consulte docs/BACKUPS.md antes de backups e mantenha agenda desativada no notebook inicial. Execute lint/typecheck/test/build/diff conforme a mudança e QA de UI nas larguras documentadas. Distinga teste local, fixture e banco real; relate SKIP e limitações. Faça commits/push/merge/deploy somente conforme autorização da equipe, sem força. Se faltar informação essencial, pergunte enquanto avança no que for independente. Ao final, entregue mudança, motivo, validações e riscos concretos. Não atualize memórias pessoais nem execute automações de negócio sem instrução.

Leituras específicas: `docs/OPERATIONAL_INTEGRATION.md`, `docs/frontend/DESIGN.md`, `docs/frontend/UI_INTERACTION_REVIEW.md`, `docs/frontend/BARCODE_WORKFLOW.md`, `docs/BACKUPS.md`. Segredos e acesso atual pertencem ao pacote privado, não a este documento versionável.
