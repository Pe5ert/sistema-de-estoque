# Dados fictícios para testar o frontend — 20/10/2026

Inseridos pela API do servidor normal http://localhost:3000/api, visíveis em http://localhost:5173. Carga autorizada pelo usuário; sem reset, seed de usuários, migrations ou mudanças de credenciais.

- 30 produtos, SKUs DEMO-001 até DEMO-030, em 6 categorias com prefixo DEMO.
- 27 ativos e 3 inativos; exemplos zerados, abaixo do mínimo, saldo normal, preços ausentes e unidades variadas. Quatro imagens SVG locais.
- 5 fornecedores com sufixo DEMO, sendo 4 ativos e 1 inativo. E-mails reservados example.test; nenhum documento, endereço ou contato real.
- 6 pedidos: 2 rascunhos, 1 enviado, 1 parcialmente recebido, 1 recebido e 1 cancelado. Recebimentos movimentaram exclusivamente produtos DEMO.
- 3 inventários restritos à categoria DEMO · Ferramentas: em contagem (2/5), concluído (5/5 sem ajuste de saldo) e cancelado.
- Entradas e saídas fictícias de hoje alimentam Dashboard e Histórico. Não foram retrodatadas movimentações.

Total após a carga: 34 produtos. Os anteriores mantiveram seus saldos: CAB-USB-C-1M=24, CX-ORG-M=0, FITA-EMB-48=30, QA-20261002-01=10. Nenhum registro anterior foi editado.

Para testar: busque DEMO em Produtos; alterne Ativos/Inativos/Todos; experimente filtros de estoque, paginação, detalhes e edição. Em Compras, os seis pedidos cobrem todas as situações. O login existente permanece válido.

Manifesto de IDs da carga disponível localmente em var/backups/front-demo-20261020-manifest.json (ignorado pelo Git). Não remover por nome genérico nem excluir categorias ou registros anteriores; compras, recebimentos e movimentos possuem vínculos e exigem tratamento cuidadoso em eventual limpeza futura.

Conferidos no navegador: catálogo com 30 registros DEMO em duas páginas, imagens carregadas, cinco estados de pedidos, três estados de inventário e Dashboard após reload. Evidências JPEG nesta pasta.
