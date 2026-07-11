<?php
$root = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';
include_once $root . '/config/conexao.php';
include_once $root . '/config/auth.php';
requireLogin();

// Buscar dados para comparativos (mesma query do index)
$sql_comparativo_produtos = "
    SELECT 
        p.id,
        p.nome,
        p.preco_custo,
        p.preco_venda,
        p.qtd as estoque_atual,
        COALESCE(SUM(CASE WHEN m.tipo = 'E' THEN m.qtd ELSE 0 END), 0) as total_entradas,
        COALESCE(SUM(CASE WHEN m.tipo = 'S' THEN m.qtd ELSE 0 END), 0) as total_saidas,
        (p.preco_venda - p.preco_custo) as lucro_unitario,
        ((p.preco_venda - p.preco_custo) * COALESCE(SUM(CASE WHEN m.tipo = 'S' THEN m.qtd ELSE 0 END), 0)) as lucro_total_vendido,
        (p.preco_custo * p.qtd) as valor_estoque_atual,
        (p.preco_venda * p.qtd) as valor_estoque_potencial
    FROM produtos p
    LEFT JOIN movimentos m ON p.id = m.produto_id
    GROUP BY p.id, p.nome, p.preco_custo, p.preco_venda, p.qtd
    ORDER BY lucro_total_vendido DESC
";

$stmt = $pdo->query($sql_comparativo_produtos);
$comparativo_produtos = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Calcular totais
$total_lucro_vendido = 0;
$total_valor_estoque = 0;
$total_valor_potencial = 0;

foreach ($comparativo_produtos as $produto) {
    $total_lucro_vendido += $produto['lucro_total_vendido'];
    $total_valor_estoque += $produto['valor_estoque_atual'];
    $total_valor_potencial += $produto['valor_estoque_potencial'];
}

// Gerar PDF
$html = '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Relatório de Comparativos</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .header { text-align: center; margin-bottom: 30px; }
        .resumo { background-color: #f9f9f9; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
        .text-success { color: #28a745; }
        .text-primary { color: #007bff; }
        .text-info { color: #17a2b8; }
        .badge { padding: 3px 8px; border-radius: 3px; font-size: 12px; color: white; }
        .bg-success { background-color: #28a745; }
        .bg-warning { background-color: #ffc107; color: black; }
        .bg-danger { background-color: #dc3545; }
        .bg-primary { background-color: #007bff; }
        .bg-info { background-color: #17a2b8; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Relatório de Comparativos de Desempenho</h1>
        <p>Data do Relatório: ' . date('d/m/Y H:i') . '</p>
    </div>
    
    <div class="resumo">
        <h3>Resumo Geral</h3>
        <p><strong>Lucro Total Vendido:</strong> <span class="text-success">R$ ' . number_format($total_lucro_vendido, 2, ',', '.') . '</span></p>
        <p><strong>Valor em Estoque:</strong> <span class="text-primary">R$ ' . number_format($total_valor_estoque, 2, ',', '.') . '</span></p>
        <p><strong>Valor Potencial:</strong> <span class="text-info">R$ ' . number_format($total_valor_potencial, 2, ',', '.') . '</span></p>
    </div>
    
    <h3>Comparativo entre Produtos</h3>
    <table>
        <thead>
            <tr>
                <th>Produto</th>
                <th>Preço Custo</th>
                <th>Preço Venda</th>
                <th>Lucro Unitário</th>
                <th>Estoque</th>
                <th>Vendido</th>
                <th>Lucro Total</th>
                <th>Margem %</th>
            </tr>
        </thead>
        <tbody>';

foreach ($comparativo_produtos as $produto) {
    $margem = $produto['preco_custo'] > 0 ? (($produto['lucro_unitario'] / $produto['preco_custo']) * 100) : 0;
    $margem_class = $margem > 50 ? 'bg-success' : ($margem > 20 ? 'bg-warning' : 'bg-danger');
    
    $html .= '
            <tr>
                <td><strong>' . htmlspecialchars($produto['nome']) . '</strong></td>
                <td>R$ ' . number_format($produto['preco_custo'], 2, ',', '.') . '</td>
                <td>R$ ' . number_format($produto['preco_venda'], 2, ',', '.') . '</td>
                <td>R$ ' . number_format($produto['lucro_unitario'], 2, ',', '.') . '</td>
                <td>' . $produto['estoque_atual'] . ' un</td>
                <td>' . $produto['total_saidas'] . ' un</td>
                <td><span class="badge bg-success">R$ ' . number_format($produto['lucro_total_vendido'], 2, ',', '.') . '</span></td>
                <td><span class="badge ' . $margem_class . '">' . number_format($margem, 1, ',', '.') . '%</span></td>
            </tr>';
}

$html .= '
        </tbody>
    </table>
    
    <div style="margin-top: 30px; text-align: center; color: #666;">
        <p>Relatório gerado pelo Sistema de Estoque - Comparativos de Desempenho</p>
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
?>