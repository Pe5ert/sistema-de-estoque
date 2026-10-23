# Formulários de produtos — propostas para escolha, 23/10/2026

Base conferida: c8364eb, branch sistema-de-estoque-v2 sincronizada com remoto. Nenhum arquivo rastreado da aplicação foi alterado. Sem dependências novas, chamadas à API de escrita, migrations ou dados gravados. Experimento React isolado em http://127.0.0.1:5182/ .

## Diagnóstico observado

- No cadastro atual há introdução, linha de contexto, legenda e título numerado antes de começar. O mobile perde área útil com essas camadas e o rodapé de duas linhas.
- A foto na coluna estreita esquerda afasta Nome/SKU da margem dos grupos seguintes. Identificação e estoque/preços usam ritmos e eixos de leitura diferentes.
- Estoque tem mais orientação e decisões que preços; a divisão horizontal funciona para um cadastro curto, mas precisa adaptar-se à entrada inicial expandida.
- Na edição, título genérico e SKU têm mais presença que a identidade completa do produto. Propomos reconhecer nome, categoria, situação e saldo antes de editar.
- Correção ao briefing: no desktop real inspecionado, barcode já aparece ao lado da unidade; não havia faixa azul dominante. Não tratar esse ponto histórico como bug atual.
- Manter: obrigatórios, regras e validação existentes, unidade protegida, saldo consultivo, foto real ao implementar, rascunho, confirmação, teclado e ações de cadastro em sequência.

## Duas alternativas

**A / Compacto operacional:** superfície contínua; identificação em duas colunas; foto pequena integrada à direita, sem estreitar o início do Nome. Estoque recebe maior proporção que preços. No mobile tudo necessário fica no fluxo, foto vira faixa compacta e preços compartilham linha. Melhor opção para cadastrar muitos itens.

**B / Principal + painel lateral:** identificação, estoque e preços em grupos separados à esquerda; foto e complementos à direita. Na edição, cabeçalho contextual. No celular, dados operacionais vêm antes da foto; painel informativo redundante de situação é omitido, mas ativação e descrição continuam disponíveis. Mais legível por grupo, com maior rolagem e mais superfícies.

| Critério | Atual | A | B |
|---|---|---|---|
| Organização | Identificação com coluna estreita de foto | Documento contínuo e foto à direita | Principal operacional + complementos laterais |
| Clareza | Ajuda repetida e contexto de edição fraco | Menos camadas; obrigatório destacado | Separação explícita; contexto de edição forte |
| Densidade | Muito conteúdo introdutório | Maior densidade, menos rolagem desktop | Menor densidade e maior rolagem |
| Visual | Eixos de grupos diferentes | Geometria contínua | Composição em áreas independentes |
| Mobile | Empilhamento e footer volumoso | Foto compacta e ações consistentes | Reordena complementos depois da operação |
| Teclado | Boa base existente | Ordem linear e erro inicial focado | Mesma ordem operacional, depois complementos |
| Implementação | Já integrada | Ajustes locais moderados | Reorganização maior de composição/DOM |
| Manutenção | Componentes existentes | Menor diferença estrutural | Mais regras de breakpoint e posição |

**Recomendação:** A como base, mantendo seu cabeçalho contextual de edição. É a melhor relação entre velocidade, simplicidade e mudança localizada. B é válida se a organização lateral pesar mais que densidade. Evitar um híbrido que acumule os cards de B e toda a densidade de A.

## Referências e o que foi aproveitado

- [Shopify](https://help.shopify.com/pt-BR/manual/products/add-update-products): documentação pública de cadastro/edição consultada; inspiração estrutural de painel lateral solicitada pelo briefing, não alegação de acesso ao admin autenticado ou inspeção da sua versão atual.
- [Sortly](https://help.sortly.com/how-to-add-items): documentação e imagem pública do formulário abertas e examinadas. Aproveitar essenciais em destaque e complementos sob demanda; não copiar obrigatoriedade de quantidade nem múltiplas fotos.
- [Zoho Inventory](https://www.zoho.com/us/inventory/help/items/items-overview.html): grupos de identificação, unidade, venda/compra e estoque. Não trazer impostos, contas contábeis, fabricante, variantes ou unidades alternativas.
- [Odoo via Cybrosys](https://www.cybrosys.com/odoo/odoo-books/v19/inventory/products-menu/): material de terceiro consultado, evidencia a complexidade que não cabe importar para o GAVYO. A documentação oficial Odoo tentada retornou timeout; não usamos como evidência de layout autenticado.
- [ERPNext](https://docs.frappe.io/erpnext/item): referência comercial adicional, com código, grupo, unidade e separação de dados complementares; não copiar regras de avaliação, contas ou estoque negativo.
- [Field](https://ui.shadcn.com/docs/components/base/field), [Input](https://ui.shadcn.com/docs/components/base/input) e [Card](https://ui.shadcn.com/docs/components/base/card): referências de agrupamento e associação campo/ajuda/erro; nenhum kit instalado.

As recomendações são inferências de design adaptadas ao GAVYO. Acesso a páginas públicas/documentação não equivale a teste dos produtos comerciais em conta autenticada.

## Como comparar e testar

- No topo: A/B, Adicionar/Editar e tema claro/escuro. Alternar composição conserva o preenchimento; trocar operação pede descarte se houver alterações locais.
- Preencher exemplo; validar vazio; entrada inicial; escolher unidade no cadastro; conferir bloqueio na edição; descrição/situação; confirmação de inativação; Cancelar; salvar e criar outro.
- Marcar “Simular falha ao salvar”: botão entra em processamento, falha mantém preenchimento. Desmarcar e salvar: confirmação explicitamente simulada.
- Foto aceita seleção/prévia/remoção local e link. Não há upload ao Cloudinary, persistência nem validação completa do backend neste experimento. Não é substituto de ProductImageField.
- Simulação usa validateProductForm do código atual, mas não integra React Hook Form ou mutações reais. A implementação aprovada deverá reaproveitar o formulário real, não substituir suas regras pela lógica de demonstração.

## Verificações e limites

Criar/editar × A/B × 1440×900, 1024×768, 390×844: 12 estados conferidos sem overflow horizontal; unidade habilitada na criação e bloqueada no cenário de edição com histórico. Arquivo viewport-checks.json.

Testados: erro e foco em Nome (ajustado à ordem visual), estado de processamento bloqueando salvar, falha mantendo nome, reset/foco após salvar e criar outro, confirmação antes de inativar e tema claro mobile sem overflow. As capturas de página inteira anteriores podem posicionar footer sticky sobre o meio do conteúdo; as prévias de viewport da galeria são a referência final. Não diagnosticar sobreposição permanente só pela composição de screenshot full-page.

Não homologados: leitor de tela real, teclado virtual de aparelho físico, upload real, todos os casos de decimais/duplicidade e validação de rede real. Não houve mudança na aplicação, portanto não foram repetidos testes completos de API ou migrations. Protótipos servem para escolher composição, não comprovam preservação funcional de uma futura integração.

## O que mudar depois da escolha

1. Reorganizar JSX e classes de ProductForm, mantendo RHF, Zod, setters, ref de submit, permissões, erros e proteção de rascunho.
2. Reposicionar ProductImageField original sem alterar upload/claim/release/URLs.
3. Extrair apenas o cabeçalho contextual necessário à edição; dados sempre do produto consultado, nunca da demonstração.
4. Ajustar tokens/classes locais de composição e breakpoints; preservar tema, 2 px, sidebar e rotas.
5. Garantir foco acima do footer, comportamento com teclado virtual e ordem visual compatível com Tab; não usar CSS order para embaralhar navegação.
6. Comparar antes/depois, executar gates e fluxos reais de cadastro/edição em banco isolado, inclusive imagem, SKU duplicado, unidade bloqueada, inativação, resposta perdida e salvar/criar outro.

**Parar aqui para escolha do usuário. Nenhuma aplicação no formulário definitivo está autorizada antes da aprovação visual.**
