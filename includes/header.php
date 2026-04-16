<?php
// includes/header.php - USANDO CAMINHO ABSOLUTO
$root = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';
include_once $root . '/config/conexao.php';
include_once $root . '/config/config.php'; // MUDEI PARA include_once

// Buscar produtos com estoque baixo
$stmt = $pdo->prepare("SELECT nome, qtd FROM produtos WHERE qtd < ? ORDER BY qtd ASC");
$stmt->execute([ESTOQUE_BAIXO_LIMITE]);
$produtos_estoque_baixo = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Estoque da loja</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/Estoque/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container">
            <a class="navbar-brand" href="/Estoque/index.php">Estoque da loja</a>
            <div class="navbar-nav">
                <a class="nav-link" href="/Estoque/produtos/index.php">Produtos</a>
                <a class="nav-link" href="/Estoque/movimentos/index.php">Movimentos</a>
            </div>
        </div>
    </nav>

    <!-- Alertas de Estoque Baixo -->
    <?php if (!empty($produtos_estoque_baixo)): ?>
    <div class="alert alert-warning alert-dismissible fade show mb-0" role="alert">
        <div class="container">
            <strong><i class="fas fa-exclamation-triangle"></i> Alerta de Estoque Baixo!</strong>
            Os seguintes produtos estão com estoque abaixo do limite:
            <?php 
            $alertas = [];
            foreach ($produtos_estoque_baixo as $produto) {
                $alertas[] = $produto['nome'] . ' (' . $produto['qtd'] . ' unidades)';
            }
            echo implode(', ', $alertas);
            ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    </div>
    <?php endif; ?>

    <div class="container mt-4">