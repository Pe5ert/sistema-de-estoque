<?php
// produtos/index.php
$root = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';
include $root . '/config/conexao.php';
include $root . '/config/config.php';

// Buscar produtos
$stmt = $pdo->query("SELECT * FROM produtos ORDER BY id DESC");
$produtos = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Buscar estatísticas para os cards
$stmt_total = $pdo->query("SELECT COUNT(*) as total FROM produtos");
$total_produtos = $stmt_total->fetch()['total'];

$stmt_estoque_baixo = $pdo->prepare("SELECT COUNT(*) as total FROM produtos WHERE qtd < ?");
$stmt_estoque_baixo->execute([ESTOQUE_BAIXO_LIMITE]);
$total_estoque_baixo = $stmt_estoque_baixo->fetch()['total'];

$stmt_sem_estoque = $pdo->query("SELECT COUNT(*) as total FROM produtos WHERE qtd = 0");
$total_sem_estoque = $stmt_sem_estoque->fetch()['total'];

$stmt_valor_estoque = $pdo->query("SELECT SUM(preco_custo * qtd) as total FROM produtos");
$valor_total_estoque = $stmt_valor_estoque->fetch()['total'] ?? 0;
?>

<?php include '../includes/header.php'; ?>

<div class="container-fluid">
    <!-- Cards de Estatísticas -->
    <div class="row mb-4">
        <div class="col-xl-3 col-md-6 mb-4">
            <div class="card border-left-primary shadow h-100 py-2 card-hover-primary">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                Total de Produtos
                            </div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800">
                                <?php echo $total_produtos; ?>
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
            <div class="card border-left-warning shadow h-100 py-2 card-hover-warning">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">
                                Estoque Baixo
                            </div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800">
                                <?php echo $total_estoque_baixo; ?>
                            </div>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-exclamation-triangle fa-2x text-gray-300"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
            <div class="card border-left-danger shadow h-100 py-2 card-hover-danger">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs font-weight-bold text-danger text-uppercase mb-1">
                                Sem Estoque
                            </div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800">
                                <?php echo $total_sem_estoque; ?>
                            </div>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-times-circle fa-2x text-gray-300"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
            <div class="card border-left-success shadow h-100 py-2 card-hover-success">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs font-weight-bold text-success text-uppercase mb-1">
                                Valor do Estoque
                            </div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800">
                                R$ <?php echo number_format($valor_total_estoque, 2, ',', '.'); ?>
                            </div>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-dollar-sign fa-2x text-gray-300"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="card shadow mb-4">
        <div class="card-header py-3 d-flex justify-content-between align-items-center bg-primary">
            <h4 class="m-0 font-weight-bold text-white">
                <i class="fas fa-boxes"></i> Gerenciar Produtos
            </h4>
            <div class="ms-auto me-3"> <!-- Adicionado ms-auto e me-3 para mover para direita -->
                <a href="adicionar.php" class="btn btn-light btn-sm">
                    <i class="fas fa-plus text-primary"></i> Adicionar Produto
                </a>
                <a href="alertas.php" class="btn btn-warning btn-sm">
                    <i class="fas fa-exclamation-triangle"></i> Ver Alertas
                    <?php if ($total_estoque_baixo > 0): ?>
                        <span class="badge bg-danger"><?php echo $total_estoque_baixo; ?></span>
                    <?php endif; ?>
                </a>
            </div>
        </div>
        <div class="card-body">
            <?php if (isset($_GET['sucesso'])): ?>
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    <i class="fas fa-check-circle"></i> Produto <?php echo $_GET['sucesso']; ?> com sucesso!
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
                <table class="table table-bordered table-hover" id="dataTable" width="100%" cellspacing="0">
                    <thead class="table-light">
                        <tr>
                            <th width="5%">ID</th>
                            <th width="25%">Nome</th>
                            <th width="15%">Preço de Custo</th>
                            <th width="15%">Preço de Venda</th>
                            <th width="10%">Quantidade</th>
                            <th width="10%">Status</th>
                            <th width="20%" class="text-center">Ações</th> <!-- Adicionado text-center -->
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($produtos as $produto): 
                            $status_estoque = '';
                            $badge_class = '';
                            
                            if ($produto['qtd'] == 0) {
                                $status_estoque = 'Sem Estoque';
                                $badge_class = 'bg-danger';
                            } elseif ($produto['qtd'] < ESTOQUE_BAIXO_LIMITE) {
                                $status_estoque = 'Estoque Baixo';
                                $badge_class = 'bg-warning';
                            } else {
                                $status_estoque = 'Normal';
                                $badge_class = 'bg-success';
                            }
                        ?>
                            <tr>
                                <td class="fw-bold">#<?php echo $produto['id']; ?></td>
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
                                    <span class="badge <?php echo $badge_class; ?>">
                                        <?php echo $produto['qtd']; ?> un
                                    </span>
                                </td>
                                <td>
                                    <small class="badge <?php echo $badge_class; ?>">
                                        <?php echo $status_estoque; ?>
                                    </small>
                                </td>
                                <td class="text-center"> <!-- Adicionado text-center -->
                                    <div class="btn-group btn-group-sm" role="group">
                                        <a href="editar.php?id=<?php echo $produto['id']; ?>" 
                                           class="btn btn-outline-primary" 
                                           title="Editar Produto">
                                            <i class="fas fa-edit"></i>
                                        </a>
                                        <a href="../movimentos/cadastrar.php?produto_id=<?php echo $produto['id']; ?>" 
                                           class="btn btn-outline-success" 
                                           title="Adicionar Estoque">
                                            <i class="fas fa-plus"></i>
                                        </a>
                                        <a href="excluir.php?id=<?php echo $produto['id']; ?>" 
                                           class="btn btn-outline-danger" 
                                           title="Excluir Produto"
                                           onclick="return confirm('Tem certeza que deseja excluir este produto?')">
                                            <i class="fas fa-trash"></i>
                                        </a>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                        
                        <?php if (empty($produtos)): ?>
                            <tr>
                                <td colspan="7" class="text-center py-4">
                                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                                    <p class="text-muted">Nenhum produto cadastrado.</p>
                                    <a href="adicionar.php" class="btn btn-primary">
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
</style>

<?php include '../includes/footer.php'; ?>