# Formulários e interação — 01/10/2026

## Diagnóstico

Não havia cadastro ou edição de produto no frontend. O catálogo era somente leitura. Movimentações já tinha consulta e prévia, mas aceitava apenas SKU, restringia quantidade a inteiro, posicionava erros depois do grupo inteiro e não conduzia o foco nem preparava o próximo item. Criar uma sequência de campos em coluna ou um wizard adicionaria fricção ao trabalho repetitivo.

## Referências analisadas individualmente

- **Basit / página com grupos horizontais:** identificação e imagem no topo, informação comercial e inventário próximos, descrição menor, ações finais. Usado para aproveitamento da largura e grupos separados por contexto. A identidade clara e os grupos fiscais não foram trazidos para a V2.
- **Muhammadullah / New Product:** identificação imediatamente acessível, campos compactos e ação de imagem visível. A coluna longa e o modal da referência não atendem à tarefa repetitiva; a V2 mantém página dedicada.
- **ERP / Add Product:** divisão entre informação básica e estoque, pares de campos, imagem compacta e ações com pesos diferentes. Aplicados no grid; sem impostos, fornecedor, descontos ou vendas.

## Novo Produto

Rota `/products/new`, acessível por Novo produto no catálogo. Identificação ocupa a maior área, imagem é lateral e compacta. Preços e estoque usam a largura abaixo; descrição opcional fica em Mais informações. Todos os campos essenciais são imediatamente visíveis.

Ordem: SKU → barcode opcional → Nome → Categoria → Unidade → imagem opcional → custo/venda → mínimo → operação inicial → ações. SKU e barcode têm presença visual maior e identificação explícita; Enter leva a Nome, sem submit. Leitor USB é tratado como teclado, sem WebUSB.

Categoria usa select nativo com três categorias atuais e navegação de teclado. Não foi criada gestão de categorias nem combobox complexo sem volume que o justifique. Unidade usa siglas e nomes em português. Custo/venda opcionais ficam próximos; não há margem calculada.

Estoque inicial é uma operação: cadastrar sem saldo ou preparar entrada com quantidade e motivo fixo. A mensagem explica que o saldo permanece zero nesta prévia. Não existe input de saldo editável.

Imagem principal opcional permite escolher ou arrastar um arquivo, prévia, substituir/remover. São aceitos JPG/PNG/WEBP até 5 MB para a prévia local, incluindo validação do conteúdo. URLs de imagem são liberadas ao substituir/remover/desmontar; a imagem salva na sessão recebe URL própria, independente da prévia do formulário. Sem base64, storage, galeria ou cropper.

Salvar produto retorna ao catálogo com mensagem curta. Salvar e criar outro mantém categoria/unidade, limpa identificação, preços, mínimo, descrição, imagem e operação inicial e devolve o foco ao SKU. Cancelar solicita descarte inline quando há preenchimento; continuar mantém valores.

## Editar Produto

Detalhe do produto → Editar produto → `/products/:id/edit`. Reutiliza o formulário, labels, validação e imagem. Título e ação indicam edição; saldo é somente consulta, sem operação inicial editável. ID estável permite trocar SKU sem criar outro produto. Preços existentes aparecem com duas casas. Produto indisponível na sessão oferece retorno ao catálogo.

## Movimentação

SKU/barcode → identificação com imagem/nome/saldo → foco em Quantidade → Entrada/Saída por radio com texto e símbolo → Motivo → Ver prévia. Usa unidade do produto e até três casas decimais, sem máscara. Erros são associados aos campos e focam o primeiro erro. Saída acima do saldo mostra insuficiência. Próximo produto limpa quantidade/motivo/consulta, conserva o tipo e devolve o foco ao leitor. Continua sendo somente prévia, sem movimento registrado.

Se um barcode coincide com o SKU de outro produto, a consulta mostra os candidatos para seleção explícita, mantendo a operação desabilitada até a escolha. Não foi inventada restrição de unicidade cruzada entre SKU e barcode.

## Outros formulários

Filtros de Produtos e Histórico permanecem toolbars compactas com os tokens atuais. Não foram adicionados filtros sem demanda, formulários de categoria, autenticação ou vendas. Categoria não tem página existente a refinar.

## UX

- Labels reais e erros ligados por aria-describedby/aria-invalid; foco visível nos controles.
- Tab segue DOM; Enter em códigos conclui identificação, em outros inputs não submete prematuramente; textarea permite nova linha. Botões continuam acionáveis por teclado.
- Dados são preservados em erro. SKU/barcode duplicados são verificados separadamente no catálogo da sessão, excluindo o próprio ID em edição. Isso não substitui validação concorrente futura no servidor.
- Salvando desabilita ações e a trava síncrona impede double-submit; não há latência artificial na memória local.
- Cancelar é protegido por confirmação inline. Recarregar/sair da página com alterações usa beforeunload nativo. A navegação pela sidebar/Voltar do navegador ainda segue o comportamento do router atual; não foi introduzido bloqueador global de navegação nesta rodada.
- Nenhum saldo de produto é editado pelo cadastro/edição. Entrada inicial é metadado preparado, sem refletir no estoque/histórico.

## Componentes

`ProductFormPage`/`ProductForm` para cadastro e edição; `Field`, `fieldAccessibility`, `QuantityInput` para controles realmente repetidos; `ProductImageField` para imagem principal; helpers de parsing/defaults/validação em `product-form-model.ts`. `DemoCatalogProvider` concentra catálogo da sessão em memória. Reutilizados ProductIdentity, ProductThumbnail, Status, StockMeter e as ações/tokens existentes. Sem GenericForm ou novas bibliotecas de UI.

## Responsividade

Revisados 1440×900, 1024×768 e 390×844, incluindo painel, catálogo, novo/editar, movimentos e histórico. Desktop largo usa identificação/imagem e preços/estoque lado a lado. Em 1024px, preços/estoque passam a grupos verticais mantendo identificação/imagem. Mobile usa campos em largura integral, imagem compacta e ações inferiores de menor altura. Não há overflow horizontal. A quantidade focada foi medida acima do rodapé sticky nas três larguras. Capturas fullPage de mobile mostram o rodapé na posição sticky do viewport capturado; as capturas desktop são do viewport real.

## Validação

- **lint PASS:** `pnpm lint`.
- **typecheck PASS:** `pnpm typecheck` no workspace.
- **build PASS:** `pnpm build`, seguido de build do web após ajustes finais.
- **tests PASS:** `pnpm test`, dois testes existentes de configuração; 67 checks de números, comportamento e layout no QA frontend em `artifacts/forms-20261001/qa/verify.cjs`, sem exceções no navegador; resultados JSON na mesma pasta.
- **git diff --check PASS.** Sem diferenças em `apps/api` ou `packages/shared`.
- Ambiente possui Node 24.19.0, diferente da faixa declarada Node 22; comandos passaram com aviso. Rollup avisa sobre comentários PURE do Zod, sem falhar. Nada foi instalado no sistema.

## Git

Branch `sistema-de-estoque-v2`. Alterações locais não commitadas nesta rodada; inclui também o refinamento visual anterior que já estava no working tree. Status completo e diffstat em `artifacts/forms-20261001/qa/git-status.txt` e `git-diff-stat.txt`. O diffstat padrão conta arquivos rastreados; novos componentes/capturas aparecem como untracked no status. Sem mudanças de backend, auth ou migrations.

## Pendências reais

Persistência via API, armazenamento da imagem principal, entrada inicial como StockMovement e atualização entre usuários. Catálogo/imagens persistem somente enquanto a página permanece aberta; reload restaura os exemplos. Um produto de sessão deixa de existir após reload, inclusive sua rota de edição. Contrato definitivo de erros/mutações e consulta de barcode ao servidor continuam futuros. Login segue com o outro desenvolvedor. Proteção uniforme de rascunhos em toda navegação interna pode ser incorporada com a integração do router, sem apresentar proteção parcial como universal.

## Onde conferir

Prévia: `http://localhost:5173/products/new`. Capturas principais em `artifacts/forms-20261001`: `novo-produto-desktop.png`, `editar-produto-desktop.png`, `movimentacao-desktop.png`. Evidências nas três larguras e roteiro reproduzível ficam em `qa/`. Os prints do refinamento anterior permanecem separados.
