<?php
$root = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';
include_once $root . '/config/conexao.php';
include_once $root . '/config/auth.php';
requireLogin();

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

// Buscar movimento para saber o tipo e quantidade
$stmt = $pdo->prepare("SELECT * FROM movimentos WHERE id = ?");
$stmt->execute([$id]);
$movimento = $stmt->fetch(PDO::FETCH_ASSOC);

if ($movimento) {
    // Reverter o estoque
    if ($movimento['tipo'] == 'E') {
        // Se era entrada, subtrai do estoque
        $stmt = $pdo->prepare("UPDATE produtos SET qtd = qtd - ? WHERE id = ?");
    } else {
        // Se era saída, adiciona ao estoque
        $stmt = $pdo->prepare("UPDATE produtos SET qtd = qtd + ? WHERE id = ?");
    }
    $stmt->execute([$movimento['qtd'], $movimento['produto_id']]);
    
    // Excluir movimento
    $stmt = $pdo->prepare("DELETE FROM movimentos WHERE id = ?");
    $stmt->execute([$id]);
}

header('Location: index.php?sucesso=movimentacao_excluida');
exit;
?>