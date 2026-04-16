<?php
include 'config/conexao.php';

echo "<h1>Teste de Conexão</h1>";

try {
    // Testar conexão
    $stmt = $pdo->query("SELECT 1");
    echo "<div class='alert alert-success'>Conexão com o banco de dados estabelecida com sucesso!</div>";
    
    // Testar se tabelas existem
    $stmt = $pdo->query("SHOW TABLES LIKE 'produtos'");
    if ($stmt->rowCount() > 0) {
        echo "<div class='alert alert-success'>Tabela 'produtos' existe!</div>";
    } else {
        echo "<div class='alert alert-warning'>Tabela 'produtos' não existe!</div>";
    }
    
    $stmt = $pdo->query("SHOW TABLES LIKE 'movimentos'");
    if ($stmt->rowCount() > 0) {
        echo "<div class='alert alert-success'>Tabela 'movimentos' existe!</div>";
    } else {
        echo "<div class='alert alert-warning'>Tabela 'movimentos' não existe!</div>";
    }
    
} catch(PDOException $e) {
    echo "<div class='alert alert-danger'>Erro: " . $e->getMessage() . "</div>";
}
?>