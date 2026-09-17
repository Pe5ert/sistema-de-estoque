<?php
// produtos/alertas.php - VERSÃO CORRIGIDA
$root = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';
include_once $root . '/config/conexao.php';
include_once $root . '/config/config.php';
include_once $root . '/config/auth.php';
requireLogin();

// Buscar produtos com estoque baixo
$stmt = $pdo->prepare("SELECT * FROM produtos WHERE qtd < ? ORDER BY qtd ASC");
$stmt->execute([ESTOQUE_BAIXO_LIMITE]);
$produtos_estoque_baixo = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Buscar produtos sem estoque
$stmt = $pdo->query("SELECT * FROM produtos WHERE qtd = 0 ORDER BY nome");
$produtos_sem_estoque = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Buscar produtos que precisam de reposição (abaixo de 5 unidades)
$stmt = $pdo->prepare("SELECT * FROM produtos WHERE qtd > 0 AND qtd < 5 ORDER BY qtd ASC");
$stmt->execute();
$produtos_reposicao = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alertas de Estoque</title>
    <link rel="icon" href="/Estoque/favicon.svg" type="image/svg+xml">
    <meta name="theme-color" content="#004d61">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/Estoque/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        .card-alerta {
            transition: transform 0.2s;
            height: 100%;
        }
        .card-alerta:hover {
            transform: translateY(-5px);
        }
        .card-icon {
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }
        .progress {
            height: 8px;
        }
        .table-responsive {
            max-height: 400px;
            overflow-y: auto;
        }
        .badge-alerta {
            font-size: 0.8rem;
        }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container">
            <a class="navbar-brand" href="/Estoque/index.php">Estoque da loja</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarMenu" aria-controls="navbarMenu" aria-expanded="false" aria-label="Alternar navegação">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarMenu">
                <div class="navbar-nav">
                    <a class="nav-link" href="/Estoque/produtos/index.php">Produtos</a>
                    <a class="nav-link" href="/Estoque/movimentos/index.php">Movimentos</a>
                </div>
            </div>
        </div>
    </nav>

    <div class="container mt-4">
        <h1 class="mb-4"><i class="fas fa-exclamation-triangle text-warning"></i> Alertas de Estoque</h1>

        <!-- Cards de Resumo Melhorados -->
        <div class="row mb-4">
            <!-- Produtos com Estoque Baixo -->
            <div class="col-12 col-xl-4 col-md-6 mb-4">
                <div class="card border-left-warning shadow h-100 py-2 card-alerta">
                    <div class="card-body">
                        <div class="row no-gutters align-items-center">
                            <div class="col mr-2">
                                <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">
                                    Estoque Baixo
                                </div>
                                <div class="row no-gutters align-items-center">
                                    <div class="col-auto">
                                        <div class="h5 mb-0 mr-3 font-weight-bold text-gray-800">
                                            <?php echo count($produtos_estoque_baixo); ?>
                                        </div>
                                    </div>
                                    <div class="col">
                                        <div class="progress progress-sm mr-2">
                                            <div class="progress-bar bg-warning" role="progressbar" 
                                                 style="width: <?php echo min(100, (count($produtos_estoque_baixo)/max(1, count($produtos_estoque_baixo) + 5))*100); ?>%"
                                                 aria-valuenow="<?php echo count($produtos_estoque_baixo); ?>" 
                                                 aria-valuemin="0" 
                                                 aria-valuemax="<?php echo max(10, count($produtos_estoque_baixo) + 5); ?>">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <small class="text-muted">Abaixo de <?php echo ESTOQUE_BAIXO_LIMITE; ?> unidades</small>
                            </div>
                            <div class="col-auto">
                                <i class="fas fa-exclamation-triangle fa-2x text-warning"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Produtos Sem Estoque -->
            <div class="col-12 col-xl-4 col-md-6 mb-4">
                <div class="card border-left-danger shadow h-100 py-2 card-alerta">
                    <div class="card-body">
                        <div class="row no-gutters align-items-center">
                            <div class="col mr-2">
                                <div class="text-xs font-weight-bold text-danger text-uppercase mb-1">
                                    Sem Estoque
                                </div>
                                <div class="h5 mb-0 font-weight-bold text-gray-800">
                                    <?php echo count($produtos_sem_estoque); ?>
                                </div>
                                <small class="text-muted">Produtos com estoque zerado</small>
                            </div>
                            <div class="col-auto">
                                <i class="fas fa-times-circle fa-2x text-danger"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Produtos para Reposição -->
            <div class="col-12 col-xl-4 col-md-6 mb-4">
                <div class="card border-left-info shadow h-100 py-2 card-alerta">
                    <div class="card-body">
                        <div class="row no-gutters align-items-center">
                            <div class="col mr-2">
                                <div class="text-xs font-weight-bold text-info text-uppercase mb-1">
                                    Reposição Urgente
                                </div>
                                <div class="h5 mb-0 font-weight-bold text-gray-800">
                                    <?php echo count($produtos_reposicao); ?>
                                </div>
                                <small class="text-muted">Abaixo de 5 unidades</small>
                            </div>
                            <div class="col-auto">
                                <i class="fas fa-shopping-cart fa-2x text-info"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <!-- Produtos com Estoque Baixo -->
            <div class="col-lg-6 mb-4">
                <div class="card border-warning shadow card-alerta">
                    <div class="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-exclamation-circle"></i> Estoque Baixo
                        </h5>
                        <span class="badge bg-danger"><?php echo count($produtos_estoque_baixo); ?></span>
                    </div>
                    <div class="card-body p-0">
                        <?php if (!empty($produtos_estoque_baixo)): ?>
                            <div class="table-responsive">
                                <table class="table table-sm table-hover mb-0">
                                    <thead class="table-warning">
                                        <tr>
                                            <th width="40%">Produto</th>
                                            <th width="20%">Estoque</th>
                                            <th width="40%">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($produtos_estoque_baixo as $produto): ?>
                                        <tr>
                                            <td class="align-middle">
                                                <strong><?php echo htmlspecialchars($produto['nome']); ?></strong>
                                            </td>
                                            <td class="align-middle">
                                                <span class="badge bg-warning text-dark"><?php echo $produto['qtd']; ?> un</span>
                                            </td>
                                            <td class="align-middle">
                                                <div class="btn-group btn-group-sm" role="group">
                                                    <a href="editar.php?id=<?php echo $produto['id']; ?>" class="btn btn-outline-primary">
                                                        <i class="fas fa-edit"></i>
                                                    </a>
                                                    <a href="../movimentos/cadastrar.php?produto_id=<?php echo $produto['id']; ?>" class="btn btn-outline-success">
                                                        <i class="fas fa-plus"></i> Repor
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>
                        <?php else: ?>
                            <div class="text-center py-4">
                                <i class="fas fa-check-circle text-success fa-2x mb-2"></i>
                                <p class="text-muted mb-0">Nenhum produto com estoque baixo</p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>

            <!-- Produtos Sem Estoque -->
            <div class="col-lg-6 mb-4">
                <div class="card border-danger shadow card-alerta">
                    <div class="card-header bg-danger text-white d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-times-circle"></i> Sem Estoque
                        </h5>
                        <span class="badge bg-dark"><?php echo count($produtos_sem_estoque); ?></span>
                    </div>
                    <div class="card-body p-0">
                        <?php if (!empty($produtos_sem_estoque)): ?>
                            <div class="table-responsive">
                                <table class="table table-sm table-hover mb-0">
                                    <thead class="table-danger">
                                        <tr>
                                            <th width="40%">Produto</th>
                                            <th width="20%">Estoque</th>
                                            <th width="40%">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($produtos_sem_estoque as $produto): ?>
                                        <tr>
                                            <td class="align-middle">
                                                <strong><?php echo htmlspecialchars($produto['nome']); ?></strong>
                                            </td>
                                            <td class="align-middle">
                                                <span class="badge bg-danger"><?php echo $produto['qtd']; ?> un</span>
                                            </td>
                                            <td class="align-middle">
                                                <div class="btn-group btn-group-sm" role="group">
                                                    <a href="editar.php?id=<?php echo $produto['id']; ?>" class="btn btn-outline-primary">
                                                        <i class="fas fa-edit"></i>
                                                    </a>
                                                    <a href="../movimentos/cadastrar.php?produto_id=<?php echo $produto['id']; ?>" class="btn btn-outline-success">
                                                        <i class="fas fa-plus"></i> Repor
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>
                        <?php else: ?>
                            <div class="text-center py-4">
                                <i class="fas fa-check-circle text-success fa-2x mb-2"></i>
                                <p class="text-muted mb-0">Nenhum produto sem estoque</p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>

        <!-- Produtos que Precisam de Reposição Urgente -->
        <div class="row mt-2">
            <div class="col-12">
                <div class="card border-info shadow card-alerta">
                    <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-shopping-cart"></i> Necessidade de Reposição Urgente
                        </h5>
                        <span class="badge bg-warning"><?php echo count($produtos_reposicao); ?></span>
                    </div>
                    <div class="card-body p-0">
                        <?php if (!empty($produtos_reposicao)): ?>
                            <div class="table-responsive">
                                <table class="table table-sm table-hover mb-0">
                                    <thead class="table-info">
                                        <tr>
                                            <th width="25%">Produto</th>
                                            <th width="15%">Estoque</th>
                                            <th width="15%">Preço Custo</th>
                                            <th width="15%">Quantidade</th>
                                            <th width="15%">Valor Estimado</th>
                                            <th width="15%">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($produtos_reposicao as $produto): 
                                            $qtd_recomendada = ESTOQUE_BAIXO_LIMITE + 10;
                                            $qtd_repor = $qtd_recomendada - $produto['qtd'];
                                            $valor_estimado = $qtd_repor * $produto['preco_custo'];
                                        ?>
                                        <tr>
                                            <td class="align-middle">
                                                <strong><?php echo htmlspecialchars($produto['nome']); ?></strong>
                                            </td>
                                            <td class="align-middle">
                                                <span class="badge bg-info"><?php echo $produto['qtd']; ?> un</span>
                                            </td>
                                            <td class="align-middle">
                                                R$ <?php echo number_format($produto['preco_custo'], 2, ',', '.'); ?>
                                            </td>
                                            <td class="align-middle">
                                                <span class="badge bg-warning text-dark"><?php echo $qtd_repor; ?> un</span>
                                            </td>
                                            <td class="align-middle">
                                                <strong>R$ <?php echo number_format($valor_estimado, 2, ',', '.'); ?></strong>
                                            </td>
                                            <td class="align-middle">
                                                <a href="../movimentos/cadastrar.php?produto_id=<?php echo $produto['id']; ?>&qtd_sugerido=<?php echo $qtd_repor; ?>" 
                                                   class="btn btn-sm btn-success">
                                                    <i class="fas fa-cart-plus"></i> Repor
                                                </a>
                                            </td>
                                        </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>
                        <?php else: ?>
                            <div class="text-center py-4">
                                <i class="fas fa-check-circle text-success fa-2x mb-2"></i>
                                <p class="text-muted mb-0">Nenhum produto precisa de reposição urgente</p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>

        <div class="mt-4 text-center">
            <a href="index.php" class="btn btn-secondary">
                <i class="fas fa-arrow-left"></i> Voltar para Produtos
            </a>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>