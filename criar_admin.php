<?php
// ATENÇÃO: ESTE ARQUIVO DEVE SER REMOVIDO DO SERVIDOR IMEDIATAMENTE APÓS CRIAR O PRIMEIRO ADMINISTRADOR.
$root = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';
include_once $root . '/config/conexao.php';

$mensagem_sucesso = '';
$erro = '';
$admin_existe = false;

try {
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM usuarios WHERE perfil = 'admin'");
    $admin_existe = $stmt->fetch()['total'] > 0;
} catch (PDOException $e) {
    die('Erro ao verificar usuários administradores.');
}

if (!$admin_existe && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $nome = trim($_POST['nome'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $senha = $_POST['senha'] ?? '';

    if ($nome === '' || $email === '' || strlen($senha) < 8) {
        $erro = 'Preencha todos os campos e use uma senha com pelo menos 8 caracteres.';
    } else {
        try {
            $senha_hash = password_hash($senha, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, 'admin')");
            $stmt->execute([$nome, $email, $senha_hash]);

            $mensagem_sucesso = 'Administrador criado com sucesso. Apague este arquivo do servidor imediatamente após o uso.';
            $admin_existe = true;
        } catch (PDOException $e) {
            if ($e->errorInfo[1] === 1062) {
                $erro = 'Este e-mail já está em uso.';
            } else {
                $erro = 'Ocorreu um erro ao criar o administrador. Tente novamente.';
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Criar Administrador - Sistema de Estoque</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/Estoque/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body class="bg-light">
    <div class="container py-5">
        <div class="row justify-content-center">
            <div class="col-md-7 col-lg-6">
                <div class="card shadow-sm">
                    <div class="card-body">
                        <h3 class="card-title mb-3 text-center">Criar Administrador</h3>
                        <div class="alert alert-warning">
                            Este arquivo deve ser removido do servidor imediatamente após criar o primeiro administrador.
                        </div>

                        <?php if ($admin_existe): ?>
                            <div class="alert alert-info">
                                Já existe pelo menos um administrador cadastrado. A criação de novos administradores deve ser feita diretamente no banco de dados ou por outro caminho seguro.
                            </div>
                        <?php else: ?>
                            <?php if ($mensagem_sucesso): ?>
                                <div class="alert alert-success"><?php echo htmlspecialchars($mensagem_sucesso); ?></div>
                            <?php endif; ?>

                            <?php if ($erro): ?>
                                <div class="alert alert-danger"><?php echo htmlspecialchars($erro); ?></div>
                            <?php endif; ?>

                            <form method="POST" novalidate>
                                <div class="mb-3">
                                    <label for="nome" class="form-label">Nome</label>
                                    <input type="text" class="form-control" id="nome" name="nome" required>
                                </div>
                                <div class="mb-3">
                                    <label for="email" class="form-label">E-mail</label>
                                    <input type="email" class="form-control" id="email" name="email" required>
                                </div>
                                <div class="mb-3">
                                    <label for="senha" class="form-label">Senha</label>
                                    <input type="password" class="form-control" id="senha" name="senha" minlength="8" required>
                                    <div class="form-text">Use pelo menos 8 caracteres.</div>
                                </div>
                                <button type="submit" class="btn btn-primary w-100">
                                    <i class="fas fa-user-shield"></i> Criar Administrador
                                </button>
                            </form>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
