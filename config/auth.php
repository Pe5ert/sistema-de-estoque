<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax',
    ]);
}

function isLoggedIn(): bool
{
    return isset($_SESSION['usuario_id']);
}

function currentUser(): ?array
{
    if (!isLoggedIn()) {
        return null;
    }

    return [
        'id' => $_SESSION['usuario_id'],
        'nome' => $_SESSION['usuario_nome'],
        'perfil' => $_SESSION['usuario_perfil'],
    ];
}

function requireLogin(): void
{
    if (!isLoggedIn()) {
        $_SESSION['redirect_apos_login'] = $_SERVER['REQUEST_URI'];
        header('Location: /Estoque/login.php');
        exit;
    }
}

function requireAdmin(): void
{
    requireLogin();

    if (!isset($_SESSION['usuario_perfil']) || $_SESSION['usuario_perfil'] !== 'admin') {
        http_response_code(403);
        die('Acesso negado.');
    }
}

function csrfToken(): string
{
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

function csrfCheck(): void
{
    if (!isset($_POST['csrf_token'], $_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        http_response_code(403);
        die('Requisição inválida.');
    }
}
