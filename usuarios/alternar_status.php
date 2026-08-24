<?php
$root = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';
include_once $root . '/config/conexao.php';
require_once $root . '/config/auth.php';
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: index.php');
    exit;
}

if (!isset($_POST['id'])) {
    header('Location: index.php?erro=id_nao_informado');
    exit;
}

csrfCheck();

$id = $_POST['id'];

if ($id == currentUser()['id']) {
    header('Location: index.php?erro=nao_pode_desativar_a_si_mesmo');
    exit;
}

$stmt = $pdo->prepare("UPDATE usuarios SET ativo = NOT ativo WHERE id = ?");
$stmt->execute([$id]);

header('Location: index.php?sucesso=status_atualizado');
exit;
?>