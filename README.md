# Sistema de Estoque

Este é um sistema de gerenciamento de estoque desenvolvido em PHP, utilizando MySQL para armazenamento de dados. Permite cadastrar produtos, registrar movimentos (entradas e saídas), gerar relatórios e alertas de estoque baixo.

## Funcionalidades

- **Produtos**: Adicionar, editar, excluir e visualizar produtos.
- **Movimentos**: Registrar entradas e saídas de produtos.
- **Relatórios**: Gerar relatórios de produtos e movimentos.
- **Comparativos**: Exportar comparativos de dados.
- **Alertas**: Notificações para produtos com estoque baixo.

## Tecnologias Utilizadas

- **Backend**: PHP
- **Banco de Dados**: MySQL
- **Frontend**: HTML, CSS, JavaScript
- **Servidor**: XAMPP (ou similar)

## Instalação

1. **Clone o repositório**:
   ```
   git clone https://github.com/seu-usuario/estoque.git
   cd estoque
   ```

2. **Configure o banco de dados**:
   - Importe o arquivo `estoque.sql` para o MySQL.
   - Atualize as configurações de conexão em `config/conexao.php`.

3. **Configure o servidor**:
   - Coloque a pasta do projeto no diretório `htdocs` do XAMPP.
   - Inicie o Apache e MySQL no painel de controle do XAMPP.

4. **Acesse o sistema**:
   - Abra o navegador e vá para `http://localhost/estoque`.

## Uso

- Navegue pelas seções: Produtos, Movimentos, Comparativos.
- Use os formulários para adicionar ou editar dados.
- Gere relatórios conforme necessário.

## Estrutura do Projeto

- `config/`: Arquivos de configuração (conexão, caminhos).
- `produtos/`: Páginas relacionadas a produtos.
- `movimentos/`: Páginas de movimentos de estoque.
- `comparativos/`: Funcionalidades de comparativos.
- `includes/`: Cabeçalho e rodapé.
- `css/`: Estilos CSS.
- `js/`: Scripts JavaScript.
- `estoque.sql`: Script do banco de dados.

## Contribuição

Sinta-se à vontade para contribuir com melhorias. Faça um fork, crie uma branch e envie um pull request.

## Licença

Este projeto é de código aberto. Consulte a licença para mais detalhes.