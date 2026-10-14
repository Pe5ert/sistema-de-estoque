# Dashboard interativa — diagnóstico

Base 77d1244, branch sistema-de-estoque-v2; fetch sem novidades. Equipe de estoque precisa identificar reposição e investigar movimentos. Manter composição assimétrica, grafite/azul e 2px; React/TanStack e gráficos próprios, sem nova dependência.

Dependência mínima do backend: consulta days=7|30|90 validada, série completa com zeros, limites de São Paulo e contagem de produtos ativos por categoria. Sem migration, escrita ou alteração de saldo. Histórico deve ler tipo/datas da URL. Categorias comparam produtos, movimentos comparam registros (não unidades). Posição do estoque e indicadores de hoje independem do período e recebem rótulos explícitos.

Riscos: filtros ignorados, tooltip cortado, barras demais no celular e falha mostrando dados antigos como novos. Mitigação: agrupamento consecutivo, links nativos, seletor de intervalo, alternativa tabular e período servido rotulado. Preservar dados anteriores e mostrar recuperação; motion CSS curto, reduced-motion e nenhum replay em refetch.

Referências: https://linear.app/ ; https://docs.stripe.com/dashboard/basics (dashboard.stripe.com exige login); https://dribbble.com/shots/25174577-Supplier-Management-Overview-Dashboard . Sem copiar o tema claro.

Verificar PostgreSQL local isolado, limites/zeros/contagens e navegação real em 1440x900,1024x768,390x844. Gates lint/typecheck/test/build/diff. Registrar somente performance medida e limitações honestas.
