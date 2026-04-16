
<?php 
// index.php principal
$root = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';
include $root . '/config/conexao.php';
include $root . '/config/config.php';

?>


<?php include 'includes/header.php'; ?>

<div class="row">
    <div class="col-md-12">
        <h1>Monitore aqui o estoque da loja</h1>
        <p class="lead">Sistema de monitoramento de estoque</p>
        
        <div class="row">
            <div class="col-md-3">
                <div class="card text-white bg-primary">
                    <div class="card-body">
                        <h5 class="card-title">Produtos Cadastrados</h5>
                        <?php
                        $stmt = $pdo->query("SELECT COUNT(*) as total FROM produtos");
                        $total = $stmt->fetch()['total'];
                        ?>
                        <h2 class="card-text"><?php echo $total; ?></h2>
                    </div>
                </div>
            </div>
            
            <div class="col-md-3">
                <div class="card text-white bg-success">
                    <div class="card-body">
                        <h5 class="card-title">Total em Estoque</h5>
                        <?php
                        $stmt = $pdo->query("SELECT SUM(qtd) as total_estoque FROM produtos");
                        $total_estoque = $stmt->fetch()['total_estoque'] ?? 0;
                        ?>
                        <h2 class="card-text"><?php echo $total_estoque; ?> unidades</h2>
                    </div>
                </div>
            </div>
            
            <div class="col-md-3">
                <div class="card text-white bg-info">
                    <div class="card-body">
                        <h5 class="card-title">Movimentos Hoje</h5>
                        <?php
                        $stmt = $pdo->query("SELECT COUNT(*) as movimentos_hoje FROM movimentos WHERE DATE(data) = CURDATE()");
                        $movimentos_hoje = $stmt->fetch()['movimentos_hoje'];
                        ?>
                        <h2 class="card-text"><?php echo $movimentos_hoje; ?></h2>
                    </div>
                </div>
            </div>

            <div class="col-md-3">
                <div class="card text-white bg-warning">
                    <div class="card-body">
                        <h5 class="card-title">Valor Total Estoque</h5>
                        <?php
                        $stmt = $pdo->query("SELECT SUM(qtd * preco_custo) as valor_total FROM produtos");
                        $valor_total = $stmt->fetch()['valor_total'] ?? 0;
                        ?>
                        <h2 class="card-text">R$ <?php echo number_format($valor_total, 2, ',', '.'); ?></h2>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Botões de Navegação Principal -->
        <div class="mt-4">
            <div class="d-grid gap-2 d-md-block">
                <a href="produtos/index.php" class="btn btn-primary me-2">
                    <i class="fas fa-boxes"></i> Gerenciar Produtos
                </a>
                <a href="movimentos/index.php" class="btn btn-secondary me-2">
                    <i class="fas fa-exchange-alt"></i> Ver Movimentos
                </a>
                <a href="comparativos/index.php" class="btn btn-warning me-2">
                    <i class="fas fa-chart-line"></i> Comparativos
                </a>
                <a href="movimentos/relatorio.php" class="btn btn-success me-2">
                    <i class="fas fa-file-alt"></i> Relatórios
                </a>
            </div>
        </div>

        <!-- Seção de Acesso Rápido -->
        <div class="row mt-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title"><i class="fas fa-rocket"></i> Acesso Rápido</h5>
                        <div class="row">
                            <div class="col-md-3">
                                <div class="card mb-3">
                                    <div class="card-body text-center">
                                        <i class="fas fa-boxes fa-2x text-primary mb-2"></i>
                                        <h6 class="card-subtitle mb-2 text-muted">Produtos</h6>
                                        <p class="card-text">Gerenciar produtos do estoque</p>
                                        <a href="produtos/index.php" class="btn btn-outline-primary btn-sm">Acessar</a>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card mb-3">
                                    <div class="card-body text-center">
                                        <i class="fas fa-exchange-alt fa-2x text-secondary mb-2"></i>
                                        <h6 class="card-subtitle mb-2 text-muted">Movimentos</h6>
                                        <p class="card-text">Entradas e saídas do estoque</p>
                                        <a href="movimentos/index.php" class="btn btn-outline-secondary btn-sm">Acessar</a>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card mb-3">
                                    <div class="card-body text-center">
                                        <i class="fas fa-chart-line fa-2x text-warning mb-2"></i>
                                        <h6 class="card-subtitle mb-2 text-muted">Comparativos</h6>
                                        <p class="card-text">Análise de desempenho</p>
                                        <a href="comparativos/index.php" class="btn btn-outline-warning btn-sm">Acessar</a>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card mb-3">
                                    <div class="card-body text-center">
                                        <i class="fas fa-file-alt fa-2x text-success mb-2"></i>
                                        <h6 class="card-subtitle mb-2 text-muted">Relatórios</h6>
                                        <p class="card-text">Relatórios completos</p>
                                        <a href="movimentos/relatorio.php" class="btn btn-outline-success btn-sm">Acessar</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Seção de Estatísticas Rápidas -->
        <div class="row mt-4">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header bg-info text-white">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-chart-pie"></i> Estatísticas Rápidas
                        </h5>
                    </div>
                    <div class="card-body">
                        <?php
                        // Buscar estatísticas adicionais
                        $stmt = $pdo->query("SELECT COUNT(*) as total FROM movimentos WHERE DATE(data) = CURDATE()");
                        $movimentos_hoje = $stmt->fetch()['total'];
                        
                        $stmt = $pdo->query("SELECT SUM(qtd) as total FROM movimentos WHERE tipo = 'E' AND DATE(data) = CURDATE()");
                        $entradas_hoje = $stmt->fetch()['total'] ?? 0;
                        
                        $stmt = $pdo->query("SELECT SUM(qtd) as total FROM movimentos WHERE tipo = 'S' AND DATE(data) = CURDATE()");
                        $saidas_hoje = $stmt->fetch()['total'] ?? 0;
                        
                        $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM produtos WHERE qtd < ?");
                        $stmt->execute([ESTOQUE_BAIXO_LIMITE]);
                        $produtos_estoque_baixo = $stmt->fetch()['total'];
                        ?>
                        <div class="list-group list-group-flush">
                            <div class="list-group-item d-flex justify-content-between align-items-center">
                                Movimentos hoje
                                <span class="badge bg-primary rounded-pill"><?php echo $movimentos_hoje; ?></span>
                            </div>
                            <div class="list-group-item d-flex justify-content-between align-items-center">
                                Entradas hoje
                                <span class="badge bg-success rounded-pill"><?php echo $entradas_hoje; ?> un</span>
                            </div>
                            <div class="list-group-item d-flex justify-content-between align-items-center">
                                Saídas hoje
                                <span class="badge bg-danger rounded-pill"><?php echo $saidas_hoje; ?> un</span>
                            </div>
                            <div class="list-group-item d-flex justify-content-between align-items-center">
                                Produtos com estoque baixo
                                <span class="badge bg-warning rounded-pill"><?php echo $produtos_estoque_baixo; ?></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-md-6">
                <div class="card">
                    <div class="card-header bg-success text-white">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-bolt"></i> Ações Rápidas
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="d-grid gap-2">
                            <a href="produtos/adicionar.php" class="btn btn-outline-primary btn-sm">
                                <i class="fas fa-plus"></i> Adicionar Produto
                            </a>
                            <a href="movimentos/cadastrar.php" class="btn btn-outline-success btn-sm">
                                <i class="fas fa-plus"></i> Nova Movimentação
                            </a>
                            <a href="produtos/alertas.php" class="btn btn-outline-warning btn-sm">
                                <i class="fas fa-exclamation-triangle"></i> Ver Alertas
                            </a>
                            <a href="comparativos/index.php" class="btn btn-outline-info btn-sm">
                                <i class="fas fa-chart-bar"></i> Análise Comparativa
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Alertas de Estoque -->
<div class="row mt-4">
    <div class="col-md-12">
        <div class="card border-warning">
            <div class="card-header bg-warning text-dark">
                <h5 class="card-title mb-0">
                    <i class="fas fa-exclamation-triangle"></i> Alertas de Estoque
                </h5>
            </div>
            <div class="card-body">
                <?php
                // Buscar alertas
                $stmt = $pdo->prepare("SELECT COUNT(*) as total_baixo FROM produtos WHERE qtd < ?");
                $stmt->execute([ESTOQUE_BAIXO_LIMITE]);
                $total_baixo = $stmt->fetch()['total_baixo'];
                
                $stmt = $pdo->query("SELECT COUNT(*) as total_zero FROM produtos WHERE qtd = 0");
                $total_zero = $stmt->fetch()['total_zero'];
                ?>
                
                <div class="row">
                    <div class="col-md-6">
                        <?php if ($total_baixo > 0): ?>
                            <div class="alert alert-warning">
                                <i class="fas fa-exclamation-circle"></i>
                                <strong><?php echo $total_baixo; ?> produto(s)</strong> com estoque abaixo do limite mínimo.
                            </div>
                        <?php else: ?>
                            <div class="alert alert-success">
                                <i class="fas fa-check-circle"></i>
                                Nenhum produto com estoque baixo.
                            </div>
                        <?php endif; ?>
                    </div>
                    <div class="col-md-6">
                        <?php if ($total_zero > 0): ?>
                            <div class="alert alert-danger">
                                <i class="fas fa-times-circle"></i>
                                <strong><?php echo $total_zero; ?> produto(s)</strong> sem estoque.
                            </div>
                        <?php else: ?>
                            <div class="alert alert-success">
                                <i class="fas fa-check-circle"></i>
                                Nenhum produto sem estoque.
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
                
                <?php if ($total_baixo > 0 || $total_zero > 0): ?>
                <div class="text-center">
                    <a href="produtos/alertas.php" class="btn btn-warning">
                        <i class="fas fa-exclamation-triangle"></i> Ver Detalhes dos Alertas
                    </a>
                </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<?php include 'includes/footer.php'; ?>