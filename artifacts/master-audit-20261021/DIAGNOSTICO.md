# GAVYO Estoque — Fase 0: diagnóstico e plano para aprovação

Data: 21/10/2026. Base: `sistema-de-estoque-v2`, commit `dc0466a`. Servidor examinado: http://localhost:5173; API local 3000, banco de desenvolvimento atual. **Auditoria e planejamento: nenhuma correção de aplicação, migration, contratação ou migração executada.**

## 1. Parecer

A base já resolve as operações principais de estoque. Não recomendo reconstruir a interface nem instalar uma coleção de componentes. Há dois bloqueios para uso comercial seguro: alteração de unidade reinterpretando saldo/histórico e recuperação de dados sem backup operacional funcionando neste servidor. A criação de pedidos precisa de proteção contra repetição; a consulta de compras apresentou demora mensurável, mas sua causa ainda não foi isolada.

Para o frontend, a ordem recomendada permanece **Novo Pedido → Recebimento → Inventário**, com mudanças locais no fluxo, teclado e densidade. Busca remota, edição de quantidades/custos, estados de ação, gráficos e proteção de rascunhos já existem e devem ser aproveitados.

## 2. Escopo, fontes e segurança da auditoria

- Lidos o plano anexado, AGENTS.md, PROJECT_STATUS, DESIGN, PERMISSOES, IMPORTACAO_V1, INVENTARIO_FISICO, COMPRAS_V1 e BACKUPS; consultados documentos de imagens e relatórios de QA de 15 e 20/10.
- PDF de 21/10: texto extraído das 41 páginas e todas as páginas percorridas nas folhas de contato; telas prioritárias comparadas com as capturas atuais e código. As folhas de contato servem para visão de conjunto; o exame detalhado novo concentrou-se nas três tarefas prioritárias.
- Revisão de código focada em produto/unidade, compras/recebimentos, inventário, componentes compartilhados, autenticação/permissões e recuperação.
- Navegador: sessão ADMIN existente; pedido novo preenchido e descartado; recebimento parcial preenchido e revisado sem confirmar; inventário preenchido localmente e restaurado ao vazio sem salvar. Nenhum produto, pedido, recebimento ou contagem foi gravado nesta auditoria.
- Cinco GETs por endpoint para medir resposta HTTP; login normal separado para as medições. Nenhuma credencial foi salva nos artefatos.
- Não houve teste destrutivo, seed/reset, alteração de saldo, geração manual de backup ou simulação de queda no servidor compartilhado.
- Consulta remota via `git fetch origin`: HEAD e origin alinhados, **0 commits de diferença**. Nenhum commit posterior a dc0466a. Arquivos locais anteriores de relatórios, output e tmp preservados.

### Enquadramento de UX

Estágio: produto operacional existente. Superfície: gestão e execução de tarefas. Usuário principal: funcionário registrando pedido, entrega e contagem. Primeira decisão: identificar fornecedor/produto e operação. Prioridade informacional: produto/unidade, quantidade, consequência e confirmação. Recuperação: manter preenchimento, distinguir salvo de não salvo e consultar tentativas incertas. Mobile: alcançar quantidade e ação sem percorrer conteúdo redundante. Base recomendada: React/CSS e componentes atuais. Referências: comportamentos TanStack/shadcn, sem copiar identidade. Evitar: texto técnico, decoração, métricas inventadas, substituição de formulários e tabelas por preferência estética. Verificação: 1440×900, 1024×768 e 390×844, teclado e cenários locais sem gravação.

## 3. Inventário do que já está implementado

| Área | Situação encontrada | Preservar / limite |
|---|---|---|
| Acesso | Argon2id, cookie HttpOnly de 8h, limite de tentativas, origem e perfil atual consultado na API | Não refazer autenticação. Sem gestão completa de contas/recuperação/revogação individual de sessões |
| Produtos | Busca/paginação/ordenação remotas, cadastro/edição, categorias, imagem, detalhes e histórico de saldo | Saldo não editável por PATCH; unidade ainda precisa de proteção |
| Movimentações | Lookup, saldo previsto, razões contextuais no front, transação, lock e auditoria | Leitor USB físico não homologado; recebimento vinculado é um fluxo diferente |
| Histórico | Filtros, período, detalhes/autoria e filtro de produto identificado | Manter série auditada e recusa de histórico incompleto |
| Importação | CSV/XLSX, validação, erros e confirmação transacional | V1 cria novos produtos; 2.000 linhas/5 MB, categorias existentes |
| Compras | Fornecedores, rascunho, envio interno, revisão, entregas e cancelamento | 100 itens distintos; salvar/enviar não altera saldo e não envia e-mail |
| Recebimento | UUID/hash, locks, transação e recuperação de tentativa em sessionStorage | Não remover proteção existente. Sessão da aba não é persistência permanente |
| Inventário | Zero/vazio distintos, filtros, autoria, revisão, reconferência, ajustes auditados | 500 produtos, páginas de 25, lotes até 50; concluir exige ADMIN/MANAGER |
| Dashboard | Áreas, períodos, categorias, distribuição, tabela acessível e links reais | Conta registros/produtos, sem somar kg com unidades |
| Imagens | Upload e tratamento na API, Cloudinary e vinculação ao salvar | Backup do banco não inclui os arquivos de imagem |
| Aparência | Tema claro/escuro, 2 px, sidebar, motion discreto e componentes comuns | Não reabrir redesign global |
| Backups | Tela, agenda, geração/download e validação implementados | Nesta instalação há falhas por ferramentas indisponíveis |

Há trechos históricos contraditórios na documentação: AGENTS ainda descreve demonstração/local e ausência de upload; PROJECT_STATUS e contratos de compras/inventário conservam seções dizendo migrations pendentes, embora atualizações de 15/10 registrem implantação. O código e as notas datadas mais recentes prevalecem. Consolidar o estado atual em uma tarefa documental própria, preservando evidências históricas.

## 4. Problemas e prioridades

Legenda: **T** teste nesta rodada; **C** código atual; **H** reprodução histórica identificada; **V** captura atual; **HIP** hipótese; **P** proposta de produto. P0 bloqueia operação segura; P1 prejudica bastante ou bloqueia preparação comercial; P2 melhora operação; P3 acabamento.

| ID | Prioridade | Problema e evidência | Recomendação | Risco / aceite |
|---|---|---|---|---|
| INT-01 | P0 | **C + H:** patchProduct repassa unit sem conferir movimentos. Reprodução isolada de 20/10: 10 KG passam a 10 BOX e o movimento antigo retorna a unidade nova | Bloquear troca após qualquer movimento, inclusive saldo atual zero; orientar no formulário. Conversão auditada fica separada | Testar API direta, saldo zero com histórico, produto nunca movimentado e corrida com primeira movimentação. Nenhuma conversão silenciosa |
| REC-01 | P0 | **T/V:** Backups mostra 9 falhas, última em 21/10 13:29, por ferramentas indisponíveis | Configurar utilitários compatíveis e restaurar cópia em base separada; incluir fotos/configuração e cópia externa | Agenda ativa não significa cópia disponível. Aceite exige recuperação comprovada; esta rodada não tentou gerar/restaurar |
| PED-01 | P1 | **C:** novo pedido faz POST sem chave persistida; saveOrder sempre cria quando não há id. Trava de clique não deduplica nova tentativa após perda de resposta | Identificador de tentativa persistido antes do envio, unicidade e hash no servidor; retorno do pedido original em repetição equivalente | Duplicação após resposta perdida ainda não reproduzida nesta rodada. Não confundir com recebimento, que já é protegido |
| PERF-01 | P1 | **T/C:** 6 pedidos levam mediana 1.947 ms. Listagem inclui itens, produtos/categorias, recebimentos e movimentos | Instrumentar tempos de autorização, queries e serialização; medir volume representativo isolado; depois projeção resumida | Payload excessivo existe, mas ser a causa principal é **HIP**. Não migrar hospedagem ou contrato por suposição |
| OPS-01 | P1 antes do piloto | **C/P:** gestão de contas, recuperação e desligamento sem fluxo administrativo completo | Primeiro especificar criação/desativação, troca de papel, recuperação e sessões com o modelo atual | Desativação e papel atual já são validados. Logout remove cookie; não há revogação individual persistida para cada token |
| OPS-02 | P1 antes do piloto | **C/P:** ambiente depende de desenvolvimento local; implantação comercial sem homologação | Definir infraestrutura, HTTPS, reinício, volumes, monitoramento, rollback, suporte e aceite | Contratação/migração não autorizadas nesta fase |
| UX-01 | P2 | **T/V:** Enter no custo do pedido mantém foco; para voltar à busca é preciso navegar manualmente. Resumo aparece abaixo de todo o documento no celular | Fluxo opcional quantidade → custo → nova busca; hierarquia mais compacta; total e ação próximos da tarefa no mobile | Não enviar formulário ao pressionar Enter. Validar pedido com 20 itens antes de alegar ganho de velocidade |
| UX-02 | P2 | **T/V/C:** recebimento mostra solicitado/recebido/pendente, mas não calcula pendente depois da entrega. Informação do pedido se repete antes dos campos | Mostrar solicitado, recebido antes, agora e restante depois junto ao campo; detalhe superior recolhível com identidade/status visíveis | Entrega 10/4/2 deve mostrar restante 4. Manter consulta completa disponível |
| UX-03 | P2 | **T/C:** digitar 7 com pendente 6 marca erro e bloqueia revisão, mas ainda calcula saldo futuro usando valor inválido | Suprimir prévia inválida e informar máximo junto ao campo | Não houve gravação indevida: bloqueio da UI funcionou |
| UX-04 | P2 | **T/V:** inventário já tem contadores/estados, mas Enter na quantidade não avança. No celular ações ficam após todos os produtos | Próximo pendente por teclado, progresso com números, modo de foco por produto opcional e ações alcançáveis | Não salvar automaticamente nem esconder conflitos. Stepper é apoio; digitação continua principal |
| UX-05 | P2 | **C/P:** linhas de inventário expõem observação por produto, mesmo vazia, aumentando altura no celular | Revelar observação opcional sob demanda, mantendo as preenchidas visíveis | Testar notas longas, divergência e foco com teclado virtual real |
| UX-06 | P2 | **T/P:** painel já mostra produtos em atenção; faltam atalhos agregados de pedidos pendentes e contagens abertas | Área compacta de pendências com agregação própria e filtros reais | Proposta de produto; não extrair total global da página atual |
| DOC-01 | P2 | **C:** documentação mistura fases antigas e atuais | Estado atual curto com links para contratos e relatos datados | Evitar agente futuro refazendo recursos já entregues |
| POL-01 | P3 | **V/P:** grandes espaços antes de itens e repetição Fornecedor/título em Novo Pedido | Ajustar ritmo e retirar repetição visual mantendo label acessível | Sem alterar sidebar, cores, rotas ou 2 px |

### Reprodução e localização

1. **INT-01:** somente em banco isolado: criar 10 KG com entrada → editar unit=BOX → consultar produto e movimento. Histórico de reprodução: `../error-scan-20261020/REVIEW.md`. Código atual: `apps/api/src/inventory/inventory.service.ts`, método patchProduct, aproximadamente linhas 122–139. Não repetir no Neon para produzir evidência.
2. **REC-01:** ADMIN → Backups → último registro. Mensagem atual: ferramentas indisponíveis. Evidência: `backups-1440.jpg`; configuração em `apps/api/src/backups/backups.service.ts`, linhas 27–34 e tratamento de falhas aproximadamente 170.
3. **PED-01:** cenário de regressão proposto: proxy isolado deixa POST concluir e perde resposta → repetir mesmo formulário → verificar um único pedido. Código: PurchaseForm.tsx save e PurchasesService.saveOrder. Sem reprodução nova de duplicação.
4. **UX-01:** Compras → Novo pedido → fornecedor Aurora → buscar DEMO-001 → Enter → quantidade 2 → custo 12,50 → Enter. Foco permanece order-cost-0, total R$ 25,00. Sair solicita descarte. Nenhum pedido salvo.
5. **UX-02/03:** PC-000003 → recebimento do Papel A4: solicitado 10, recebido 4, pendente 6. Informar 7 → aria-invalid=true e revisão desabilitada; informar 2 → saldo previsto 50→52, mas restante da compra continua só “Pendente 6”. Revisão abre confirmação para 2 pct; confirmação não executada.
6. **UX-04/05:** inventário DEMO em andamento → Fita isolante pendente → digitar 0 → mostra divergência −87, contados 3/5 e “Não salvo”. Enter mantém foco. Campo depois limpo ao valor original; nada salvo.

## 5. Comparação das telas prioritárias

| Tarefa | Atual verificado | Proposta para protótipo posterior | Manter |
|---|---|---|---|
| Novo Pedido | Fornecedor remoto; busca nome/SKU/barcode; quantidade/custo editáveis na própria linha; subtotal e resumo. Uma linha ocupa ~280 px de altura no mobile | Cabeçalho mais compacto; cabeçalhos comuns no desktop; validação junto à célula; sequência de teclado até nova busca; resumo/ação alcançáveis no mobile | Decimais exatos, limite 100, produtos distintos, fornecedor, rascunho protegido e revisão |
| Recebimento | Tabela do pedido + repetição dos itens na conferência + histórico. Com 2 itens, captura mobile tem ~2.570 px de altura | Identificação/status compactos; pedido completo consultável sob demanda; campo com 10 solicitado / 4 anterior / 2 agora / 4 depois; revisão legível | UUID/payload, conferência após rede, limites, locks, entregas parciais e histórico |
| Inventário | Contadores reais, tabela/celular em blocos; zero/vazio e salvo/não salvo; filtros; observação em cada linha. Captura com 5 produtos tem ~2.799 px | Progresso real 3/5 (2 salvos + 1 local, explicitamente); próximo pendente; opcional modo de contagem focado; observação sob demanda; ações de fácil alcance | Decimal, lotes, contagem zero explícita, revisão, recontagem, permissão e confirmação de ajustes |

As alturas são capturas específicas, não benchmark nem prova de usabilidade ruim por si só. O problema é a distância entre ação, quantidade e próxima tarefa. Não foi cronometrado um funcionário preenchendo 20 produtos. A galeria compara o estado atual com recomendações em texto; **não há um novo layout aprovado ou aplicado**.

### Avaliação crítica

- **Manter:** identidade 2 px, grafite/azul, temas, navegação, componentes de diálogo/feedback, busca remota, tabelas responsivas, matemática exata, transações, locks e gráficos atuais.
- **Simplificar:** hierarquia do pedido, leitura das quatro quantidades do recebimento e avanço da contagem.
- **Remover por redundância:** títulos visuais duplicados; repetição permanente de todo o pedido acima da conferência; campos opcionais vazios com o mesmo peso da quantidade. Preservar acesso aos detalhes e labels acessíveis.
- **Implementar depois da aprovação:** proteção de unidade, criação idempotente de pedido, recuperação comprovada, protótipos pequenos e continuidade por teclado.
- **Adiar:** SKU automático, novo calendário, troca da biblioteca de gráficos/tabelas, módulo completo de contas, multiempresa e Lavanderia/EPI sem levantamento.
- **Bloqueiam piloto:** unidade, recuperação, implantação operacional, responsáveis/contas definidos e homologação mínima do cliente. Multiempresa bloqueia vários clientes na mesma instalação, não uma instalação independente para o primeiro.

## 6. Componentes: o que aproveitar e o que não instalar agora

| Componente do plano | Já existe? | Recomendação / impacto |
|---|---|---|
| Editable Data Table | Edição inline já existe em PurchaseForm com CSS grid | Adaptar linha existente. **TanStack Query está instalado; TanStack Table não consta no package.json web.** Não instalar Table apenas para duas células editáveis. Referência: https://tanstack.com/table/v8/docs/framework/react/examples/editable-data |
| Searchable Combobox | SearchCombobox.tsx: remoto, limites, estado, teclado e Escape | Preservar e testar carregamento/seleção em concorrência. Sem kit adicional. Referência: https://ui.shadcn.com/docs/components/aria/combobox |
| Quantity Stepper | Não existe neste fluxo | Protótipo local −/campo/+ apenas onde útil; incremento decimal definido por unidade/regra. Não disparar movimento nem transformar vazio em zero implicitamente. Inspiração de terceiro: https://www.shadcn.io/examples/stepper-button-group |
| Progress | Contadores reais já existem, sem barra visual nesse editor | Barra simples com semântica acessível e contagem salva separada do rascunho. Sem dependência. https://ui.shadcn.com/docs/components/base/progress |
| Empty State | DataState e empty-state já existem | Reaproveitar com ação contextual e distinção de erro/ausência/filtro. https://ui.shadcn.com/docs/components/base/empty |
| Date Range Picker | PeriodSelector com atalhos e datas já existe | Manter. Calendário novo depende de dificuldade real comprovada. https://ui.shadcn.com/docs/components/aria/calendar |
| Field / FieldError | Compartilhados e usados nos formulários | Consolidar aplicação e foco, sem uma segunda infraestrutura. https://ui.shadcn.com/docs/components/base/field |
| Keyboard Shortcuts | Ctrl K, Escape e seleção por Enter existentes | Adicionar apenas continuidade da tarefa aprovada; Enter não salva implicitamente. https://ui.shadcn.com/docs/components/base/kbd |
| Stateful Button | Componente próprio já aplicado a várias mutações e ConfirmDialog | Preservar estado real da API. Não importar pacote de animação para reproduzi-lo. https://ui.aceternity.com/components/stateful-button |

As referências foram abertas nesta rodada. Shadcn.io é referência de terceiro, distinta da documentação shadcn/ui. Nenhum exemplo foi instalado nem medido como bundle do projeto. Para adaptações próprias, a proposta é **zero dependências novas**; custo real do bundle será medido quando houver implementação.

## 7. Desempenho: medições e hipóteses

Cinco consultas sequenciais autenticadas por rota, diretamente à API local conectada ao ambiente atual, sem cache de browser e sem concorrência de carga controlada. Tempo inclui autenticação, API, acesso ao banco e transferência local. Bytes são do JSON recebido sem medir compressão de produção. Resultados em `metrics.json`.

| Rota (página 1, limite 20) | Registros | JSON | Mín.–máx. | Mediana |
|---|---:|---:|---:|---:|
| purchase-orders | 6 de 6 | 25.014 bytes | 1.924–2.003 ms | 1.947 ms |
| products | 20 de 31 ativos | 14.429 bytes | 670–708 ms | 687 ms |
| physical-inventories | 3 de 3 | 2.065 bytes | 1.122–1.156 ms | 1.132 ms |

Conclusão comprovada: há espera de dados mesmo em resposta pequena; não é apenas sensação de animação travando. Compras inclui dois conjuntos de recebimentos na listagem. **Não comprovado:** que 25 KB expliquem ~2 s, que Neon/Hostinger sejam o gargalo, ou que trocar servidor resolva. Inventário leva >1 s com apenas 2 KB, reforçando a necessidade de separar round-trips e execução SQL.

Próxima medição: tempo por query/autenticação, execução SQL, número de viagens ao banco, serialização e renderização no browser; cenários isolados com muitos pedidos/itens/entregas; verificar requisições canceladas/repetidas durante filtro, consumo de conexão e p95. O código já tem debounce, cancelamento por AbortSignal e invalidação; não concluir que existem requests duplicados sem contá-los. Tempo de renderização e teclado virtual real não foram medidos nesta rodada.

## 8. Segurança, recuperação e implantação

O código preserva validação de origem, cookie HttpOnly/SameSite, Secure em produção, hash Argon2id, limite de login e revalidação de perfil/usuário ativo. Isso não equivale a auditoria de segurança completa ou teste de invasão. Contas de desenvolvimento não devem ir para o cliente. Definir acesso/recuperação/desligamento antes do piloto e tratar revogação por sessão como decisão própria, sem refazer auth.

Backups precisam de utilitários PostgreSQL compatíveis, arquivo privado persistente, cópia externa, rotina observada, alertas e restauração isolada de banco + verificação das imagens. Backup antigo de migration e testes históricos isolados não provam que o automático de hoje funciona. O checklist deve registrar última cópia válida, teste de restauração, responsável, frequência e perda de dados aceitável definida com o cliente.

### Alternativas a aprofundar na rodada de infraestrutura

| Alternativa | Benefício | Custo operacional / risco | Recomendação nesta fase |
|---|---|---|---|
| A: VPS app/API + Neon + Cloudinary + cópia externa | Menor migração da base atual | Vários fornecedores; latência banco/API precisa medir; custos/quota de cada plano | Candidata para implantação com menor mudança |
| B: VPS app/API/PostgreSQL + storage externo + cópia externa | Aproxima banco e API, concentra operação | Equipe assume PostgreSQL, atualização, capacidade e recuperação | Comparar após métricas e responsabilidades definidas |
| C: app/API gerenciados + banco/storage externos | Menos administração de SO | Compatibilidade com processos persistentes, agenda, ferramentas de backup e preços por uso | Só escolher após validar arquitetura e custo total |

Preferência por centralização é válida, mas não autoriza migração automática de fotos/banco. Teto informado: **R$ 120/mês**, preferindo cobrança mensal real. O valor mensal equivalente anunciado na página da Hostinger não comprova cobrança mensal nem total final; consultar checkout sem contratar, renovação, backups externos, domínio, impostos e eventuais serviços pagos. Fonte consultada: https://www.hostinger.com/br/servidor-vps . Não há orçamento fechado nem garantia de caber no teto. A página comercial consultada não substitui esta comparação detalhada.

Antes de vários clientes: escolher instalação/banco por cliente ou isolamento completo. Não há entidade de empresa delimitando todos os dados no schema atual. Para lavanderia/EPI, entrevistar sobre peças, identificação, venda/locação, retorno, lavagem, perdas, responsáveis e usuários simultâneos antes de modelar; manter separado do estoque genérico.

## 9. Execução incremental e aprovações

### Primeira rodada recomendada: integridade da unidade, escopo limitado

1. Regra proposta para aprovar: produto com qualquer movimentação não troca unidade, mesmo com saldo zero. Produto sem histórico e sem saldo pode trocar. Sem conversão automática, correção retroativa de saldo ou atualização em massa.
2. Implementar validação na transação da API sob o mesmo lock do produto e erro específico; impedir edição incoerente no formulário e explicar como cadastrar um item com outra unidade.
3. Testar em PostgreSQL **isolado**: API direta, unidade igual, produto virgem, estoque inicial, saldo zerado com histórico, movimentação concorrente, pedido/recebimento e inventário já abertos. Verificar que histórico/saldo permanecem inalterados nas recusas.
4. Gates: testes relevantes + integrações isoladas, lint/typecheck/build e diff; UI nas três resoluções; commit focado somente após revisão. Nenhuma migration real prevista para o bloqueio simples; eventual snapshot histórico fica em escopo separado.

**Aceite:** nenhuma mudança de unidade reinterpreta quantidades existentes; backend rejeita bypass de UI; não perde rascunho; cadastro sem histórico continua utilizável. Esta rodada ainda não foi iniciada.

### Rodadas seguintes, com entregas independentes

1. **Recuperação:** diagnóstico de ferramentas, cópia verificada e restore isolado. Configuração/gravações reais e destino de cópia externa precisam de escopo e autorização específicos.
2. **Pedido seguro:** reproduzir resposta perdida em ambiente isolado, definir identificador/hash e implementar criação idempotente com testes de repetição/conflito/reload. Revisar qualquer migration antes de aplicar no banco compartilhado.
3. **UX para comparar:** protótipos GAVYO de Novo Pedido, Recebimento e Inventário, sem instalar kits. Aprovar um módulo por vez antes de mudança estrutural.
4. **UX integrada e performance:** implementar componentes aprovados, preservar contratos, medir antes/depois, testar teclado/mobile/erros/perfis e pedidos de 20 itens.
5. **Homologação e infraestrutura:** comparar custos reais das alternativas, definir plano de contas/suporte, HTTPS, rollback e recuperação. Só contratar/migrar após aprovação.
6. **Primeiro cliente:** dados fornecidos pelo cliente em ambiente de homologação, treinamento, aceite e operação assistida. EPI e multiempresa têm planejamento próprio.

Decisões a aprovar: regra de unidade; escopo da criação idempotente; desenho de cada uma das três telas; eventual pacote novo; política de acesso a custos/preços; gestão de contas; plano de infraestrutura e migração. Nenhuma instalação, migration compartilhada, contratação ou publicação está implícita no relatório.

## 10. Roteiro de homologação com pessoa real

Usar catálogo fictício ou cópia autorizada em ambiente separado. Não orientar durante a primeira tentativa; registrar conclusão, tempo, erros, hesitações e ajuda necessária.

| Tarefa | Evidência de aceite |
|---|---|
| Encontrar produto e cadastrar outro | Identifica SKU/unidade e obrigatórios, encontra o salvo após reload |
| Registrar entrada e saída | Entende saldo antes/depois, motivo, insuficiência e autoria |
| Montar pedido de 20 produtos | Escolhe fornecedor, corrige quantidade/custo, remove item e revisa total sem duplicar |
| Receber parcialmente | Distingue solicitado/antes/agora/depois e encontra a entrada vinculada no Histórico |
| Contar estoque | Distingue vazio/zero, salvo/local, divergência e recontagem; sabe quem conclui |
| Consultar autoria | Encontra responsável e efeito do movimento sem precisar ler UUID |
| Falha de conexão | Entende resultado incerto, preserva dados e consulta antes de repetir |
| Restaurar em ambiente isolado | Responsável confere saldos, auditoria, contas e fotos; registra tempo e perdas aceitáveis |

## 11. Validação executada e limites

- `pnpm test`: **82 aprovados da API, 3 integrações PostgreSQL ignoradas; 29 aprovados do frontend; zero falhas**. Log: `tests.log`.
- Navegação/rascunhos/recebimento inválido/revisão/zero e vazio no inventário observados nesta rodada, sem gravar operações.
- Três telas prioritárias capturadas em **1440×900, 1024×768, 390×844**, sem overflow horizontal do documento nos estados inspecionados. Em 1024 e 390 não foi cronometrado fluxo completo.
- Console observado: sem erros ou avisos capturados nessa aba. Isso não cobre todas as sessões/rotas.
- Não repetidos nesta rodada: login inválido, duplicidade SKU/barcode, saída acima de saldo, concorrência HTTP/SQL e resposta perdida; há evidências históricas identificadas nos relatórios, sem alegar nova execução.
- Não executados: novos recebimentos, conclusão de inventário, escrita comercial, restore, teste físico de scanner, leitor de tela real, todos os perfis, modo claro nas três tarefas, rede lenta/queda real, inspeção de infraestrutura externa, renderização cronometrada e homologação do cliente.
- Build/lint/typecheck não repetidos porque não houve edição de implementação; aprovação anterior está no PDF e relatórios. Esta auditoria não usa compilação como prova de fluxo completo.
- Só foram criados documentos, capturas, métricas e log de testes nesta pasta. Arquivos da aplicação preservados; sem commit/push nesta etapa.

Capturas de página inteira podem reposicionar elementos fixos em relação ao scroll durante composição, incluindo sidebar/link de pular conteúdo. Não diagnosticar bug de posicionamento apenas por essas imagens. O achado responsivo é sobre o conteúdo da tarefa e sua extensão; reprodução visual em viewport é necessária antes de alterar Shell/sidebar.

## 12. Fontes principais

- Plano mestre anexado pelo usuário; PDF `output/pdf/GAVYO-documentacao-completa-2026-10-21.pdf` (41 páginas, corte dc0466a).
- Documentos e caminhos de implementação citados nas seções anteriores.
- `artifacts/error-scan-20261020/REVIEW.md`: reprodução isolada de unidade e riscos de compras.
- `artifacts/frontend-scan-20261020/REVIEW.md`: achados anteriores; os já corrigidos não foram reabertos como problemas novos.
- `artifacts/frontend-fixes-20261020/REVIEW.md`, `artifacts/connection-errors-20261020/REVIEW.md`: correções publicadas.
- `artifacts/six-components-20261015/REVIEW.md`: componentes, cobertura PostgreSQL histórica e limites.
- Referências públicas dos componentes e Hostinger abertas em 21/10, listadas com URLs nas seções 6 e 8.

**Fase 0 encerrada para revisão. Próxima implementação recomendada: INT-01, mediante aprovação do usuário.**
