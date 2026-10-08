# Inventário físico — revisão de implementação e uso

Data: 07/10/2026. Base: `sistema-de-estoque-v2`, `1308bb4`, após atualização fast-forward dos cinco commits remotos. Alterações permanecem locais; nenhum commit/push realizado, conforme pedido do usuário. Trabalho dividido entre agentes de backend, frontend e testes; integração, revisão e navegador pela raiz.

## Entrega

Contagem física persistida, lista e retomada de sessões, divergências exatas, notas, reconferência seletiva, confirmação atômica auditada e cancelamento. ADMIN/MANAGER concluem/cancelam; operadores contam. Até 500 produtos por inventário e 50 contagens por requisição. Interface inclui instruções de uso, confirmações e proteção de rascunho.

O fluxo conferido foi **tela → API autenticada → PostgreSQL isolado → resultado/histórico na tela**. Não houve fixtures, seed, reset, migration ou ajustes no Neon. `.env` real preservado. Prévia QA em `localhost:5175`, API 3211, PostgreSQL loopback 5549; configuração somente no ambiente dos processos. A migration nova foi aplicada às duas bases isoladas de testes; ativação no banco real continua pendente.

## Gates finais

| Verificação | Resultado |
| --- | --- |
| Node 22.23.3 / pnpm 11.24.0, instalação frozen-lockfile | PASS |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS após correção TS2783 no rascunho |
| `pnpm test` | PASS; suítes PostgreSQL opt-in não habilitadas neste comando geral |
| Suíte física HTTP isolada, 6 grupos | PASS |
| Suíte física PostgreSQL, 12 grupos reais | PASS |
| Modelo frontend, 4 grupos | PASS |
| `pnpm build` | PASS; avisos de anotação PURE de Zod e chunk JS acima de 500kB |
| `git diff --check` | PASS |

A suíte PostgreSQL física foi executada separadamente com `TEST_PHYSICAL_DATABASE_URL` em base loopback `stock_physical_test`. Comprovou precisão de milésimos e limite Decimal, zero/null, movimentos somente para diferenças, autor e saldos antes/depois, retry/dupla conclusão sem duplicação, revisão concorrente, rollback de lote e de conclusão após escritas reais, estoque alterado, ABA com timestamp igual, reconferência preservando observações, cancelamento/inativação, inventários sobrepostos e movimento concorrente. **500 produtos foram contados em dez lotes e 500 ajustes aplicados na conclusão, sem timeout.** Isso valida esta operação; não constitui teste de capacidade de todo o site em produção.

## Uso pelo navegador

| Caso | Evidência / resultado |
| --- | --- |
| Abrir módulo, criar contagem e validar nome obrigatório | PASS; erro inline e foco no nome |
| Quantidade negativa | PASS; erro inline, valores preservados e foco no campo |
| Digitar 13,25 no filtro Pendentes | PASS; linha mantém foco e permite terminar digitação |
| Informar 75 unidades e zero explícito | PASS; 3 contados, 0 pendentes e 2 divergências |
| Sair com rascunho | PASS; confirmação, Continuar mantém os valores |
| Salvar contagem | PASS; PostgreSQL manteve os saldos 12,500/80/0 e guardou 13,250/75/0 |
| Revisar confirmação e usar Escape | PASS; volta à contagem sem aplicar movimentos |
| Confirmar ajustes pela interface | PASS; duas linhas auditadas, uma positiva e uma negativa |
| Conferir histórico filtrado por Ajuste de inventário | PASS; Ajuste de entrada/saída, motivo e responsável corretos |
| Movimento posterior à abertura | PASS; item sinalizado e conclusão bloqueada |
| Atualizar saldos e recontar | PASS; apenas quantidade do item alterado limpa; outras quantidades e notas preservadas |
| Edição por outro operador | PASS; rascunho local preservado, revisão explícita exigida e valores do outro operador mantidos |
| Cancelar inventário com divergência | PASS; arquivado CANCELLED, zero movimentos de ajuste e saldos inalterados |
| Desktop 1440×900 / intermediária 1024×768 / mobile 390×844 | PASS; sem overflow horizontal, campos e ações acessíveis |
| Logs de erro/aviso do navegador | Nenhum na consulta final |

Auditoria da primeira conclusão: detergente 12,500→13,250, ajuste de entrada 0,750; luvas 80→75, ajuste de saída 5; pano 0→0 sem movimento. `ui-audit.json` registra a conferência direta do banco. `ui-cancel.json` comprova cancelamento e preservação dos saldos na segunda sessão.

## Correções encontradas na revisão

- Revalidar categoria/situação depois de aguardar locks na abertura.
- Timestamp dos ajustes no momento da escrita e atualização em lote no refresh de 500 itens.
- Filtros de pendentes/divergências usam contagens salvas, evitando remover campos durante digitação.
- Confirmação de refresh informa corretamente que observações são preservadas.
- Inventário encerrado por outro usuário exibe resultado salvo sem contaminar com rascunho local.
- Histórico distingue Ajuste de entrada/saída e preserva quantidade como string, sem arredondar via Number.
- Salvamento divide lotes também por tamanho (até 80kB), preservando 500 contagens com observações longas, caracteres multibyte e escapes sem exceder 100kB da API.

## Capturas e continuidade

- `desktop-contagem.png`, `intermediaria-contagem.png`, `mobile-contagem.png`: revisão das diferenças antes de confirmar.
- `desktop-concluido.png`: resultado da confirmação.
- `reconferencia.png`: estoque alterado exige nova contagem.
- `historico-ajustes.png`: movimentos gerados pelo inventário.

Leia `docs/INVENTARIO_FISICO.md` para manual, contratos e implantação. Retenção/backup completo existentes incluem as novas tabelas. Não há realtime, agendamento de inventário ou múltiplos depósitos nesta V1. Preservado o diretório anterior `artifacts/stress-20261002/`, fora do escopo.
