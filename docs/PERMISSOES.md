# Permissões por perfil — 08/10/2026

Matriz fechada com o usuário nesta rodada. OPERATOR também pode cadastrar produtos, conforme correção explícita do usuário. Custos e preços continuam visíveis aos três perfis.

| Ação | ADMIN | MANAGER | OPERATOR |
| --- | --- | --- | --- |
| Consultar painel, produtos, categorias e histórico | Sim | Sim | Sim |
| Cadastrar produto, inclusive entrada inicial | Sim | Sim | Sim |
| Editar produto, ativar/inativar | Sim | Sim | Não |
| Criar/editar/ativar/inativar categorias | Sim | Sim | Não |
| Registrar entrada/saída | Sim | Sim | Sim |
| Ajuste de entrada/saída ou motivo Ajuste de inventário | Sim | Sim | Não |
| Importar produtos, modelos e operações próprias | Sim | Sim | Não |
| Consultar, gerar, baixar e agendar backups | Sim | Não | Não |

## Implementação e contrato

- Política única em `packages/shared/src/permissions.ts`; `hasPermission` é consumido por interface/API e `canImportProducts` delega à mesma matriz. Perfil ausente/desconhecido é recusado.
- Rotas operacionais exigem sessão. Guards consultam o perfil atual do usuário no banco por requisição; o papel de um JWT antigo não concede acesso após rebaixamento. Usuário inativo perde acesso.
- Produtos/categorias/histórico/painel usam permissões explícitas no controller; backups exigem `backup.manage`. A importação mantém seu guard, a propriedade das operações e a revalidação na confirmação.
- Movimentos verificam também tipo/motivo para impedir ajuste via chamada direta disfarçada como entrada/saída. Nenhuma mudança na matemática, bloqueio por produto, saldo inicial ou auditoria.
- A interface oculta ações indisponíveis. Acesso direto às rotas de edição, importação e backups mostra aviso e retorno ao catálogo, sem montar os formulários privados. OPERATOR mantém Novo produto e leitura dos detalhes.
- O perfil da interface é atualizado pelo mecanismo existente de sessão (foco da janela e intervalo de 60 s). O bloqueio do servidor usa o perfil atual imediatamente, sem aguardar esse intervalo. Não há sincronização contínua nova nesta entrega.

Sem migration, reatribuição de papéis existentes, contas reais novas ou interface de administração de usuários. ADMIN acessa todas as funcionalidades existentes; isso não cria módulos futuros de configuração/usuários.

Testes/evidências/limites: [REVIEW.md](../artifacts/permissoes-20261008/REVIEW.md).
