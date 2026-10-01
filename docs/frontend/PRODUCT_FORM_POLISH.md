# Polimento do formulário de produto — 01/10/2026

## Alterações

Refinamento localizado em ProductForm.tsx e nos seletores de formulário de styles.css. Mantidos a página dedicada, composição horizontal, grupos semânticos, paleta, cadastro/edição em memória e o contrato de estoque. Sidebar, dashboard, backend, autenticação, vendas e storage não foram alterados nesta rodada.

## Hierarquia

Identificação do produto ganhou heading de 20px, Nome em 16px e peso maior para o valor digitado, com SKU ao lado. Código de barras abre o fluxo com um único campo característico. Categoria e unidade seguem no grid; Comercial e Controle de estoque usam headings de 16px. Descrição recua em Detalhes opcionais, com textarea de duas linhas e expansão preservada.

## Barcode/SKU

Barcode é o identificador físico opcional: ícone, Bipar código de barras ou digitar, indicação discreta de leitura por teclado e Enter para Nome. SKU aparece como identificador interno obrigatório, sem ícone de scanner, independente de barcode. Não há indicação falsa de conexão com hardware. Sem leitor, Tab pula a leitura opcional e permite o cadastro completo.

## Estoque inicial

Mínimo é identificado como configuração de reposição. Saldo inicial é uma operação com duas escolhas e a mensagem A entrada inicial será uma movimentação. Quantidade e motivo foram colocados dentro do grupo de entrada, mantendo vínculo visual com a escolha. A prévia continua explicitando saldo zero até integração; editar continua mostrando somente consulta de saldo.

## Imagem

Painel deixou de ter fundo próprio e borda vertical. Preview desktop passou de 132×118 para 106×96; no mobile, 90×85 para 76×70. Placeholder e selecionar/substituir/remover foram preservados. A seleção virou ação utilitária discreta, com foco visível. A área de drag/drop só recebe destaque quando arrastando um arquivo. Nenhum upload definitivo foi implementado.

## Superfícies removidas

- Contorno externo e radius do container do formulário; mantidos superfície única e trilho azul superior.
- Fundo próprio e divisória vertical do painel de imagem.
- Caixa tracejada permanente da área de imagem; destaque fica reservado ao drag ativo.
- Divisória vertical entre Comercial e Controle de estoque; grid, tipografia e divisores horizontais organizam os grupos.
- Contorno completo, radius e fundo próprio da barra de ações; agora usa a base escura e uma linha superior.
- Heading auxiliar repetindo o começo da identificação e hints longos foram simplificados.

Bordas continuam nos inputs, onde indicam interação. Comercial e estoque não receberam cards ou cores novas.

## Ações

Salvar produto permanece azul e principal; retorna ao catálogo com feedback. Salvar e criar outro é secundário, conserva apenas categoria/unidade, limpa os dados do item, fecha detalhes e volta para Barcode. Feedback foi reduzido a Produto cadastrado nesta sessão. Próxima leitura pronta. Cancelar continua terciário e preserva confirmação inline de descarte.

## Keyboard UX

Tab: Barcode → Nome → SKU → Categoria → Unidade → imagem opcional → Custo → Venda → Mínimo → Saldo inicial → Quantidade quando aplicável → Detalhes → ações. Radios usam navegação nativa por setas. Barcode + Enter avança para Nome; SKU + Enter para Categoria. Enter nos outros inputs não submete; textarea aceita novas linhas.

Edição abre com foco em Nome. Erros preservam os dados e o foco segue o primeiro erro na ordem visual, incluindo Nome antes de SKU quando ambos estão vazios. Foco do formulário usa azul dos tokens existentes. Ao focar campos cobertos pela barra, a página rola para mostrá-los com seus erros; movimento causado por clique espera sua conclusão, para não mover o alvo entre pressionar/soltar o mouse.

## Responsividade

Comparados estado anterior e polido em 1440×900, 1024×768 e 390×844. Desktop mantém identificação/imagem e Comercial/Estoque horizontais; largura intermediária preserva identificação/imagem, empilhando os grupos inferiores; mobile mantém Barcode/Nome/SKU/Categoria/Unidade antes da imagem e campos de largura integral. Ações permanecem compactas e acessíveis. O formulário sem entrada inicial continua cabendo em 1440×900; com entrada/descrição, a barra acompanha a rolagem.

Capturas de viewport e mobile de página inteira em `artifacts/product-polish-20261001/`; o estado anterior está em `before/`. Capturas fullPage mostram a barra sticky na posição do viewport inicial; os testes medem campos e erros reais acima dela após receber foco.

## Validação

- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS no workspace.
- `pnpm build`: PASS no workspace.
- QA: 61 checks, sem exceções no navegador; roteiro/resultados em `artifacts/product-polish-20261001/qa/`.
- Exercitados scanner/Enter, ordem de Tab, ausência de barcode, validação inline, duplicidade, dados preservados, double-submit, edição sem alterar saldo, remover imagem e cadastro de 20 itens seguidos.
- Medidos overflow, foco azul, largura/altura da quantidade, campos/erros/descrição acima da barra nas três larguras.
- Avisos existentes: Node 24.19.0 fora da faixa 22 declarada e comentários PURE do Zod durante bundling; nenhum comando falhou por eles. Nenhuma instalação no sistema.

## Git

Branch `sistema-de-estoque-v2`, alterações locais sem commit desta rodada. Working tree já continha trabalho anterior. `qa/git-diff-stat.txt` registra o diffstat completo dos arquivos rastreados; `qa/git-status.txt` lista também componentes/artifacts untracked. Para distinguir somente este polimento, `qa/git-diff-stat-round.txt` compara ProductForm.tsx e styles.css com cópias do início da rodada usando git diff --no-index --stat. Arquivos novos não entram no diffstat padrão até serem rastreados.

## Limite atual

Cadastro, edição e imagens continuam em memória da sessão; recarregar restaura os exemplos. Entrada inicial permanece preparada, sem criar movimento. Nenhuma integração adicional foi iniciada. Detalhes opcionais mantêm a expansão existente porque descrição é secundária ao cadastro repetitivo.
