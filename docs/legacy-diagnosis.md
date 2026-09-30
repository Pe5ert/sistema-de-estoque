# Diagnóstico do legado (Fase 1)

Referência: PHP/MySQL da branch principal e do commit inicial da branch `sistema-de-estoque-v2`.

## Preservar como regras funcionais

- Login de usuários ativos com senha em hash; papéis administrativos e operacionais; CSRF nas mutações.
- Cadastro de produtos com custo, preço e saldo; registro de entradas e saídas; bloqueio de saída acima do saldo disponível.
- Consulta de histórico, relatórios por período, alertas de estoque e importação em lote com prévia.

## Corrigir na V2

- `produtos/editar.php` altera `qtd` sem movimento. `movimentos/cadastrar.php` grava movimento e saldo sem transação ou trava: falhas e requisições concorrentes podem divergir os dados.
- `movimentos/excluir.php` reverte o saldo e apaga o registro; o FK legado usa `ON DELETE CASCADE`. A V2 preservará movimentos e desativará produtos.
- O banco usa `INT` para quantidades e não guarda motivo, autor nem saldos anterior/resultante. Não há SKU, categoria ou mínimo por produto.
- Alertas usam limiares globais de 10 e 5; a V2 usará `minimumStock` por produto.
- Comparativos chamam toda saída de venda e calculam lucro com preços atuais, o que não representa necessariamente uma venda ou margem histórica.
- Importação converte dinheiro por `float`; o fluxo completo de importação será redesenhado em fase posterior.
- Páginas misturam SQL, regras, HTML e caminhos fixos `/Estoque`; a V2 terá módulos separados na API e UI.

## Fora da Fase 1

Não portar telas e endpoints do PHP automaticamente. Relatórios, comparativos, importação, autenticação completa e mutações de estoque exigem especificação e implementação próprias nas fases seguintes.
