# Reconexão e apresentação de erros — 20/10/2026

- Frontend 5173 e API 3000 estavam sem listener. Reiniciados em processos ocultos independentes do terminal da conversa. Health da API e página de login retornaram HTTP 200.
- Aviso de falha ao atualizar sessão foi retirado de fora do Shell e posicionado dentro de main, após o título. O conteúdo da página permanece montado.
- Botão Reconectar consulta sessão e refaz consultas ativas, sem repetir mutations ou submissões de formulários.
- Alertas agora separam texto e ação em desktop; no celular a ação fica abaixo. Acrescentado respiro entre erro de dados e conteúdo mantido em cache.
- Sem mudanças no banco, credenciais, permissões ou autenticação da API.

## Verificação

Build TypeScript/Vite, lint e 29 testes do frontend aprovados. Aviso de tamanho de bundle já existente permanece.

Simulação de indisponibilidade em frontend separado 5175 com proxy loopback 3013, sem interromper o servidor normal. Proxy de teste permite GET e autenticação, bloqueando gravações de negócio. Nenhum dado foi salvo durante a simulação.

Conferidos erro com cache, aviso de sessão após revalidação, alternativa de recuperação e mobile 390×844. Aviso de sessão dentro de main: borda esquerda 254 px, sidebar termina em 218 px; nenhuma sobreposição. Mobile: documento 385 px para viewport 390 px, sem transbordamento horizontal.

Screenshots erro-desktop.jpg e erro-mobile.jpg registram falha simulada. A simulação foi desativada e Reconectar acionado ao final. Servidor normal não foi parado durante o teste.
