<?php
include '../config/conexao.php';

// Buscar produtos com estoque
$sql_produtos = "
    SELECT p.*, 
           COALESCE(SUM(CASE WHEN m.tipo = 'E' THEN m.qtd ELSE 0 END), 0) as total_entradas,
           COALESCE(SUM(CASE WHEN m.tipo = 'S' THEN m.qtd ELSE 0 END), 0) as total_saidas
    FROM produtos p
    LEFT JOIN movimentos m ON p.id = m.produto_id
    GROUP BY p.id
    ORDER BY p.nome
";

$stmt = $pdo->query($sql_produtos);
$produtos = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Exportar para PDF
if (isset($_GET['exportar']) && $_GET['exportar'] == 'pdf') {
    $html = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Relatório de Produtos</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 30px; }
            .totais { margin-top: 20px; padding: 10px; background-color: #f9f9f9; }
            .badge-estoque { padding: 2px 6px; border-radius: 3px; font-size: 12px; color: white; }
            .estoque-positivo { background-color: #28a745; }
            .estoque-zero { background-color: #dc3545; }
            .tfoot { background-color: #e9ecef; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Relatório de Produtos em Estoque</h1>
            <p>Data do Relatório: ' . date('d/m/Y H:i') . '</p>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nome</th>
                    <th>Preço Custo</th>
                    <th>Preço Venda</th>
                    <th>Qtd Estoque</th>
                    <th>Total Entradas</th>
                    <th>Total Saídas</th>
                    <th>Valor Total Estoque</th>
                </tr>
            </thead>
            <tbody>';
    
    $valor_total_geral = 0;
    foreach ($produtos as $produto) {
        $valor_total = $produto['qtd'] * $produto['preco_custo'];
        $valor_total_geral += $valor_total;
        $estoque_class = $produto['qtd'] > 0 ? 'estoque-positivo' : 'estoque-zero';
        
        $html .= '
                <tr>
                    <td>' . $produto['id'] . '</td>
                    <td>' . htmlspecialchars($produto['nome']) . '</td>
                    <td>R$ ' . number_format($produto['preco_custo'], 2, ',', '.') . '</td>
                    <td>R$ ' . number_format($produto['preco_venda'], 2, ',', '.') . '</td>
                    <td><span class="badge-estoque ' . $estoque_class . '">' . $produto['qtd'] . '</span></td>
                    <td>' . $produto['total_entradas'] . '</td>
                    <td>' . $produto['total_saidas'] . '</td>
                    <td>R$ ' . number_format($valor_total, 2, ',', '.') . '</td>
                </tr>';
    }
    
    if (empty($produtos)) {
        $html .= '
                <tr>
                    <td colspan="8" style="text-align: center;">Nenhum produto cadastrado.</td>
                </tr>';
    }
    
    $html .= '
            </tbody>
            <tfoot>
                <tr class="tfoot">
                    <td colspan="7" style="text-align: right;"><strong>Valor Total Geral em Estoque:</strong></td>
                    <td><strong>R$ ' . number_format($valor_total_geral, 2, ',', '.') . '</strong></td>
                </tr>
            </tfoot>
        </table>
        
        <div style="margin-top: 30px; text-align: center; color: #666;">
            <p>Relatório gerado pelo Sistema de Estoque</p>
        </div>
        
        <script>
            window.onload = function() {
                window.print();
            }
        </script>
    </body>
    </html>';
    
    header('Content-Type: text/html; charset=utf-8');
    echo $html;
    exit;
}
?>

<?php include '../includes/header.php'; ?>

<h1>Relatório de Produtos</h1>

<div class="d-flex justify-content-between mb-3">
    <h4>Estoque de Produtos</h4>
    <div>
        <a href="relatorio_prod.php?exportar=pdf" class="btn btn-danger" target="_blank">
            Exportar PDF
        </a>
    </div>
</div>

<table class="table table-striped">
    <thead>
        <tr>
            <th>ID</th>
            <th>Nome</th>
            <th>Preço Custo</th>
            <th>Preço Venda</th>
            <th>Qtd Estoque</th>
            <th>Total Entradas</th>
            <th>Total Saídas</th>
            <th>Valor Total Estoque</th>
        </tr>
    </thead>
    <tbody>
        <?php 
        $valor_total_geral = 0;
        foreach ($produtos as $produto): 
            $valor_total = $produto['qtd'] * $produto['preco_custo'];
            $valor_total_geral += $valor_total;
        ?>
        <tr>
            <td><?php echo $produto['id']; ?></td>
            <td><?php echo htmlspecialchars($produto['nome']); ?></td>
            <td>R$ <?php echo number_format($produto['preco_custo'], 2, ',', '.'); ?></td>
            <td>R$ <?php echo number_format($produto['preco_venda'], 2, ',', '.'); ?></td>
            <td>
                <span class="badge <?php echo $produto['qtd'] > 0 ? 'bg-success' : 'bg-danger'; ?>">
                    <?php echo $produto['qtd']; ?>
                </span>
            </td>
            <td><?php echo $produto['total_entradas']; ?></td>
            <td><?php echo $produto['total_saidas']; ?></td>
            <td>R$ <?php echo number_format($valor_total, 2, ',', '.'); ?></td>
        </tr>
        <?php endforeach; ?>
        <?php if (empty($produtos)): ?>
        <tr>
            <td colspan="8" class="text-center">Nenhum produto cadastrado.</td>
        </tr>
        <?php endif; ?>
    </tbody>
    <tfoot>
        <tr class="table-primary">
            <td colspan="7" class="text-end"><strong>Valor Total Geral em Estoque:</strong></td>
            <td><strong>R$ <?php echo number_format($valor_total_geral, 2, ',', '.'); ?></strong></td>
        </tr>
    </tfoot>
</table>

<?php include '../includes/footer.php'; ?>