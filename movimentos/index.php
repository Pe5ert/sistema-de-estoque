<?php
// movimentos/index.php
$root = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';
include $root . '/config/conexao.php';
include $root . '/config/config.php';
include_once $root . '/config/auth.php';
requireLogin();

// Buscar estatísticas para os cards
$stmt_total = $pdo->query("SELECT COUNT(*) as total FROM movimentos");
$total_movimentos = $stmt_total->fetch()['total'];

$stmt_entradas = $pdo->query("SELECT COUNT(*) as total FROM movimentos WHERE tipo = 'E'");
$total_entradas = $stmt_entradas->fetch()['total'];

$stmt_saidas = $pdo->query("SELECT COUNT(*) as total FROM movimentos WHERE tipo = 'S'");
$total_saidas = $stmt_saidas->fetch()['total'];

$stmt_ultimo_mes = $pdo->query("
    SELECT COUNT(*) as total 
    FROM movimentos 
    WHERE data >= DATE_SUB(NOW(), INTERVAL 30 DAY)
");
$total_ultimo_mes = $stmt_ultimo_mes->fetch()['total'];
?>

<?php include '../includes/header.php'; ?>

<div class="container-fluid">
    <!-- Cards de Estatísticas -->
    <div class="row mb-4">
        <div class="col-12 col-xl-3 col-md-6 mb-4">
            <div class="card border-left-primary shadow h-100 py-2 card-hover-primary">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                Total de Movimentos
                            </div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800">
                                <?php echo $total_movimentos; ?>
                            </div>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-exchange-alt fa-2x text-gray-300"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-12 col-xl-3 col-md-6 mb-4">
            <div class="card border-left-success shadow h-100 py-2 card-hover-success">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs font-weight-bold text-success text-uppercase mb-1">
                                Entradas
                            </div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800">
                                <?php echo $total_entradas; ?>
                            </div>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-arrow-down fa-2x text-gray-300"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-12 col-xl-3 col-md-6 mb-4">
            <div class="card border-left-danger shadow h-100 py-2 card-hover-danger">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs font-weight-bold text-danger text-uppercase mb-1">
                                Saídas
                            </div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800">
                                <?php echo $total_saidas; ?>
                            </div>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-arrow-up fa-2x text-gray-300"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-12 col-xl-3 col-md-6 mb-4">
            <div class="card border-left-warning shadow h-100 py-2 card-hover-warning">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">
                                Últimos 30 Dias
                            </div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800">
                                <?php echo $total_ultimo_mes; ?>
                            </div>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-calendar-alt fa-2x text-gray-300"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="card shadow mb-4">
        <div class="card-header py-3 d-flex justify-content-between align-items-center bg-primary">
            <h4 class="m-0 font-weight-bold text-white">
                <i class="fas fa-exchange-alt"></i> Gerenciar Movimentos
            </h4>
            <div class="ms-auto me-3">
                <a href="cadastrar.php" class="btn btn-light btn-sm">
                    <i class="fas fa-plus text-primary"></i> Nova Movimentação
                </a>
            </div>
        </div>
        <div class="card-body">
            <?php if (isset($_GET['sucesso'])): ?>
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    <i class="fas fa-check-circle"></i> Movimentação <?php echo $_GET['sucesso']; ?> com sucesso!
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            <?php endif; ?>

            <?php if (isset($_GET['erro'])): ?>
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    <i class="fas fa-exclamation-circle"></i> Erro ao processar a solicitação.
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            <?php endif; ?>

            <div class="table-responsive">
                <table class="table table-bordered table-hover" id="dataTable" data-server-side="true" data-table-type="movimentos" data-table-endpoint="dados.php" width="100%" cellspacing="0">
                    <thead class="table-light">
                        <tr>
                            <th width="5%">ID</th>
                            <th width="35%">Produto</th>
                            <th width="15%">Tipo</th>
                            <th width="15%">Quantidade</th>
                            <th width="20%">Data</th>
                            <th width="10%" class="text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<style>
.card {
    transition: transform 0.2s, border-color 0.2s;
}
.card:hover {
    transform: translateY(-5px);
}

/* Hover para card azul */
.card-hover-primary:hover {
    border-left-color: #2e59d9 !important;
    border-color: #4e73df;
}

/* Hover para card amarelo */
.card-hover-warning:hover {
    border-left-color: #e4b22b !important;
    border-color: #f6c23e;
}

/* Hover para card vermelho */
.card-hover-danger:hover {
    border-left-color: #d52a1e !important;
    border-color: #e74a3b;
}

/* Hover para card verde */
.card-hover-success:hover {
    border-left-color: #17a673 !important;
    border-color: #1cc88a;
}

.border-left-primary {
    border-left: 4px solid #4e73df !important;
}
.border-left-success {
    border-left: 4px solid #1cc88a !important;
}
.border-left-warning {
    border-left: 4px solid #f6c23e !important;
}
.border-left-danger {
    border-left: 4px solid #e74a3b !important;
}

.table-actions .btn-group {
    opacity: 0.8;
    transition: opacity 0.2s;
}
.table-actions:hover .btn-group {
    opacity: 1;
}

/* Estilo para badges de entrada/saída */
.bg-success {
    background-color: #1cc88a !important;
}
.bg-danger {
    background-color: #e74a3b !important;
}
</style>

<?php include '../includes/footer.php'; ?>