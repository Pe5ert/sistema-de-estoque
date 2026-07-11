<?php
$root = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';
include_once $root . '/config/conexao.php';
include_once $root . '/config/auth.php';
requireLogin();

// Definir período padrão (últimos 30 dias)
$data_inicio = isset($_GET['data_inicio']) ? $_GET['data_inicio'] : date('Y-m-d', strtotime('-30 days'));
$data_fim = isset($_GET['data_fim']) ? $_GET['data_fim'] : date('Y-m-d');

// Buscar dados para relatório
$where_conditions = [];
$params = [];

if ($data_inicio) {
    $where_conditions[] = "m.data >= ?";
    $params[] = $data_inicio;
}

if ($data_fim) {
    $where_conditions[] = "m.data <= ?";
    $params[] = $data_fim . ' 23:59:59';
}

$where_sql = "";
if (!empty($where_conditions)) {
    $where_sql = "WHERE " . implode(" AND ", $where_conditions);
}

// Buscar movimentações
$sql_movimentos = "
    SELECT m.*, p.nome as produto_nome 
    FROM movimentos m 
    LEFT JOIN produtos p ON m.produto_id = p.id 
    $where_sql
    ORDER BY m.data DESC
";

$stmt = $pdo->prepare($sql_movimentos);
$stmt->execute($params);
$movimentos = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Buscar totais
$sql_totais = "
    SELECT 
        COUNT(*) as total_movimentos,
        SUM(CASE WHEN m.tipo = 'E' THEN m.qtd ELSE 0 END) as total_entradas,
        SUM(CASE WHEN m.tipo = 'S' THEN m.qtd ELSE 0 END) as total_saidas
    FROM movimentos m
    $where_sql
";

$stmt = $pdo->prepare($sql_totais);
$stmt->execute($params);
$totais = $stmt->fetch(PDO::FETCH_ASSOC);

// Exportar para CSV
if (isset($_GET['exportar']) && $_GET['exportar'] == 'csv') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=relatorio_movimentacoes_' . date('Y-m-d') . '.csv');
    
    $output = fopen('php://output', 'w');
    
    // Cabeçalho CSV
    fputcsv($output, [
        'ID', 'Produto', 'Tipo', 'Quantidade', 'Data', 'Descrição Tipo'
    ], ';');
    
    // Dados
    foreach ($movimentos as $movimento) {
        $tipo_desc = $movimento['tipo'] == 'E' ? 'Entrada' : 'Saída';
        
        fputcsv($output, [
            $movimento['id'],
            $movimento['produto_nome'],
            $movimento['tipo'],
            $movimento['qtd'],
            date('d/m/Y H:i', strtotime($movimento['data'])),
            $tipo_desc
        ], ';');
    }
    
    fclose($output);
    exit;
}

// Exportar para PDF (Versão Simplificada - HTML para impressão)
if (isset($_GET['exportar']) && $_GET['exportar'] == 'pdf') {
    // Gerar HTML para impressão que pode ser salvo como PDF
    $html = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Relatório de Movimentações</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 30px; }
            .totais { margin-top: 20px; padding: 10px; background-color: #f9f9f9; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Relatório de Movimentações</h1>
            <p>Período: ' . date('d/m/Y', strtotime($data_inicio)) . ' a ' . date('d/m/Y', strtotime($data_fim)) . '</p>
            <p>Data do Relatório: ' . date('d/m/Y H:i') . '</p>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Produto</th>
                    <th>Tipo</th>
                    <th>Quantidade</th>
                    <th>Data</th>
                </tr>
            </thead>
            <tbody>';
    
    foreach ($movimentos as $movimento) {
        $tipo_desc = $movimento['tipo'] == 'E' ? 'Entrada' : 'Saída';
        $tipo_badge = $movimento['tipo'] == 'E' ? 'background-color: #28a745; color: white; padding: 2px 6px; border-radius: 3px;' 
                                                : 'background-color: #dc3545; color: white; padding: 2px 6px; border-radius: 3px;';
        
        $html .= '
                <tr>
                    <td>' . $movimento['id'] . '</td>
                    <td>' . htmlspecialchars($movimento['produto_nome']) . '</td>
                    <td><span style="' . $tipo_badge . '">' . $tipo_desc . '</span></td>
                    <td>' . $movimento['qtd'] . '</td>
                    <td>' . date('d/m/Y H:i', strtotime($movimento['data'])) . '</td>
                </tr>';
    }
    
    if (empty($movimentos)) {
        $html .= '
                <tr>
                    <td colspan="5" style="text-align: center;">Nenhuma movimentação encontrada no período selecionado.</td>
                </tr>';
    }
    
    $html .= '
            </tbody>
        </table>
        
        <div class="totais">
            <h3>Totais do Período</h3>
            <p><strong>Total de Movimentos:</strong> ' . $totais['total_movimentos'] . '</p>
            <p><strong>Total de Entradas:</strong> ' . $totais['total_entradas'] . '</p>
            <p><strong>Total de Saídas:</strong> ' . $totais['total_saidas'] . '</p>
        </div>
        
        <script>
            window.onload = function() {
                window.print();
                setTimeout(function() {
                    window.close();
                }, 500);
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

<h1>Relatórios de Movimentações</h1>

<div class="card">
    <div class="card-body">
        <h5 class="card-title">Filtros do Relatório</h5>
        <form method="GET" class="row g-3">
            <div class="col-md-4">
                <label for="data_inicio" class="form-label">Data Início</label>
                <input type="date" class="form-control" id="data_inicio" name="data_inicio" 
                       value="<?php echo $data_inicio; ?>">
            </div>
            <div class="col-md-4">
                <label for="data_fim" class="form-label">Data Fim</label>
                <input type="date" class="form-control" id="data_fim" name="data_fim" 
                       value="<?php echo $data_fim; ?>">
            </div>
            <div class="col-md-4 d-flex align-items-end">
                <button type="submit" class="btn btn-primary me-2">Filtrar</button>
                <a href="relatorio.php" class="btn btn-secondary">Limpar</a>
            </div>
        </form>
    </div>
</div>

<div class="row mb-4">
    <div class="col-md-4">
        <div class="card text-white bg-primary">
            <div class="card-body">
                <h5 class="card-title">Total Movimentos</h5>
                <h2 class="card-text"><?php echo $totais['total_movimentos']; ?></h2>
            </div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card text-white bg-success">
            <div class="card-body">
                <h5 class="card-title">Total Entradas</h5>
                <h2 class="card-text"><?php echo $totais['total_entradas']; ?></h2>
            </div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card text-white bg-danger">
            <div class="card-body">
                <h5 class="card-title">Total Saídas</h5>
                <h2 class="card-text"><?php echo $totais['total_saidas']; ?></h2>
            </div>
        </div>
    </div>
</div>

<div class="d-flex justify-content-between mb-3">
    <h4>Movimentações do Período</h4>
    <div>
        <a href="relatorio.php?<?php echo http_build_query($_GET); ?>&exportar=csv" 
           class="btn btn-success me-2">
            Exportar CSV
        </a>
        <a href="relatorio.php?<?php echo http_build_query($_GET); ?>&exportar=pdf" 
           class="btn btn-danger" target="_blank">
            Exportar PDF
        </a>
    </div>
</div>

<table class="table table-striped">
    <thead>
        <tr>
            <th>ID</th>
            <th>Produto</th>
            <th>Tipo</th>
            <th>Quantidade</th>
            <th>Data</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($movimentos as $movimento): ?>
        <tr>
            <td><?php echo $movimento['id']; ?></td>
            <td><?php echo htmlspecialchars($movimento['produto_nome']); ?></td>
            <td>
                <?php if ($movimento['tipo'] == 'E'): ?>
                    <span class="badge bg-success">Entrada</span>
                <?php else: ?>
                    <span class="badge bg-danger">Saída</span>
                <?php endif; ?>
            </td>
            <td><?php echo $movimento['qtd']; ?></td>
            <td><?php echo date('d/m/Y H:i', strtotime($movimento['data'])); ?></td>
        </tr>
        <?php endforeach; ?>
        <?php if (empty($movimentos)): ?>
        <tr>
            <td colspan="5" class="text-center">Nenhuma movimentação encontrada no período selecionado.</td>
        </tr>
        <?php endif; ?>
    </tbody>
</table>

<?php include '../includes/footer.php'; ?>