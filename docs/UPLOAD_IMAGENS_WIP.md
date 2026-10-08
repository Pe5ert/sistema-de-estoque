# Upload de imagens - trabalho em andamento, 08/10/2026

Branch de retomada: `wip/product-image-upload`.

Este snapshot preserva o trabalho interrompido a pedido do usuário para fechar o computador. **Não é uma entrega funcional; não integrar ou implantar como pronta.**

Preparado: dependência sharp, validação/normalização de JPG/PNG/WebP, cliente Cloudinary autenticado no servidor, registro ProductImage, migration aditiva e base da limpeza de arquivos. Typecheck da API passou. Não houve upload real, conta Cloudinary configurada ou migration aplicada ao banco compartilhado.

Ainda faltam: integração do ciclo de anexação/liberação ao salvar produto e importações; ligação com formulário e prévia local; cache da tentativa para não reenviar após duplicidade; mensagens de erro; verificação de DI do ThrottlerGuard (exportar ThrottlerModule ou importar no módulo de imagens); testes HTTP/RBAC/CSRF/limites, testes reais em PostgreSQL isolado e QA do navegador. O módulo de imagens está incluído no AppModule neste snapshot, mas o bootstrap não foi validado. Também rever respostas inesperadas do provedor e concorrência entre limpeza e anexação antes de ativar.

Decisões: uma imagem principal, 5 MB, até 20 MP, sem animação; prévia ao selecionar e upload somente ao salvar; manter links existentes; manter foto anterior até confirmação do cadastro. A limpeza de fotos substituídas deve respeitar a retenção dos backups (a proposta inicial de 24 horas serve só para arquivos nunca anexados).

O usuário ainda não tem conta Cloudinary. Configurar CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET somente no ambiente local/servidor, nunca no Git ou VITE_.

Pilot visual publicado em `feat/suppliers-purchases`. O upload deve ser retomado nesta branch WIP e só integrar após validação. Não executar reset, seed ou deploy de migration no Neon para retomar.
