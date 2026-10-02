# Login V2 — integração e referência aprovada

Data: 01/10/2026. Branch: `sistema-de-estoque-v2`.

## Resultado

Autenticação da branch `feat/auth` integrada sobre o frontend remoto refinado (`9e35c5a`), preservando o catálogo, formulários, movimentações de demonstração e histórico. Conflito limitado ao App: combinar imports, sessão do usuário e rotas privadas com `DemoCatalogProvider` dentro do shell protegido. O catálogo em memória é descartado ao sair.

Referência aprovada pelo usuário **para a tela de login**: [Inventory Management — Alex Tsibulski / Dopamine](https://dribbble.com/shots/5489408-Inventory-Management). Reutilizar barra superior, faixa lateral estreita, organização por divisores, campos alinhados e coluna contextual. Tokens escuros existentes, destaque azul e indicação laranja de acesso restrito. Os ícones laterais são contexto visual, sem links ou controles inativos. Mobile reorganiza o formulário em coluna e reduz o contexto.

Login mantém React Hook Form/Zod, labels, autocomplete, foco, toggle de senha, erros inline, loading e submit pelo teclado. Sem registro, recuperação de senha ou novas funcionalidades de estoque.

## Validação técnica

Node 22.23.3 e pnpm 11.24.0, instalados somente em diretório temporário para os comandos desta rodada; versões do projeto e lockfile preservados.

- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS.
- `pnpm test`: PASS, 20 testes, zero falhas.
- `pnpm build`: PASS. Dois avisos de anotação PURE da dependência Zod removida pelo Rollup, sem falha; nenhuma atualização de dependência aplicada.
- `git diff --check`: PASS.
- Revisão do módulo: sem armazenamento de token em localStorage/sessionStorage, sem JWT/hash no corpo de resposta, sem segredo fallback/logs de credenciais; validação de papel no backend.

Typecheck/build receberam somente uma DATABASE_URL local de desenvolvimento para gerar o Prisma Client; isso não comprova conexão ao banco.

## Revisão no navegador

Revisão visual em 1440×900, 1024×900, 390×844 e 320×740. Sem overflow horizontal nas quatro larguras.

Fluxo exercitado com a API Nest/AuthModule real e um repositório temporário de usuário em memória, equivalente ao isolamento usado nos testes existentes. Cookie, Argon2id, guards, Origin e requisições do frontend são reais. Nenhum mock/bypass foi adicionado à aplicação. O servidor temporário foi encerrado e seu arquivo removido ao terminar.

Verificado:

- Campos obrigatórios e e-mail inválido; foco no primeiro erro e associações acessíveis.
- Mostrar/ocultar senha, foco e sequência de Tab até Entrar.
- Senha incorreta: mensagem genérica, e-mail preservado e senha limpa.
- Envio pelo teclado, botão Entrando desabilitado, login válido e usuário/role no shell.
- Recarregar preserva sessão; `/login` autenticado redireciona para `/`.
- Usuário inativo perde acesso à sessão existente e não consegue entrar.
- Logout retorna a `/login`; `/products/new` sem sessão continua bloqueada.
- API desligada mostra falha de verificação da sessão e ação Tentar novamente.

Os testes HTTP também cobrem sessão ausente/inválida/expirada, RBAC, CORS/Origin, rate limit, cookie e ausência de dados sensíveis nas respostas. Não foi criada uma nova stack de testes frontend.

## Capturas

- `login-desktop.jpg`: estado inicial 1440×900.
- `login-1024.jpg`: largura intermediária.
- `login-mobile.jpg`: estado inicial 390×844.
- `login-320.jpg`: largura mínima.
- `login-error-desktop.jpg` e `login-error-mobile.jpg`: credenciais rejeitadas.
- `server-unavailable.jpg`: API indisponível.

## Limites e configuração

PostgreSQL real, migration e seed continuam sem validação nesta máquina. Docker existe, mas o usuário do processo não tem acesso ao socket do daemon. Não houve instalação nem alteração de permissões do sistema. Para operação local, configurar `.env` conforme README, iniciar PostgreSQL/API, aplicar migration e seed.

Autenticação exige `JWT_SECRET`, `WEB_ORIGIN` e `VITE_API_URL`; NODE_ENV determina cookie Secure. Nenhum segredo real foi versionado. Produtos e movimentos permanecem demonstração em memória; a aprovação desta referência não autoriza redesenho dessas telas.
