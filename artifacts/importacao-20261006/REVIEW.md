# QA — Importação V1 — 06/10/2026

## Ambiente e escopo

Frontend/API locais separados, portas 5174/3001. PostgreSQL oficial 17.11 temporário, restrito a loopback, banco gavyo_import_test. Migration aplicada nesse banco; nenhuma alteração no Neon/.env compartilhado. Conta e produtos fictícios. Nenhum aparelho leitor usado.

Objetivo operacional: trazer catálogo de planilha, resolver erros antes de gravar e obter um resultado confiável. Mantidos o shell, tokens, autenticação, componentes de formulário e layout global. A importação é uma ação do catálogo, sem nova sidebar.

## QA pela interface

| Caso | Evidência/resultado |
| --- | --- |
| Estado sem importações | Texto Nenhuma importação enviada ainda; enviar desabilitado sem arquivo |
| CSV inválido | SKU/barcode repetidos, categoria desconhecida e saldo negativo com linha/campo; confirmar desabilitado |
| Relatório de erros | CSV salvo pelo navegador, 579 bytes, contendo os 7 erros do lote fictício |
| Categorias novas | Criar nova categoria exige checkbox explícito antes de Validar e revisar |
| CSV válido | 10 produtos e 1 categoria criados; 10 entradas INITIAL_STOCK |
| XLSX válido | 1 produto criado; SKU 000123 preservado; entrada inicial de 1.25 |
| Decimais/códigos | Custo R$ 19,90, saldo 3.125 e barcode 0001234567890123456780 conferidos no drawer |
| Reload | Resultado COMPLETED continua acessível pelo UUID da operação |
| Teclado | Validar via Enter; fechar drawer via Escape com restauração de foco |
| Loading | Lendo/Validando/Importando e controles desabilitados durante a solicitação |
| Histórico | Motivo Estoque inicial, autor QA Importação, 0→saldo, UUID de referência e observação de importação |
| Dashboard | Catálogo/entradas/atividade refletiram os 11 produtos do QA de tela, além das fixtures dos testes reais |
| Modelos | XLSX e CSV baixados pelo navegador. Houve recusa acidental de permissão; usuário corrigiu e ambos foram baixados na nova tentativa |
| Responsividade | 1440×900, 1024×768, 390×844; sem overflow horizontal no documento, campos em uma coluna no mobile |

## Problemas encontrados e corrigidos

- P2: atualizar o preview podia apagar mapeamento ainda não salvo. Reprodução: alterar uma coluna → Atualizar preview. Correção: hidratar os campos apenas quando UUID/revisão do servidor mudam.
- P2: remover e recolocar a mesma coluna mantinha um falso estado alterado por causa da ordem das chaves JSON. Correção: comparar cada campo do contrato, independentemente da ordem.
- P3: nome e SKU apareciam separados na linha mobile. Correção: agrupados em um único conteúdo para a célula responsiva.
- P3: unidade do preview aparecia como enum técnico. Correção: reutilizar os códigos de unidade da interface existente.
- P2 fora da importação: a suíte completa reproduziu EPERM ao substituir metadata de backup no Windows. Correção mínima: retry limitado a cinco novas tentativas em erros transitórios de rename no Windows, mantendo o arquivo anterior. Teste provoca a falha e comprova a substituição atômica; nenhum diagnóstico temporário ficou no código.

## Testes e limites

Testes reais incluem transação/rollback com produtos, categorias e movimentos, concorrência e constraints. Testes locais incluem entradas inválidas, zeros/códigos longos, fórmulas, categorias e limites de arquivo. Gates finais passaram: lint, typecheck, test, build e diff --check. Foram 60 testes API e 5 testes web aprovados, zero falhas; o teste real de backup e a suíte real de estoque anterior não foram ativados nesta rodada. Os testes reais desta importação foram executados.

Build mantém avisos não impeditivos sobre anotações internas do Zod e chunk web acima de 500 kB; ExcelJS/parser ZIP ficam apenas no backend. A importação não adiciona essas bibliotecas ao bundle web.

A confirmação repetida foi comprovada em serviço/PostgreSQL/HTTP simultâneo. No browser, conferidos bloqueio do botão e resultado persistido; não se afirma repetição de cliques no botão já removido após sucesso. O modelo baixado exige preencher produtos antes de reenviar: um modelo só com cabeçalho é corretamente rejeitado.

Antes da integração: alinhar permission action, contrato shared e migration com RBAC. Migration do ambiente compartilhado continua pendente; não foi simulado hardware USB.

## Evidências

- preview-desktop.png / preview-tablet.png / preview-mobile.png: revisão com categoria autorizada.
- erros-desktop.png / erros-mobile.png: revisão final bloqueada por erros, com unidade e agrupamento mobile corrigidos.
- resultado-desktop.png / resultado-mobile.png: resultado CSV persistido.
- produto-importado.png: código textual e saldo no catálogo.
- historico-importado.png: auditoria com referência ao lote.
- dashboard-apos-importacao.png: posição/atividade após a importação.
