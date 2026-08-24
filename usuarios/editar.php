<?php
$root = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';
include_once $root . '/config/conexao.php';
require_once $root . '/config/auth.php';
requireAdmin();

if (!isset($_GET['id'])) {
    header('Location: index.php?erro=id_nao_informado');
    exit;
}

$id = $_GET['id'];
$erro = '';

$stmt = $pdo->prepare("SELECT id, nome, email, perfil, ativo FROM usuarios WHERE id = ?");
$stmt->execute([$id]);
$usuario = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$usuario) {
    header('Location: index.php?erro=usuario_nao_encontrado');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrfCheck();

    $nome = trim($_POST['nome'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $perfil = $_POST['perfil'] ?? 'operador';
    $senha = $_POST['senha'] ?? '';

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $erro = 'Informe um e-mail válido.';
    }

    if (!$erro && $senha !== '' && strlen($senha) < 8) {
        $erro = 'A senha deve ter pelo menos 8 caracteres.';
    }

    if (!$erro && $usuario['id'] == currentUser()['id'] && $usuario['perfil'] === 'admin' && $perfil !== 'admin') {
        $erro = 'Você não pode remover seu próprio acesso de administrador.';
    }

    if (!$erro) {
        try {
            if ($senha !== '') {
                $senha_hash = password_hash($senha, PASSWORD_DEFAULT);
                $stmt = $pdo->prepare("UPDATE usuarios SET nome = ?, email = ?, perfil = ?, senha = ? WHERE id = ?");
                $stmt->execute([$nome, $email, $perfil, $senha_hash, $id]);
            } else {
                $stmt = $pdo->prepare("UPDATE usuarios SET nome = ?, email = ?, perfil = ? WHERE id = ?");
                $stmt->execute([$nome, $email, $perfil, $id]);
            }

            header('Location: index.php?sucesso=usuario_atualizado');
            exit;
        } catch (PDOException $e) {
            if ($e->errorInfo[1] === 1062) {
                $erro = 'Este e-mail já está cadastrado.';
            } else {
                $erro = 'Erro ao atualizar usuário.';
            }
        }
    }
}
?>

<?php include '../includes/header.php'; ?>

<div class="container-fluid">
    <div class="card shadow mb-4">
        <div class="card-header bg-primary text-white">
            <h4 class="m-0"><i class="fas fa-user-edit"></i> Editar Usuário</h4>
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
                        <input type="text" class="form-control" id="nome" name="nome" value="<?php echo htmlspecialchars($usuario['nome']); ?>" required>
                    </div>
                    <div class="col-md-6">
                        <label for="email" class="form-label">E-mail</label>
                        <input type="email" class="form-control" id="email" name="email" value="<?php echo htmlspecialchars($usuario['email']); ?>" required>
                    </div>
                </div>

                <div class="row mb-3">
                    <div class="col-md-6">
                        <label for="senha" class="form-label">Senha (opcional)</label>
                        <input type="password" class="form-control" id="senha" name="senha" minlength="8" placeholder="Digite para alterar">
                    </div>
                    <div class="col-md-6">
                        <label for="perfil" class="form-label">Perfil</label>
                        <select class="form-control" id="perfil" name="perfil" required>
                            <option value="admin" <?php echo $usuario['perfil'] === 'admin' ? 'selected' : ''; ?>>Admin</option>
                            <option value="operador" <?php echo $usuario['perfil'] === 'operador' ? 'selected' : ''; ?>>Operador</option>
                        </select>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary">Salvar</button>
                <a href="index.php" class="btn btn-secondary">Cancelar</a>
            </form>
        </div>
    </div>
</div>

<?php include '../includes/footer.php'; ?>
