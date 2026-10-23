# Formulários de produto — proposta B

Implementação local de 23/10/2026, após escolha explícita do usuário. Base: `c8364eb` na branch `sistema-de-estoque-v2`. Comparação e referências anteriores: `../product-form-proposals-20261023/REVIEW.md`.

## Entrega

- Identificação, estoque e preços em seções próprias na coluna principal; foto e detalhes opcionais na lateral.
- Nome em largura total; SKU/categoria e unidade/barcode em pares no desktop. Celular prioriza os campos operacionais e depois mostra foto e detalhes.
- Cabeçalho da edição com thumbnail/fallback, nome, SKU/categoria, situação persistida, saldo/unidade e mínimo.
- Componentes reais preservados: RHF/Zod, consultas e mutation, upload/link/preview/remoção, permissões, unidade bloqueada, saldo somente leitura, confirmação de inativação, proteção de rascunho e salvar/criar outro. Nenhuma alteração de API, schema ou dependência.
- Ordem do primeiro erro acompanha a nova ordem dos campos. Retorno ao rascunho foca Nome após o fechamento do modal.
- Corrigida sobreposição observada do aviso de sucesso com o botão de salvar ao atingir o fim da página. O aviso fica acima da barra inclusive com o espaço inferior da página.

## Validação interativa

Servidor normal `http://localhost:5173`: cadastro e edição inspecionados sem gravar dados. Desktop 1440, intermediário 1024, celular 390; sem overflow horizontal nas verificações. Tema claro conferido no celular, tema escuro em desktop/celular. Campos e ações usam o raio global de 2px.

Gravações exclusivamente em PostgreSQL loopback `gavyo_form_b_stock_test`, API 3012 e web 5175, com usuário/categoria fictícios. Nenhuma fixture ou alteração de produto foi enviada ao Neon.

| Fluxo | Resultado observado |
| --- | --- |
| Obrigatórios vazios | Nome/SKU/categoria com erro associado; primeiro foco em Nome |
| Teclado | Tab Nome → SKU; Enter barcode → Nome; Enter SKU → Categoria |
| Entrada inicial e decimais | 12,375 kg; mínimo 2,5; custo 1.234,56; venda 1.500,00 persistidos exatamente |
| Imagem por link | Link inválido recusado; SVG local válido exibido e persistido |
| Salvar e criar outro | Limpa campos, imagem e detalhes; conserva categoria/unidade; volta ao barcode quando usado |
| SKU/barcode duplicados | API 409 com erro junto ao campo, foco correto e rascunho preservado |
| Cancelar/continuar | Confirmação de descarte, dados mantidos e foco de volta em Nome |
| Descartar | Volta ao catálogo sem criar o rascunho |
| Reload | Produto, descrição, preços e imagem permanecem na edição |
| Editar | Nome/mínimo atualizados; saldo 12,375 e unidade kg preservados e bloqueados para alteração |
| Inativar | Exige confirmação; cancelar mantém rascunho; confirmar persiste situação inativa |
| Imagem por arquivo | Seleção/troca com preview blob; upload real no Cloudinary confirmado; remoção persistida |
| Gravação em andamento | Formulário e três ações desabilitados durante envio; um registro criado para o SKU de teste de repetição |
| API desligada | Mensagem de conexão e opção de tentar salvar; rascunho mantido e controles liberados |

O teste de arquivo usou somente capturas da sessão fictícia. A limpeza do único asset criado no Cloudinary foi confirmada pelo adaptador existente, após desvinculá-lo do produto local; registro local de imagem em `DELETED`. O ambiente carregou a configuração real de storage do arquivo local, apesar da tentativa inicial de desativá-la com variáveis vazias no PowerShell; nenhum segredo foi incluído nas evidências. Não tratar esse ambiente como storage isolado em futuras retomadas.

Conferência SQL final: dois produtos fictícios, um movimento inicial (0 → 12,375), sem movimento extra ao editar/inativar, preços exatos 1234.56/1500.00, mínimo 3.125, imagem removida. Não houve confirmação de um double click físico completo: foi observado o bloqueio durante o primeiro envio; a segunda tentativa por nome acessível não encontrou o botão porque o rótulo havia mudado para loading.

## Checks e limites

- `pnpm lint`, `pnpm typecheck`, `pnpm build` aprovados; build do frontend e lint repetidos após os ajustes finais de foco/aviso.
- `pnpm test`: 82 testes da API + 29 frontend passaram; três testes opt-in de PostgreSQL foram pulados. QA manual de persistência usou o banco local descrito acima.
- Build mantém o aviso já existente de chunk JavaScript acima de 500 kB; não houve refatoração de bundling nesta tarefa.
- Não reexecutados: todos os perfis RBAC, concorrência entre usuários, leitor físico, leitor de tela, todos os formatos/limites de upload ou todas as páginas do sistema. Testes desta rodada concentram-se nos formulários aprovados.
- Banco local preservado para rastreabilidade; processos adicionais de QA encerrados. Servidor normal mantido.
- Implementação local; esta rodada não inclui commit/push.

## Evidências

Ajuste posterior solicitado: foto/detalhes acompanham a rolagem em desktop com `position: sticky`, limite de altura e rolagem interna apenas quando necessário. Em até 1000px, a coluna volta ao fluxo estático. Conferidos topo de 16px após rolar até Preços, separação da barra de salvar, painel expandido em 1024×600 e fluxo móvel em 390×844. Print: `photo-following-scroll.jpg`. Build frontend refeito após o ajuste.

`new-desktop.jpg`, `new-1024.jpg`, `new-mobile.jpg`, `edit-desktop.jpg`, `edit-mobile.jpg`, `edit-light-mobile.jpg`, `required-errors-desktop.jpg`, `inactivation-confirmation.jpg`, `connection-error.jpg`. Comparar com os prints `atual-*` da pasta de propostas. Capturas são de viewport, evitando distorções de barras sticky em full-page.
