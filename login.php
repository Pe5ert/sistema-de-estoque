<?php
$root = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';
include_once $root . '/config/conexao.php';
include_once $root . '/config/auth.php';

if (isLoggedIn()) {
    header('Location: index.php');
    exit;
}

$erro = '';
$bloqueio_restante = 0;

if (!isset($_SESSION['login_tentativas'])) {
    $_SESSION['login_tentativas'] = 0;
}

if (isset($_SESSION['login_bloqueado_ate']) && time() < $_SESSION['login_bloqueado_ate']) {
    $bloqueio_restante = $_SESSION['login_bloqueado_ate'] - time();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($bloqueio_restante > 0) {
        $erro = 'Muitas tentativas falharam. Tente novamente em ' . $bloqueio_restante . ' segundos.';
    } else {
        csrfCheck();

        $email = trim($_POST['email'] ?? '');
        $senha = $_POST['senha'] ?? '';

        if ($email === '' || $senha === '') {
            $erro = 'E-mail ou senha inválidos.';
        } else {
            try {
                $stmt = $pdo->prepare("SELECT id, nome, senha, perfil FROM usuarios WHERE email = ? AND ativo = 1 LIMIT 1");
                $stmt->execute([$email]);
                $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($usuario && password_verify($senha, $usuario['senha'])) {
                    session_regenerate_id(true);
                    $_SESSION['usuario_id'] = $usuario['id'];
                    $_SESSION['usuario_nome'] = $usuario['nome'];
                    $_SESSION['usuario_perfil'] = $usuario['perfil'];

                    unset($_SESSION['login_tentativas'], $_SESSION['login_bloqueado_ate']);

                    $stmt = $pdo->prepare("UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?");
                    $stmt->execute([$usuario['id']]);

                    $redirect = $_SESSION['redirect_apos_login'] ?? 'index.php';
                    unset($_SESSION['redirect_apos_login']);

                    header('Location: ' . $redirect);
                    exit;
                }

                $_SESSION['login_tentativas']++;
                if ($_SESSION['login_tentativas'] >= 5) {
                    $_SESSION['login_bloqueado_ate'] = time() + 300;
                    $erro = 'Muitas tentativas falharam. Tente novamente em 5 minutos.';
                } else {
                    $erro = 'E-mail ou senha inválidos.';
                }
            } catch (PDOException $e) {
                $erro = 'Ocorreu um erro durante o login. Tente novamente.';
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
    <title>Login - Sistema de Estoque</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/Estoque/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body class="bg-light">
    <div class="container py-5">
        <div class="row justify-content-center">
            <div class="col-md-6 col-lg-5">
                <div class="card shadow-sm">
                    <div class="card-body">
                        <h3 class="card-title mb-4 text-center">Acesso ao Sistema</h3>

                        <?php if ($erro): ?>
                            <div class="alert alert-danger"><?php echo htmlspecialchars($erro); ?></div>
                        <?php endif; ?>

                        <form method="POST" novalidate>
                            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars(csrfToken()); ?>">

                            <div class="mb-3">
                                <label for="email" class="form-label">E-mail</label>
                                <input type="email" class="form-control" id="email" name="email" required>
                            </div>

                            <div class="mb-3">
                                <label for="senha" class="form-label">Senha</label>
                                <input type="password" class="form-control" id="senha" name="senha" required>
                            </div>

                            <button type="submit" class="btn btn-primary w-100">
                                <i class="fas fa-sign-in-alt"></i> Entrar
                            </button>
                        </form>

                        <div class="mt-4 text-center text-muted small">
                            Use seu e-mail e senha para acessar o sistema.
                        </div>
                    </div>
                </div>
                <div class="text-center mt-3 text-muted small">
                    <p>Se ainda não existe um usuário administrador, acesse <strong>criar_admin.php</strong>.</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
