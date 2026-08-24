Instruções macOS para configurar o Sistema de Estoque

Requisitos: Homebrew (recomenda-se), terminal zsh.

1) Instalar Homebrew (se necessário)

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

2) Instalar PHP e MySQL via Homebrew

brew update
brew install php mysql

3) Iniciar MySQL (serviço)

brew services start mysql

Após a primeira instalação do MySQL, pode ser necessário executar:

mysql_secure_installation

4) Criar a base de dados e aplicar o schema de autenticação

# Criar DB se não existir
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS estoque CHARACTER SET utf8 COLLATE utf8_general_ci;"

# Importar o arquivo auth.sql
mysql -u root -p estoque < /Users/joaopedro/sistema-de-estoque/auth.sql

Observação: ajuste o path acima se o repositório não estiver em /Users/joaopedro/sistema-de-estoque.

5) Ajustar credenciais de conexão

O arquivo `config/conexao.php` lê variáveis de ambiente:

- DB_HOST (padrão: 127.0.0.1)
- DB_PORT (opcional)
- DB_NAME (padrão: estoque)
- DB_USER (padrão: root)
- DB_PASS (padrão: vazio)
- DB_SOCKET (opcional)

Exemplo (export temporário no terminal):

export DB_USER=root
export DB_PASS=suasenha
export DB_NAME=estoque

6) Rodar servidor de desenvolvimento PHP (mapeando /Estoque)

Para servir o caminho `/Estoque` (mantendo os links absolutos do projeto), execute o servidor embutido a partir do diretório usuário:

cd /Users/joaopedro
php -S localhost:8000 -t .

Acesse: http://localhost:8000/Estoque/login.php

7) Criar o primeiro administrador

Acesse no navegador: http://localhost:8000/Estoque/criar_admin.php
Crie o usuário administrador e então remova o arquivo `criar_admin.php` do servidor (importante).

8) Testar login e logout

- Login: http://localhost:8000/Estoque/login.php
- Logout: http://localhost:8000/Estoque/logout.php

9) Observações de segurança

- Troque a senha do usuário MySQL e atualize `DB_PASS`.
- Remova `criar_admin.php` após uso.
- Em produção, configure um servidor web (Apache/Nginx) e HTTPS.

Se quiser, eu posso criar um pequeno script `setup_mac.sh` que automatiza os passos 2-4. Deseja que eu gere esse script agora?