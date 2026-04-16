<?php
include '../config/conexao.php';

$id = $_GET['id'];

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
?>