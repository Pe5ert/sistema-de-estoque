# Clientes e saídas por venda — V1

Implementação de 23/10/2026. Cliente identifica o **comprador**; userId continua identificando o funcionário. Cada saída por venda corresponde a um produto, como no fluxo atual. Não há caixa, pagamento, nota fiscal ou pedido de venda multitem.

## Uso e permissões

Em Movimentações, localize o produto, informe quantidade e escolha **Saída → Venda**. Selecione **Identificar cliente** e busque por nome/código, ou marque explicitamente **Sem identificação**. O resumo mostra produto, quantidade, comprador e saldo previsto. Só Confirmar venda grava a saída.

Cadastrar cliente sem sair abre o cadastro mantendo produto, quantidade e motivo. Somente nome é obrigatório; código interno estável é gerado pelo servidor. Homônimos são permitidos e diferenciados pelo código. Não são coletados documentos, contatos ou endereço nesta versão.

Em Clientes, buscar/filtrar ativos e inativos, paginar e abrir **Saídas por venda**. Histórico filtrado usa UUID e permanece no reload; linhas/detalhes mostram nome e código usados na operação. Editar/inativar o cadastro não reescreve vendas anteriores.

ADMIN/MANAGER consultam, cadastram, editam e inativam. OPERATOR consulta e cadastra, inclusive durante a venda; não edita/inativa. Guards da API aplicam a mesma política. Não há exclusão física pela interface/API.

## Integridade

- Customer: UUID, código único automático, nome, active e timestamps; índice único trata colisões de código com retry limitado.
- StockMovement: FK opcional, identificação IDENTIFIED/ANONYMOUS e snapshots mínimos de nome/código, protegidos por CHECKs/FK Restrict.
- Comprador somente em EXIT/SALE. Identificado exige cliente ativo; anônimo exige ausência de cliente. API rejeita confirmação sem escolha explícita; campos de snapshot/autoria não são aceitos no DTO.
- Legado continua nulo e aparece como **Não registrado à época**. Migration não reclassifica vendas antigas nem altera saldo.
- Cliente validado com lock compartilhado na mesma transação do estoque; inativação usa lock exclusivo. Ordem de locks: cliente → produto. Produto, saldo/decimais, auditoria e rollback continuam no domínio existente.
- POST público de movimentação exige requestId UUID. Chave por usuário + hash canônico do payload, lock transacional e índice único impedem repetição: mesma chave/dados retorna o original; dados diferentes recebem 409. Entradas/saídas comuns usam esse mecanismo; compras/inventário preservam seus próprios mecanismos.
- UI conserva chave no retry, prepara outra ao iniciar outro item e impede reenviar dados alterados após falha de resultado incerto. Erros definitivos permitem correção; falha de conexão orienta verificar Histórico.
- Confirmações do cadastro ficam no mesmo drawer, sem disputa de foco entre modais. Submit e Enter do cadastro por portal não se propagam para a movimentação.

## Contratos e implantação

GET /customers aceita search, active=true|false|all, page e limit. GET /customers/:id consulta cadastro; POST aceita {name}; PATCH aceita {name?,active?}. Histórico de movimentos aceita customerId. DTOs rejeitam campos desconhecidos e inválidos.

Migration aditiva `20261023000000_customers_sales`, aplicada após backup e validação local. Publicar API/frontend/migration juntos: clientes antigos do POST precisam enviar requestId e, em venda, identificação explícita. Não executar migrate dev/reset/seed no banco compartilhado.

Evidências: `artifacts/customers-sales-20261023/REVIEW.md`. Fixtures e credenciais de QA ficam somente nos bancos loopback, nunca na base da empresa.
