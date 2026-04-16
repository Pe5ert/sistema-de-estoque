<?php
// comparativos/index.php
$root = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';
include $root . '/config/conexao.php';
include $root . '/config/config.php';

// Buscar dados para comparativos
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

// Buscar dados mensais para gráfico
$sql_dados_mensais = "
    SELECT 
        DATE_FORMAT(m.data, '%Y-%m') as mes,
        p.nome as produto_nome,
        SUM(CASE WHEN m.tipo = 'E' THEN m.qtd ELSE 0 END) as entradas,
        SUM(CASE WHEN m.tipo = 'S' THEN m.qtd ELSE 0 END) as saidas,
        SUM(CASE WHEN m.tipo = 'S' THEN (p.preco_venda - p.preco_custo) * m.qtd ELSE 0 END) as lucro_mensal
    FROM movimentos m
    LEFT JOIN produtos p ON m.produto_id = p.id
    WHERE m.data >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(m.data, '%Y-%m'), p.nome
    ORDER BY mes DESC, lucro_mensal DESC
";

$stmt = $pdo->query($sql_dados_mensais);
$dados_mensais = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Calcular totais gerais
$total_lucro_vendido = 0;
$total_valor_estoque = 0;
$total_valor_potencial = 0;

foreach ($comparativo_produtos as $produto) {
    $total_lucro_vendido += $produto['lucro_total_vendido'];
    $total_valor_estoque += $produto['valor_estoque_atual'];
    $total_valor_potencial += $produto['valor_estoque_potencial'];
}
?>

<?php include '../includes/header.php'; ?>

<div class="container-fluid">
    <!-- Cards de Estatísticas -->
    <div class="row mb-4">
        <div class="col-xl-3 col-md-6 mb-4">
            <div class="card border-left-success shadow h-100 py-2 card-hover-success">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs font-weight-bold text-success text-uppercase mb-1">
                                Lucro Total Vendido
                            </div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800">
                                R$ <?php echo number_format($total_lucro_vendido, 2, ',', '.'); ?>
                            </div>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-dollar-sign fa-2x text-gray-300"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
            <div class="card border-left-primary shadow h-100 py-2 card-hover-primary">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                Valor em Estoque
                            </div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800">
                                R$ <?php echo number_format($total_valor_estoque, 2, ',', '.'); ?>
                            </div>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-boxes fa-2x text-gray-300"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
            <div class="card border-left-info shadow h-100 py-2 card-hover-info">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs font-weight-bold text-info text-uppercase mb-1">
                                Valor Potencial
                            </div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800">
                                R$ <?php echo number_format($total_valor_potencial, 2, ',', '.'); ?>
                            </div>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-chart-line fa-2x text-gray-300"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
            <div class="card border-left-warning shadow h-100 py-2 card-hover-warning">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">
                                Total de Produtos
                            </div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800">
                                <?php echo count($comparativo_produtos); ?>
                            </div>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-box fa-2x text-gray-300"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Tabela Principal de Comparativos -->
    <div class="card shadow mb-4">
        <div class="card-header py-3 d-flex justify-content-between align-items-center bg-primary">
            <h4 class="m-0 font-weight-bold text-white">
                <i class="fas fa-chart-line"></i> Comparativos de Desempenho
            </h4>
            <div class="ms-auto me-3">
                <a href="../produtos/index.php" class="btn btn-light btn-sm">
                    <i class="fas fa-boxes text-primary"></i> Ver Produtos
                </a>
                <a href="../movimentos/index.php" class="btn btn-info btn-sm">
                    <i class="fas fa-exchange-alt"></i> Ver Movimentos
                </a>
            </div>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-bordered table-hover" id="dataTable" width="100%" cellspacing="0">
                    <thead class="table-light">
                        <tr>
                            <th width="20%">Produto</th>
                            <th width="10%">Preço Custo</th>
                            <th width="10%">Preço Venda</th>
                            <th width="10%">Lucro Unitário</th>
                            <th width="8%">Estoque</th>
                            <th width="8%">Vendidos</th>
                            <th width="12%">Lucro Total</th>
                            <th width="8%">Margem %</th>
                            <th width="14%">Desempenho</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($comparativo_produtos as $produto): 
                            $margem = $produto['preco_custo'] > 0 ? (($produto['lucro_unitario'] / $produto['preco_custo']) * 100) : 0;
                            $desempenho_class = $margem > 50 ? 'bg-success' : ($margem > 20 ? 'bg-warning' : 'bg-danger');
                            
                            // Status do estoque
                            $status_estoque = '';
                            $badge_class = '';
                            
                            if ($produto['estoque_atual'] == 0) {
                                $status_estoque = 'Sem Estoque';
                                $badge_class = 'bg-danger';
                            } elseif ($produto['estoque_atual'] < ESTOQUE_BAIXO_LIMITE) {
                                $status_estoque = 'Estoque Baixo';
                                $badge_class = 'bg-warning';
                            } else {
                                $status_estoque = 'Normal';
                                $badge_class = 'bg-success';
                            }
                        ?>
                            <tr>
                                <td>
                                    <strong><?php echo htmlspecialchars($produto['nome']); ?></strong>
                                </td>
                                <td>
                                    <span class="text-muted">R$ </span>
                                    <strong><?php echo number_format($produto['preco_custo'], 2, ',', '.'); ?></strong>
                                </td>
                                <td>
                                    <span class="text-success">R$ </span>
                                    <strong class="text-success"><?php echo number_format($produto['preco_venda'], 2, ',', '.'); ?></strong>
                                </td>
                                <td>
                                    <span class="text-success">R$ </span>
                                    <strong class="text-success"><?php echo number_format($produto['lucro_unitario'], 2, ',', '.'); ?></strong>
                                </td>
                                <td>
                                    <span class="badge <?php echo $badge_class; ?>">
                                        <?php echo $produto['estoque_atual']; ?> un
                                    </span>
                                </td>
                                <td>
                                    <span class="badge bg-info">
                                        <?php echo $produto['total_saidas']; ?> un
                                    </span>
                                </td>
                                <td>
                                    <span class="badge bg-success">
                                        R$ <?php echo number_format($produto['lucro_total_vendido'], 2, ',', '.'); ?>
                                    </span>
                                </td>
                                <td>
                                    <span class="badge <?php echo $desempenho_class; ?>">
                                        <?php echo number_format($margem, 1, ',', '.'); ?>%
                                    </span>
                                </td>
                                <td>
                                    <?php if ($produto['total_saidas'] > 0): ?>
                                        <div class="progress" style="height: 20px;">
                                            <?php 
                                            $max_vendas = max(array_column($comparativo_produtos, 'total_saidas'));
                                            $percentual = $max_vendas > 0 ? ($produto['total_saidas'] / $max_vendas) * 100 : 0;
                                            ?>
                                            <div class="progress-bar bg-info" role="progressbar" 
                                                 style="width: <?php echo $percentual; ?>%"
                                                 aria-valuenow="<?php echo $percentual; ?>" 
                                                 aria-valuemin="0" 
                                                 aria-valuemax="100">
                                                <?php echo $produto['total_saidas']; ?>
                                            </div>
                                        </div>
                                    <?php else: ?>
                                        <span class="badge bg-secondary">Sem vendas</span>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                        
                        <?php if (empty($comparativo_produtos)): ?>
                            <tr>
                                <td colspan="9" class="text-center py-4">
                                    <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
                                    <p class="text-muted">Nenhum dado disponível para comparativos.</p>
                                    <a href="../produtos/adicionar.php" class="btn btn-primary">
                                        <i class="fas fa-plus"></i> Adicionar Primeiro Produto
                                    </a>
                                </td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Análise de Rentabilidade -->
    <div class="row mb-4">
        <div class="col-md-6">
            <div class="card shadow h-100">
                <div class="card-header py-3 bg-success text-white">
                    <h5 class="m-0 font-weight-bold">
                        <i class="fas fa-trophy"></i> Top 5 Produtos Mais Rentáveis
                    </h5>
                </div>
                <div class="card-body">
                    <?php 
                    $produtos_ordenados = $comparativo_produtos;
                    usort($produtos_ordenados, function($a, $b) {
                        return $b['lucro_total_vendido'] - $a['lucro_total_vendido'];
                    });
                    $top5 = array_slice($produtos_ordenados, 0, 5);
                    ?>
                    <div class="list-group">
                        <?php foreach ($top5 as $index => $produto): ?>
                        <div class="list-group-item">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">
                                    <span class="badge bg-primary"><?php echo $index + 1; ?>º</span>
                                    <?php echo htmlspecialchars($produto['nome']); ?>
                                </h6>
                                <strong class="text-success">
                                    R$ <?php echo number_format($produto['lucro_total_vendido'], 2, ',', '.'); ?>
                                </strong>
                            </div>
                            <p class="mb-1">
                                <small>
                                    Vendidos: <?php echo $produto['total_saidas']; ?> unidades | 
                                    Margem: <?php echo number_format(($produto['lucro_unitario'] / $produto['preco_custo']) * 100, 1, ',', '.'); ?>%
                                </small>
                            </p>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-md-6">
            <div class="card shadow h-100">
                <div class="card-header py-3 bg-warning text-white">
                    <h5 class="m-0 font-weight-bold">
                        <i class="fas fa-chart-bar"></i> Produtos com Maior Estoque
                    </h5>
                </div>
                <div class="card-body">
                    <?php 
                    usort($comparativo_produtos, function($a, $b) {
                        return $b['estoque_atual'] - $a['estoque_atual'];
                    });
                    $top_estoque = array_slice($comparativo_produtos, 0, 5);
                    ?>
                    <div class="list-group">
                        <?php foreach ($top_estoque as $index => $produto): ?>
                        <div class="list-group-item">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">
                                    <span class="badge bg-info"><?php echo $index + 1; ?>º</span>
                                    <?php echo htmlspecialchars($produto['nome']); ?>
                                </h6>
                                <strong class="text-primary">
                                    <?php echo $produto['estoque_atual']; ?> un
                                </strong>
                            </div>
                            <p class="mb-1">
                                <small>
                                    Valor: R$ <?php echo number_format($produto['valor_estoque_atual'], 2, ',', '.'); ?> | 
                                    Potencial: R$ <?php echo number_format($produto['valor_estoque_potencial'], 2, ',', '.'); ?>
                                </small>
                            </p>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Estatísticas Mensais -->
    <div class="card shadow mb-4">
        <div class="card-header py-3 d-flex justify-content-between align-items-center bg-info text-white">
            <h5 class="m-0 font-weight-bold">
                <i class="fas fa-calendar-alt"></i> Desempenho Mensal (Últimos 6 Meses)
            </h5>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-bordered table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Mês</th>
                            <th>Produto</th>
                            <th>Entradas</th>
                            <th>Saídas</th>
                            <th>Lucro Mensal</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php 
                        $meses_agrupados = [];
                        foreach ($dados_mensais as $dado) {
                            $meses_agrupados[$dado['mes']][] = $dado;
                        }
                        
                        foreach ($meses_agrupados as $mes => $produtos_mes):
                            $total_mes_entradas = 0;
                            $total_mes_saidas = 0;
                            $total_mes_lucro = 0;
                            
                            foreach ($produtos_mes as $produto_mes) {
                                $total_mes_entradas += $produto_mes['entradas'];
                                $total_mes_saidas += $produto_mes['saidas'];
                                $total_mes_lucro += $produto_mes['lucro_mensal'];
                            }
                        ?>
                        <tr class="table-active">
                            <td colspan="2">
                                <strong><?php echo date('m/Y', strtotime($mes . '-01')); ?></strong>
                            </td>
                            <td><strong><?php echo $total_mes_entradas; ?></strong></td>
                            <td><strong><?php echo $total_mes_saidas; ?></strong></td>
                            <td>
                                <strong class="text-success">
                                    R$ <?php echo number_format($total_mes_lucro, 2, ',', '.'); ?>
                                </strong>
                            </td>
                        </tr>
                        <?php foreach ($produtos_mes as $produto_mes): ?>
                        <tr>
                            <td></td>
                            <td><?php echo htmlspecialchars($produto_mes['produto_nome']); ?></td>
                            <td><?php echo $produto_mes['entradas']; ?></td>
                            <td><?php echo $produto_mes['saidas']; ?></td>
                            <td>R$ <?php echo number_format($produto_mes['lucro_mensal'], 2, ',', '.'); ?></td>
                        </tr>
                        <?php endforeach; ?>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
<div class="mt-4">
    <a href="exportar_comparativo.php" class="btn btn-danger">
        <i class="fas fa-file-pdf"></i> Exportar Relatório PDF
    </a>
    <a href="../index.php" class="btn btn-secondary">
        <i class="fas fa-arrow-left"></i> Voltar ao Dashboard
    </a>
</div>
<style>
.card {
    transition: transform 0.2s, border-color 0.2s;
}
.card:hover {
    transform: translateY(-5px);
}

.card-hover-primary:hover {
    border-left-color: #2e59d9 !important;
    border-color: #4e73df;
}

.card-hover-success:hover {
    border-left-color: #17a673 !important;
    border-color: #1cc88a;
}

.card-hover-info:hover {
    border-left-color: #2c9faf !important;
    border-color: #36b9cc;
}

.card-hover-warning:hover {
    border-left-color: #e4b22b !important;
    border-color: #f6c23e;
}

.border-left-primary {
    border-left: 4px solid #4e73df !important;
}
.border-left-success {
    border-left: 4px solid #1cc88a !important;
}
.border-left-info {
    border-left: 4px solid #36b9cc !important;
}
.border-left-warning {
    border-left: 4px solid #f6c23e !important;
}

.progress {
    border-radius: 4px;
}

.list-group-item {
    border-left: 3px solid transparent;
    transition: all 0.2s;
}
.list-group-item:hover {
    border-left-color: #4e73df;
    background-color: #f8f9fa;
}
</style>

<?php include '../includes/footer.php'; ?>