<?php
include '../config/conexao.php';

if (!isset($_GET['id'])) {
    header('Location: index.php?erro=id_nao_informado');
    exit;
}

$id = $_GET['id'];

try {
    // Buscar movimento para saber o tipo e quantidade
    $stmt = $pdo->prepare("SELECT * FROM movimentos WHERE id = ?");
    $stmt->execute([$id]);
    $movimento = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$movimento) {
        header('Location: index.php?erro=movimento_nao_encontrado');
        exit;
    }

    // Reverter o estoque
    if ($movimento['tipo'] == 'E') {
        // Se era entrada, subtrai do estoque (reverte)
        $stmt = $pdo->prepare("UPDATE produtos SET qtd = qtd - ? WHERE id = ?");
    } else {
        // Se era saída, adiciona ao estoque (reverte)  
        $stmt = $pdo->prepare("UPDATE produtos SET qtd = qtd + ? WHERE id = ?");
    }
    $stmt->execute([$movimento['qtd'], $movimento['produto_id']]);
    
    // Excluir movimento
    $stmt = $pdo->prepare("DELETE FROM movimentos WHERE id = ?");
    
    if ($stmt->execute([$id])) {
        header('Location: index.php?sucesso=movimentacao_excluida');
    } else {
        header('Location: index.php?erro=erro_exclusao');
    }
    
} catch(PDOException $e) {
    header('Location: index.php?erro=erro_banco_dados');
}
?>