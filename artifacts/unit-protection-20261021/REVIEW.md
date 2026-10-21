# Proteção de unidade — 21/10/2026

Escopo autorizado: primeira rodada INT-01 da auditoria. Impedir reinterpretação de saldo/histórico ao mudar unidade. Não implementados backups, criação idempotente de pedidos ou redesenho de telas nesta rodada.

## Mudança

- API: PATCH bloqueia unidade diferente se existir qualquer movimento ou saldo diferente de zero. Verificação dentro da transação após FOR UPDATE do produto, antes de qualquer alteração de cadastro/imagem. Recusa HTTP 409, sem escrita parcial.
- Reenviar a mesma unidade é permitido: nome, preços, mínimo e demais campos continuam editáveis.
- Produto sem saldo e sem movimento pode trocar unidade; entrada inicial conta como movimentação. Voltar o saldo a zero não libera troca.
- GET de detalhe fornece `unitLocked`, calculado pelo saldo e contagem de movimentos. Metadado opcional no contrato compartilhado, não persistido; API de escrita não depende da informação enviada pelo navegador.
- Formulário desabilita unidade e explica como cadastrar item com outra unidade. Mantém a unidade registrada no envio normal do formulário. Erro concorrente da API é identificado no campo, mantendo preenchimento.
- Preservados lock por produto, Decimal, auditoria, permissões, layout/2 px e demais operações. Sem dependência, alteração de schema ou migration nova.

## Arquivos

- apps/api/src/inventory/inventory.service.ts: regra transacional e detalhe.
- apps/api/src/inventory/postgres.spec.ts: regressões reais por HTTP/PostgreSQL.
- packages/shared/src/index.ts: metadado opcional de detalhe.
- apps/web/src/ProductForm.tsx: bloqueio, orientação e erro por campo.
- apps/web/src/lib/api.ts: mensagem específica permitida, sem expor diagnóstico bruto.
- docs/frontend/DESIGN.md: regra para manter nas próximas mudanças.

## Testes executados

| Verificação | Resultado |
|---|---|
| pnpm typecheck | Aprovado |
| pnpm lint | Aprovado |
| pnpm build | Aprovado; avisos existentes de bundle grande e anotações Zod |
| pnpm test com TEST_DATABASE_URL isolada | 91 testes API aprovados, 3 integrações opt-in sem configuração ignoradas; 29 frontend aprovados |
| Compras/recebimentos + inventário PostgreSQL, execução separada | 20 testes aprovados, zero ignorados/falhas |
| git diff --check | Aprovado |

Os 91 testes da API incluem 9 de estoque em PostgreSQL real (7 existentes + 2 novos). O resumo do executor registra 3 testes ignorados (backup/restore, imagens e importação), além das suítes de compras e inventário físico desativadas nessa execução. Compras/inventário foram executados separadamente com 20 testes aprovados. Importação e imagens PostgreSQL, backup/restore e homologação do cliente não foram repetidos nesta rodada.

### Casos novos comprovados

1. Produto virgem KG, sem movimentos/saldo → BOX permitido.
2. Entrada de 10 BOX → tentativa de trocar para KG e alterar nome na mesma chamada recebe 409; nome e movimento original preservados.
3. Mesma unidade BOX com alteração de nome → 200.
4. Saída das 10 BOX deixa saldo zero → troca continua recusada; GET informa unitLocked=true, histórico continua BOX com quantidade 10.
5. Produto com entrada inicial → unidade protegida.
6. Concorrência real com primeira entrada: conexão separada segura a linha; pg_stat_activity comprova duas solicitações esperando FOR UPDATE. Entrada enfileirada primeiro faz a troca posterior retornar 409. Troca enfileirada primeiro pode concluir antes da primeira entrada; esta passa a ocorrer na nova unidade, que fica então bloqueada. Uma única entrada e saldo 1 em ambos os casos.
7. Suítes relacionadas preservam recebimentos parciais, revisão, idempotência, rollback, contagem, reconferência e ajustes atômicos existentes. Não foi adicionada conversão nem alterada a regra de snapshots dos pedidos/inventários.

## Ambientes e dados

Somente bases locais loopback em 127.0.0.1:55432 para escrita: `gavyo_unit_stock_test` (nova), `gavyo_unit_purchases_test` (nova) e `stock_physical_test` (isolada existente). Migrations existentes aplicadas somente nessas bases. Não houve seed/reset, migration ou gravação comercial no Neon. Testes preservam auditoria e inativam suas próprias fixtures.

Configurações reais e .env preservados. Logs detalhados privados em var/backups/unit-*.log, ignorados pelo Git. Banco, fotos e credenciais não são incluídos nesta pasta.

## Navegador no servidor normal

Frontend localhost:5173 e API normal com código atualizado. Somente consulta, navegação e foco, sem salvar produto existente.

- Cabo USB-C com saldo 24: unidade bloqueada e orientação visível.
- Caixa organizadora M com saldo 0 e histórico: unidade bloqueada.
- Novo produto: unidade habilitada.
- 1440×900, 1024×768 e 390×844: sem overflow horizontal nos estados conferidos; orientação legível.
- Tab a partir da Categoria pula a unidade bloqueada e segue para Código de barras.
- Capturas: unidade-bloqueada-1440.jpg, unidade-bloqueada-1024.jpg, unidade-bloqueada-390.jpg e saldo-zero-com-historico.jpg. A captura mobile foi refeita após a transição responsiva, com sidebar oculta.

## Limites

A proteção evita novas trocas indevidas pela API; não corrige retroativamente produtos que já tenham sido reinterpretados antes dela. Não há conversão automática. `unitLocked` é informativo: uma tela desatualizada pode permitir tentar a troca, mas a API revalida sob lock e recusa se uma movimentação tiver ocorrido.

Edição/cadastro via navegador com gravação de dados não foram repetidos nesta rodada; gravação e preservação foram verificadas por HTTP em PostgreSQL isolado. Leitor de tela real, hardware e todos os temas/perfis não foram homologados aqui.
