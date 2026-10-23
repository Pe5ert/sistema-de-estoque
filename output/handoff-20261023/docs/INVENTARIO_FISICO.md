# Inventário físico — V1

Implementado localmente em 07/10/2026 na branch `sistema-de-estoque-v2`, sobre `1308bb4`. Publicação autorizada pelo usuário em 08/10/2026. A funcionalidade atende empresas de qualquer setor.

## Como usar

1. Abra **Operação → Inventário físico → Novo inventário**.
2. Dê um nome à conferência e escolha todos os produtos ativos ou uma categoria. Organize a contagem para evitar entradas e saídas durante a conferência.
3. Informe a quantidade real na unidade de cada produto. **Zero é uma contagem; campo vazio é pendente.** Quantidades aceitam vírgula ou ponto e até três casas decimais. Observações são opcionais.
4. Clique em **Salvar contagem**. Isso salva o preenchimento, mas ainda não altera o estoque. É possível sair e continuar depois, inclusive por outro usuário.
5. Consulte o filtro **Com divergência** e confira as diferenças em relação ao saldo registrado na abertura.
6. Um **administrador ou gerente** escolhe **Concluir inventário** e confirma os ajustes. Cada diferença gera uma entrada ou saída de ajuste, com motivo **Ajuste de inventário**, quantidade, saldo anterior/final e responsável autenticado no histórico. Quantidade igual ao saldo não gera movimento. A confirmação explica se haverá ajustes ou apenas o encerramento da contagem.

Operadores podem abrir e preencher contagens; somente ADMIN/MANAGER podem concluir ou cancelar. Cancelar arquiva a contagem sem alterar saldos. Inventários encerrados são somente consulta e não podem ser reabertos nesta versão.

## Estoque alterado e contagens simultâneas

A conclusão é bloqueada quando um produto muda depois da abertura. A proteção compara saldo, unidade, situação, data da alteração e quantidade de movimentos; também detecta uma entrada seguida de uma saída que devolva o saldo ao valor original.

Use **Atualizar dados**, confira os produtos sinalizados e escolha **Atualizar saldos e recontar**. Essa ação atualiza a referência e limpa apenas as quantidades dos produtos alterados; suas observações e as contagens dos demais produtos permanecem. Os produtos alterados precisam de nova contagem. Se um produto ficou inativo, reative-o ou cancele a sessão e abra outra.

Se outra pessoa salvar ao mesmo tempo, o servidor recusa uma revisão desatualizada. A interface conserva o preenchimento local e mostra os valores salvos para comparação. **Manter meu preenchimento** exige confirmação e permite continuar editando; ainda é preciso salvar a contagem. **Usar valores salvos** descarta o rascunho após confirmação. Não há atualização em tempo real; use **Atualizar dados** para buscar o estado atual.

**Atualizar dados** mostra o estado de carregamento e confirma quando a consulta termina, inclusive quando não há alterações. Falhas são exibidas na tela, e o preenchimento ainda não salvo permanece preservado. Essa consulta não salva contagens nem modifica saldos.

## Limites e regras

- Até **500 produtos** por inventário; categorias ajudam a dividir catálogos maiores. Não há truncamento silencioso.
- O conjunto de produtos é fixado na abertura. Novos cadastros não entram automaticamente.
- Tabela com 25 produtos por página; salvamento em lotes de até 50, reduzidos quando observações longas exigem respeitar o limite de tamanho da API. Cada lote é atômico. Se um lote posterior falhar, os anteriores permanecem salvos e o restante do rascunho é preservado.
- Quantidades usam `Decimal(18,3)` no servidor e inteiros de milésimos na interface. Resumos contam produtos, sem somar unidades incompatíveis.
- Conclusão aplica todos os ajustes em uma transação. Uma falha não deixa ajustes parciais. Locks e revisão impedem sobrescritas e duplicação por confirmação simultânea; repetir uma conclusão retorna o resultado existente.
- Saldo não é editado por PATCH de produto. Movimentos são preservados; referência de auditoria `inventory:<id>`.
- Não há bloqueio prolongado das movimentações enquanto a contagem está aberta, múltiplos depósitos, agendamento ou importação de contagens nesta V1.

## API e persistência

Rotas autenticadas `/api/physical-inventories`:

| Método e rota | Finalidade |
| --- | --- |
| GET `/` | Lista paginada, filtro de situação |
| POST `/` | Abrir `{title, categoryId?}` |
| GET `/:id` | Contagens, saldos de referência/atuais e conflitos |
| PATCH `/:id/counts` | Salvar `{revision, items:[{productId, countedQuantity, notes?}]}`; quantidade string ou null |
| POST `/:id/refresh` | Atualizar referências alteradas `{revision}` |
| POST `/:id/complete` | Confirmar ajustes `{revision}`, ADMIN/MANAGER |
| POST `/:id/cancel` | Arquivar `{revision, notes?}`, ADMIN/MANAGER |

Novas tabelas `PhysicalInventory` e `PhysicalInventoryItem`, enum `PhysicalInventoryStatus`, FKs Restrict e CHECKs de quantidades/autor/situação. Nenhuma tabela operacional é apagada ou recriada pela migration.

## Implantação e retomada

A migration `20261007000000_physical_inventory` foi aplicada somente às bases PostgreSQL locais isoladas de QA nesta rodada. **Não foi aplicada ao Neon.** O `.env` real foi preservado, sem seed/reset ou fixtures no banco da empresa.

Antes de ativar em outra instalação: revisar a migration, gerar e verificar o backup completo e conferir a conexão autorizada. Na raiz:

```sh
pnpm --filter @stock/api db:deploy
pnpm build
```

Reiniciar API/web conforme o ambiente. Os dados de inventário fazem parte do backup completo do banco.

## Verificação

Testes PostgreSQL opt-in em `apps/api/src/physical-inventories/physical-inventories.postgres.spec.ts`, exclusivos de loopback e base `stock_physical_test`, via `TEST_PHYSICAL_DATABASE_URL`. Não usam `DATABASE_URL` como destino de escrita. Mantêm auditoria e desativam somente suas fixtures. Testes HTTP isolados validam sessão/RBAC/origem/payload; testes do modelo web verificam precisão, zero/vazio e formatação.

Evidências: `artifacts/physical-inventory-20261007/REVIEW.md`.
