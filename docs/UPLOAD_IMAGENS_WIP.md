# Upload de imagens — entrega de 15/10/2026

O snapshot de 08/10 foi concluído e validado em ambiente isolado. A migration compartilhada permanece pendente.

Adicionar/Trocar imagem oferece prévia local e envio somente ao salvar. SKU duplicado mantém os dados e reutiliza o arquivo enviado na nova tentativa. Remover só altera o produto ao salvar. Links existentes permanecem suportados.

Uma foto JPEG/PNG/WebP, até 5 MB e 20 MP, sem animação. A API remove metadados, corrige orientação e gera WebP até 1600 px. CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET ficam somente na API; nunca no Git ou em VITE_.

POST /api/product-images requer product.create; POST /api/product-images/:productId requer product.update. Exigem sessão, origem permitida e limite de requisições. Anexação exige propriedade e ocorre na transação do produto. Arquivos nunca anexados expiram em 24 horas. Fotos substituídas respeitam BACKUP_RETENTION_DAYS (365 padrão). Referências ativas são revalidadas sob bloqueio antes da limpeza; falhas do provedor permitem nova tentativa.

## Implantação

Migration aditiva: 20261008010000_product_images. Antes de db:deploy no Neon compartilhado: obter autorização para esse ambiente, criar e inspecionar backup com pg_restore --list, registrar contagens, aplicar sem reset/seed/fixtures, conferir migrações e contagens. Reiniciar API com as três variáveis e atualizar frontend. Publicar código não aplica a migration.

## Validação

Lint, build completo e suíte de testes passaram. HTTP: sessão, origem, permissões OPERATOR/MANAGER, UUID e tamanho. PostgreSQL local: rollback por duplicidade, propriedade, retenção, trocas simultâneas sem deadlock e limpeza com referências ativas. Upload, download e remoção de um arquivo temporário real no Cloudinary passaram.

Navegador em banco/conta locais isolados: prévia, SKU duplicado preservando formulário, correção/cadastro, reload mantendo sessão/foto, catálogo/detalhes e substituição da imagem passaram. Fixtures são quadrados de cor, sem dados reais. Evidência: artifacts/product-images-20261015/desktop.png. Mobile, arraste real, navegação completa por teclado e interrupção de rede não foram validados manualmente nesta entrega.

Helpers src/images/image-qa.ts e cloudinary-live-smoke.ts recebem IMAGE_CREDENTIALS_FILE apontando ao .env local e leem somente chaves Cloudinary. image-qa e testes PostgreSQL exigem IMAGES_TEST_DATABASE_URL em loopback com nome terminado em _stock_test. API 3012 e origem http://127.0.0.1:5175. Argumento seed cria fixtures exclusivamente nesse banco dedicado; nunca usar em banco real.
