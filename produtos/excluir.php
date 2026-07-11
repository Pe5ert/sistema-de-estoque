<?php
$root = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';
include_once $root . '/config/conexao.php';
include_once $root . '/config/auth.php';
requireLogin();

if (!isset($_GET['id'])) {
    header('Location: index.php?erro=id_nao_informado');
    exit;
}

$id = $_GET['id'];

try {
    // Verificar se existem movimentações para este produto
    $stmt = $pdo->prepare("SELECT COUNT(*) as total_movimentos FROM movimentos WHERE produto_id = ?");
    $stmt->execute([$id]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result['total_movimentos'] > 0) {
        header('Location: index.php?erro=produto_com_movimentacoes');
        exit;
    }
    
    // Excluir produto
    $stmt = $pdo->prepare("DELETE FROM produtos WHERE id = ?");
    
    if ($stmt->execute([$id])) {
        header('Location: index.php?sucesso=excluido');
    } else {
        header('Location: index.php?erro=erro_exclusao');
    }
    
} catch(PDOException $e) {
    header('Location: index.php?erro=erro_banco_dados');
}
?>