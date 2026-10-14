# Pesquisa global — GAVYO

14/10/2026, sobre cabeab3. Busca no cabeçalho, ao lado do tema, com nome/SKU/barcode e funções do sistema. Produtos incluem cadastros inativos identificados. Selecionar abre o drawer do produto pela identidade do registro; funções abrem a área correspondente. Acesso a funções condicionado à matriz existente de permissões, sem substituir os guards de rota/API.

- Atalhos: Ctrl/Cmd+K, setas, Enter e Escape. Clique externo/Tab fecha a lista. Sem interceptar atalho quando o cabeçalho está inert por um modal/menu.
- Consulta com debounce de 220ms, limite de seis produtos e cancelamento por signal. Resultados de outra pesquisa não ficam selecionáveis. Falha mostra retry e mantém atalhos de funções.
- Categorias tem acesso direto por busca, respeitando a permissão. Produtos preservam filtros ao fechar os detalhes.
- Layout compacto no celular, dois temas, 2px e movimento reduzido. Ícone do tema continua visível no cabeçalho mobile.
- Navegação mantém as confirmações existentes para alterações não salvas; escolher um resultado não executa cadastro nem movimentação.

## Verificação

Lint, TypeScript/build e 22 testes passaram; três testes novos cobrem normalização/aliases, permissões e URL com SKU exato e identidade do produto. Logs nesta pasta.

No navegador local: Ctrl+K abriu; SKU fictício COMPRA-QA-002 encontrou Botões QA e exibiu barcode; Enter abriu detalhes corretos; Escape fechou e preservou a busca da lista de Produtos. Capturas são integrais da janela do aplicativo.

Buscar “saida” também encontrou Movimentações e Enter abriu a tela correspondente, sem registrar nenhuma operação.

Não foi realizado teste em celular físico, leitor de tela ou outros motores de navegador nesta entrega. Sem alterações de API, banco ou dependências.
