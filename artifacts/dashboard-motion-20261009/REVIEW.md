# GAVYO — Dashboard interativa e motion

Entrega retomada em 14/10/2026; evidências visuais e performance coletadas em 09/10/2026. Base 77d1244. Dados fictícios no PostgreSQL local; nenhum dado de QA no Neon, nenhuma migration e nenhuma dependência adicionada.

## Funcionalidades e fontes

- Entradas/saídas: série completa de 7/30/90 dias entregue por `/api/dashboard/summary?days=...`. Contagem de IDs de StockMovement de tipo ENTRY/EXIT. Ajustes permanecem no indicador específico de hoje; quantidades/unidades não são somadas no gráfico.
- São Paulo define os dias e limites do período no servidor. No desktop os intervalos são 1/3/7 dias; no celular 1/5/15 dias. O último intervalo pode ser menor. Totais e tabela diária preservam todos os dias.
- Tooltip e guia por mouse/foco, seletor de intervalo, Escape, links nativos por barra/tipo, legenda com totais e tabela diária sob demanda. O gráfico informa o período realmente exibido enquanto outro carrega ou falha.
- Estoque: Product ativo, normal acima do mínimo, baixo com saldo até o mínimo, zerado sem saldo. Segmentos proporcionais, texto com contagem/percentual e links para `stock=success|warning|danger`. Mesmo zero mantém link na legenda.
- Categorias: produtos ativos por categoria real, incluindo categoria inativa se ainda tiver produtos ativos. Não somar estoque em unidades diferentes. Mostrar seis categorias com expansão das demais; link por UUID abre Produtos.
- Valor a custo, reposição, indicadores de hoje e atividade recente são posição atual, independentes do período escolhido. Movimentos recentes levam ao Histórico com produto/tipo/data. Sem indicador fictício de compras pendentes.
- Histórico inicializa datas de calendário e tipo da URL, preservando busca e referência anteriores. URLs malformadas são descartadas; datas locais viram limites UTC correspondentes a -03:00.

## Motion e acessibilidade

Barras mudam escala em 220 ms; troca de período recebe fade de 220 ms somente no gráfico. Entrada do painel em 320 ms, páginas operacionais em 280 ms, drawer em 240 ms e backdrop em 180 ms. Hover contido em 120 ms e pressão de botões em 1 px. Fechamento imediato preserva foco e Escape; feedback/ConfirmDialog existentes continuam em uso. Nenhum replay da página ao refetch, nenhuma animação de números, nenhuma biblioteca de motion, nenhum will-change global.

CSS reduced-motion desliga animações/transições decorativas e pressão de botões, mantendo a escala que representa os dados. Regras revisadas; falta conferir a preferência efetivamente ativada em navegador/SO. Tab/Escape foram testados no navegador. Seletores e links de detalhe têm alvos de 44 px; barras estreitas têm esses controles como alternativa. Tooltip fica dentro do fluxo, sem cortar bordas. Contraste preserva tokens aprovados e foco existente.

## Validação

Capturas reais em 1440x900, 1024x768, 390x844, confirmadas pelo viewport/DOM, sem overflow horizontal. `responsive-metrics.json` registra dimensões. Gráfico de 90 dias no celular apresentou seis intervalos e abriu saída com datas corretas. Entradas do intervalo 07/10–09/10 abriram 24 registros no Histórico e mantiveram filtros após reload. Estoque zerado abriu catálogo com zero produtos. Categoria abriu Produtos com o UUID correspondente.

Falha HTTP de leitura foi injetada temporariamente apenas no banco local de QA e removida: o gráfico manteve sete dias, informou erro ao pedir 30 e ofereceu retry. Capturas `period-loading.png`/`period-error.png`. Estados de gráfico vazio, zero produtos e categorias vazias também foram verificados por renderização dos componentes no teste automatizado; não equivalem a um novo teste completo de navegador em base vazia.

Gates: lint, typecheck, testes e build aprovados em 09/10 e repetidos na retomada. Suite padrão: 73 testes API aprovados, três suites PostgreSQL opt-in não executadas nessa chamada; 19 testes web aprovados. Suite PostgreSQL de estoque separada: cinco testes aprovados, incluindo concorrência, validação dos períodos, zeros, limites locais, exclusão do 91º dia, registros em vez de quantidades e totais por categoria. Reexecutada na retomada no banco isolado `_stock_test`. Ver logs.

## Performance medida

Medições locais em desenvolvimento com React StrictMode e Profiler temporário, removido da entrega. Três reloads comparáveis; excluir HMR e medições exploratórias. Dados brutos em `baseline-performance.json` e `after-performance.json`.

| Medida | Antes | Depois |
| --- | ---: | ---: |
| JS minificado | 1.081,08 kB | 1.095,85 kB |
| JS gzip (Vite) | 274,46 kB | 276,76 kB |
| CSS gzip | 17,62 kB | 18,95 kB |
| Commit de render com dados, mediana de 3 amostras | 20,1 ms | 28,6 ms |
| Commits por carregamento medido | 2 | 2 |
| Layout shift observado no primeiro segundo do último reload | 0 | 0 |

JS gzip cresce 2,30 kB (aprox. 0,84%). Render ficou mais caro pelo painel interativo adicional; não afirmar ganho de velocidade. A tabela diária é montada só quando aberta e o cache evita copiar dados para um estado extra. Na troca medida 7→90 dias houve commits de 21,9 e 28,4 ms; foco/Escape 14,8 e 11,8 ms. Sem teste de FPS nem prova de ausência de jank em celular físico. A observação de layout shift cobre apenas o primeiro segundo, não uma medição completa de Web Vitals. Alerta de bundle maior que 500 kB já existia; divisão de carregamento permanece trabalho separado.

## Demonstração reproduzível

1. Iniciar a API e frontend usando banco local/staging adequado. Abrir `/` com usuário autorizado.
2. Alternar rapidamente 7→30→90→7; confirmar período efetivo e totais na legenda.
3. Tab até as barras, conferir detalhes, Escape para fechar. Enter abre Histórico com tipo/datas.
4. No celular, selecionar intervalo e “Ver saídas”; conferir filtro e quantidade de registros, depois reload.
5. Abrir legenda do estoque e uma categoria, confirmar Produtos filtrados.
6. Abrir tabela diária; conferir que a soma bate com a legenda.
7. Ativar reduced-motion nas ferramentas de emulação do navegador ou preferência do SO e repetir a navegação. Esse passo ainda requer validação manual.

## Limites reais

Sem validação em celular físico, leitor de tela ou com equipe operacional. Preferência reduzida revisada em código, não emulada ao vivo. Performance de desenvolvimento com amostra pequena, sem comparação de FPS/CPU de produção. Galeria não é uma gravação e usa datas históricas do QA. A integração mantém auth, permissões, contratos antigos e gravações de estoque.

## Conferência da retomada — 14/10/2026

Fetch não encontrou novos commits na branch. Todos os gates passaram novamente, incluindo cinco testes reais de PostgreSQL isolado. API e frontend reiniciados; login local e consulta de 90 dias conferidos no navegador com calendário atual. Corrigida a grade até 1190 px: gráfico na segunda linha, atividade em largura completa abaixo e reposição sem altura mínima artificial. As capturas pareadas de 09/10 documentam a implementação inicial; o tablet dessa galeria antecede esta correção de grade. Evidência visual atual em `retomada-20261014.jpg`.

Os números comparativos de performance são da coleta de 09/10, antes do ajuste adicional de CSS no tablet. O bundle final foi inspecionado em 14/10: JS 1.095.848 bytes, CSS 102.695 bytes. `bundle-final.json` contém também compressões gzip em níveis explícitos; não misturar esses valores com os estimadores do Vite da coleta anterior. A imagem da retomada inclui a janela do aplicativo em sua largura disponível, sem representar uma nova captura exata de 1024x768.
