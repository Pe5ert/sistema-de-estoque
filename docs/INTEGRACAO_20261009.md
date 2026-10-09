# Integração da V2 em Compras - 09/10/2026

Integrado o commit `232d93d` de `sistema-de-estoque-v2` à branch `feat/suppliers-purchases`, preservando fornecedores/compras e os artefatos visuais.

Conflitos conciliados: scripts de teste executam compras e inventário físico; Prisma conserva as relações dos dois módulos; API registra ambos; frontend mantém suas rotas e grupos de navegação; mensagens da importação, inventário e compras coexistem; ConfirmDialog aceita as variantes de botão usadas pelas duas áreas; shared exporta ambos os contratos.

Verificações desta integração: instalação com lockfile congelado, typecheck, lint, suíte automatizada e build completo passaram. Os testes PostgreSQL opt-in permanecem dependentes de suas bases locais dedicadas; não foram ativados nesta rodada. A suíte não equivale a uma nova auditoria interativa completa do navegador.

As migrations de inventário físico e compras continuam pendentes no Neon conforme os relatórios originais. Não foram executados deploy, reset, seed ou alterações de dados no banco compartilhado.

O upload Cloudinary continua incompleto e separado em `wip/product-image-upload`, sem ser incorporado nesta integração. Para retomar, primeiro integrar esta base validada naquela branch WIP e seguir `docs/UPLOAD_IMAGENS_WIP.md`.
