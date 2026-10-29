# Demo GAVYO Estoque – Lavanderia de EPI

Demonstração presencial, rodando no notebook. Dados fictícios de uma lavanderia industrial que vende e aluga EPI: 19 produtos, 6 clientes, 2 fornecedores, ~60 dias de movimentações e pedidos de compra.

## 1. Preparar (uma vez, na véspera)

Pré-requisitos: Docker rodando, Node 22, pnpm.

```
cp .env.example .env
```

No `.env`, ajuste:

- `JWT_SECRET`: 32+ caracteres aleatórios (`openssl rand -hex 32`).
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`: login usado na apresentação.
- `BACKUP_AUTO_ENABLED=false`: evita backup automático durante a demo.
- `WEB_ORIGIN=http://localhost:5173` (padrão; o `demo:start` usa essa porta).

```
pnpm install
pnpm demo:reset
```

`demo:reset` **apaga o banco local**, recria, aplica migrations, cria o admin e gera os dados da lavanderia. Pode rodar de novo sempre que quiser voltar ao estado inicial da demo; o resultado é sempre o mesmo.

## 2. Rodar no dia

```
pnpm demo:start
```

Faz o build de produção e sobe API + front em http://localhost:5173 (sem overlay de erro do Vite). Para desenvolvimento normal continue usando `pnpm dev`.

## 2b. Alternativa: GitHub Codespaces (sem instalar nada no notebook)

Útil quando o notebook não roda Docker/Node atuais (ex.: macOS 11). Tudo roda numa máquina Linux do GitHub; no notebook só o navegador.

1. No GitHub, no repositório, escolha a branch e clique em **Code → Codespaces → Create codespace**. Use máquina de 4 núcleos.
2. Com o `.devcontainer` no repositório, o Codespace já instala dependências e cria o `.env` (origem correta, `JWT_SECRET`, backup desligado). Sem ele, rode no terminal: `corepack enable && pnpm install && node .devcontainer/setup-env.mjs`.
3. `pnpm demo:reset` e depois `pnpm demo:start`.
4. Abra a porta **5173** pela aba **Ports** (não use a 3000: o front chama `/api` pelo proxy do Vite, mantendo front e API na mesma origem).
5. Para apresentar, deixe o Codespace ligado e a aba aberta antes do cliente chegar. Codespaces desligam após ~30 min sem uso; ao religar, rode só `pnpm demo:start`.

## 3. Roteiro (~15 min)

A ordem conta uma história: "como está o estoque → o que está acabando → como repor → quem compra".

1. **Login** (`/`). Entrar já com a sessão aberta antes do cliente chegar; mostrar o login só se perguntarem sobre acesso.
2. **Dashboard** (`/`). Gráfico de entradas x saídas dos últimos dias, itens críticos e atividade recente.
   - Fala: "Em um olhar você sabe o que entrou, o que saiu e o que está acabando."
   - Apontar os itens abaixo do mínimo: luva nitrílica G, bota PVC nº 42, máscara descartável, alvejante.
3. **Produtos** (`/products`). Filtrar por categoria "Proteção das mãos"; abrir a luva nitrílica G e mostrar estoque, mínimo, custo e preço.
   - Mostrar a busca global achando um item pelo nome.
4. **Movimentações** (`/movements`). Registrar **ao vivo** uma venda: 10 respiradores PFF2 para o Hospital São Lucas.
   - Voltar ao dashboard e mostrar que o número mudou na hora.
5. **Histórico** (`/history`). Filtrar pela bota PVC nº 40: aparecem saídas para aluguel, devoluções e uma perda por peça danificada.
   - Fala: "Toda peça que sai e volta fica registrada, com quem fez e quando."
6. **Compras** (`/purchases`). Mostrar o pedido **Enviado** de reposição urgente (itens críticos) e um pedido **Recebido** antigo.
   - Se der tempo, registrar o recebimento parcial do pedido enviado ao vivo e ver o estoque subir.
7. **Clientes** (`/customers`). Abrir o Hospital São Lucas e mostrar o histórico de compras dele.
8. **Fornecedores** (`/suppliers`). Nordeste EPI e Química Limpa.
9. **Fechamento**: inventário físico (`/physical-inventories`), importação por planilha (`/products/import`) e backups como recursos de segurança/implantação.

### Perguntas prováveis

- **"Controla aluguel?"** Hoje registra saída para aluguel e devolução com observação e cliente. Controle de contratos, prazos e cobrança de aluguel é o próximo módulo do roadmap. Não prometer data sem combinar.
- **"Funciona no celular?"** O layout é responsivo; mostrar redimensionando a janela se precisar.
- **"Consigo importar o que já tenho?"** Sim, importação de produtos por planilha.
- **"E se perder os dados?"** Backups completos agendados (semanal/mensal) com restauração.
- **"Mais de um usuário?"** Sim, com perfis Admin, Gerente e Operador.

## 4. Checklist do dia

- [ ] `pnpm demo:reset` rodado de manhã (dados frescos, datas relativas a hoje).
- [ ] `pnpm demo:start` no ar e login feito.
- [ ] Roteiro ensaiado uma vez de ponta a ponta.
- [ ] Notebook na tomada, suspensão e notificações desligadas.
- [ ] Navegador em janela limpa, zoom 110–125% se for projetar.
- [ ] Plano B: vídeo curto gravado do roteiro.

## 5. Problemas comuns

| Sintoma | Causa provável | Ação |
|---|---|---|
| Login falha / 403 nas chamadas | `WEB_ORIGIN` diferente da porta do front | Deixar `http://localhost:5173` e reiniciar |
| "Dados de demo já existem" | Script já rodou nesse banco | `pnpm demo:reset` |
| `docker compose up --wait` falha | Docker parado ou porta 5432 ocupada | Abrir o Docker / parar outro Postgres |
| Erro de porta 5173 em uso | `pnpm dev` ainda aberto | Fechar o outro processo |
| Codespace: login volta para a tela inicial | `WEB_ORIGIN` não é a URL da porta 5173 | Rodar `node .devcontainer/setup-env.mjs` e reiniciar o `demo:start` |
