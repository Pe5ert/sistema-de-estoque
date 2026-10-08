# Ambiente isolado de QA — 08/10/2026

- Node 22.23.0 e pnpm 11.24.0 extraídos fora do repositório, com checksums conferidos contra os metadados oficiais de distribuição.
- PostgreSQL 18.4.0 embedded, processo independente, escutando somente `127.0.0.1:5549`.
- Base de testes opt-in: `stock_review_import_test`.
- Base da conferência visual: `stock_ui_import_test`.
- As quatro migrations locais foram aplicadas com `prisma migrate deploy` somente nessas duas bases novas. Nenhum reset, seed ou migration no Neon.
- Conta ADMIN fictícia e categoria `Insumos — demonstração` criadas somente na base da prévia.
- API em `http://localhost:3211/api`, frontend em `http://localhost:5175`; CORS aponta para essa origem, backups automáticos desativados no processo de QA.
- Health confirmado em 08/10/2026: HTTP 200, `status: ok`, `database: up`.
- Nenhuma modificação no `.env` do projeto. Variáveis aplicadas somente aos processos de QA.

Comandos de retomada enquanto esta sessão conservar `/tmp/estoque-import-runtime-20261008`:

```sh
/tmp/estoque-import-runtime-20261008/start-ui-api
/tmp/estoque-import-runtime-20261008/start-ui-web
```

A pasta temporária contém somente infraestrutura e dados fictícios de QA; não é necessária ao uso do produto. Logs de migration e testes estão nesta pasta de evidências do repositório.
