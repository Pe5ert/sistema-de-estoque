<?php
$root = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';
include_once $root . '/config/conexao.php';
require_once $root . '/config/auth.php';
requireAdmin();

$nome = '';
$email = '';
$perfil = 'operador';
$erro = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrfCheck();

    $nome = trim($_POST['nome'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $senha = $_POST['senha'] ?? '';
    $confirmacao = $_POST['confirmacao_senha'] ?? '';
    $perfil = $_POST['perfil'] ?? 'operador';

    if (strlen($senha) < 8) {
        $erro = 'A senha deve ter pelo menos 8 caracteres.';
    } elseif ($senha !== $confirmacao) {
        $erro = 'A senha e a confirmação devem ser iguais.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $erro = 'Informe um e-mail válido.';
    }

    if (!$erro) {
        $senha_hash = password_hash($senha, PASSWORD_DEFAULT);
        try {
            $stmt = $pdo->prepare("INSERT INTO usuarios (nome, email, senha, perfil, ativo, criado_em) VALUES (?, ?, ?, ?, 1, NOW())");
            $stmt->execute([$nome, $email, $senha_hash, $perfil]);
            header('Location: index.php?sucesso=usuario_criado');
            exit;
        } catch (PDOException $e) {
            if ($e->errorInfo[1] === 1062) {
                $erro = 'Este e-mail já está cadastrado.';
            } else {
                $erro = 'Erro ao cadastrar usuário.';
            }
        }
    }
}
?>

<?php include '../includes/header.php'; ?>

<div class="container-fluid">
    <div class="card shadow mb-4">
        <div class="card-header bg-primary text-white">
            <h4 class="m-0"><i class="fas fa-user-plus"></i> Adicionar Usuário</h4>
        </div>
        <div class="card-body">
            <?php if ($erro): ?>
                <div class="alert alert-danger"><?php echo htmlspecialchars($erro); ?></div>
            <?php endif; ?>

            <form method="POST">
                <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars(csrfToken()); ?>">
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label for="nome" class="form-label">Nome</label>
                        <input type="text" class="form-control" id="nome" name="nome" value="<?php echo htmlspecialchars($nome); ?>" required>
                    </div>
                    <div class="col-md-6">
                        <label for="email" class="form-label">E-mail</label>
                        <input type="email" class="form-control" id="email" name="email" value="<?php echo htmlspecialchars($email); ?>" required>
                    </div>
                </div>

                <div class="row mb-3">
                    <div class="col-md-6">
                        <label for="senha" class="form-label">Senha</label>
                        <input type="password" class="form-control" id="senha" name="senha" minlength="8" required>
                    </div>
                    <div class="col-md-6">
                        <label for="confirmacao_senha" class="form-label">Confirmar Senha</label>
                        <input type="password" class="form-control" id="confirmacao_senha" name="confirmacao_senha" minlength="8" required>
                    </div>
                </div>

                <div class="mb-3">
                    <label for="perfil" class="form-label">Perfil</label>
                    <select class="form-control" id="perfil" name="perfil" required>
                        <option value="admin" <?php echo $perfil === 'admin' ? 'selected' : ''; ?>>Admin</option>
                        <option value="operador" <?php echo $perfil === 'operador' ? 'selected' : ''; ?>>Operador</option>
                    </select>
                </div>

                <button type="submit" class="btn btn-primary">Cadastrar</button>
                <a href="index.php" class="btn btn-secondary">Cancelar</a>
            </form>
        </div>
    </div>
</div>

<?php include '../includes/footer.php'; ?>
