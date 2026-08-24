<?php
$root = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';
include_once $root . '/config/conexao.php';
include_once $root . '/config/config.php';
require_once $root . '/config/auth.php';
requireAdmin();

$stmt = $pdo->query("SELECT id, nome, email, perfil, ativo, ultimo_login, criado_em FROM usuarios ORDER BY nome");
$usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmt_total = $pdo->query("SELECT COUNT(*) as total FROM usuarios");
$total_usuarios = $stmt_total->fetch()['total'];

$stmt_admins = $pdo->query("SELECT COUNT(*) as total FROM usuarios WHERE perfil = 'admin'");
$total_admins = $stmt_admins->fetch()['total'];

$stmt_operadores = $pdo->query("SELECT COUNT(*) as total FROM usuarios WHERE perfil = 'operador'");
$total_operadores = $stmt_operadores->fetch()['total'];

$stmt_inativos = $pdo->query("SELECT COUNT(*) as total FROM usuarios WHERE ativo = 0");
$total_inativos = $stmt_inativos->fetch()['total'];
?>

<?php include '../includes/header.php'; ?>

<div class="container-fluid">
    <div class="row mb-4">
        <div class="col-xl-3 col-md-6 mb-4">
            <div class="card border-left-primary shadow h-100 py-2 card-hover-primary">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">Total de Usuários</div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800"><?php echo $total_usuarios; ?></div>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-users fa-2x text-gray-300"></i>
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
                            <div class="text-xs font-weight-bold text-info text-uppercase mb-1">Admins</div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800"><?php echo $total_admins; ?></div>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-user-shield fa-2x text-gray-300"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
            <div class="card border-left-secondary shadow h-100 py-2 card-hover-secondary">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs font-weight-bold text-secondary text-uppercase mb-1">Operadores</div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800"><?php echo $total_operadores; ?></div>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-user-cog fa-2x text-gray-300"></i>
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
                            <div class="text-xs font-weight-bold text-danger text-uppercase mb-1">Contas Inativas</div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800"><?php echo $total_inativos; ?></div>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-user-slash fa-2x text-gray-300"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="card shadow mb-4">
        <div class="card-header py-3 d-flex justify-content-between align-items-center bg-primary">
            <h4 class="m-0 font-weight-bold text-white"><i class="fas fa-user"></i> Gestão de Usuários</h4>
            <a href="adicionar.php" class="btn btn-light btn-sm">
                <i class="fas fa-plus text-primary"></i> Adicionar Usuário
            </a>
        </div>
        <div class="card-body">
            <?php if (isset($_GET['sucesso'])): ?>
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    <i class="fas fa-check-circle"></i> <?php echo htmlspecialchars($_GET['sucesso']); ?>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            <?php endif; ?>

            <?php if (isset($_GET['erro'])): ?>
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    <i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($_GET['erro']); ?>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            <?php endif; ?>

            <div class="table-responsive">
                <table class="table table-bordered table-hover" id="dataTable" width="100%" cellspacing="0">
                    <thead class="table-light">
                        <tr>
                            <th>Nome</th>
                            <th>E-mail</th>
                            <th>Perfil</th>
                            <th>Status</th>
                            <th>Último login</th>
                            <th>Criado em</th>
                            <th class="text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($usuarios as $usuario): ?>
                            <tr>
                                <td><?php echo htmlspecialchars($usuario['nome']); ?></td>
                                <td><?php echo htmlspecialchars($usuario['email']); ?></td>
                                <td>
                                    <span class="badge <?php echo $usuario['perfil'] === 'admin' ? 'bg-primary' : 'bg-secondary'; ?>">
                                        <?php echo htmlspecialchars(ucfirst($usuario['perfil'])); ?>
                                    </span>
                                </td>
                                <td>
                                    <span class="badge <?php echo $usuario['ativo'] ? 'bg-success' : 'bg-danger'; ?>">
                                        <?php echo $usuario['ativo'] ? 'Ativo' : 'Inativo'; ?>
                                    </span>
                                </td>
                                <td>
                                    <?php if ($usuario['ultimo_login']): ?>
                                        <?php echo date('d/m/Y H:i', strtotime($usuario['ultimo_login'])); ?>
                                    <?php else: ?>
                                        Nunca
                                    <?php endif; ?>
                                </td>
                                <td><?php echo date('d/m/Y H:i', strtotime($usuario['criado_em'])); ?></td>
                                <td class="text-center">
                                    <div class="btn-group btn-group-sm" role="group">
                                        <a href="editar.php?id=<?php echo $usuario['id']; ?>" class="btn btn-outline-primary" title="Editar Usuário">
                                            <i class="fas fa-edit"></i>
                                        </a>
                                        <?php if ($usuario['id'] != currentUser()['id']): ?>
                                            <form method="POST" action="alternar_status.php" class="d-inline" onsubmit="return confirm('Tem certeza que deseja alterar o status deste usuário?');">
                                                <input type="hidden" name="id" value="<?php echo $usuario['id']; ?>">
                                                <input type="hidden" name="csrf_token" value="<?php echo csrfToken(); ?>">
                                                <button type="submit" class="btn btn-outline-<?php echo $usuario['ativo'] ? 'danger' : 'success'; ?> btn-sm" title="<?php echo $usuario['ativo'] ? 'Desativar' : 'Ativar'; ?> Usuário">
                                                    <i class="fas <?php echo $usuario['ativo'] ? 'fa-user-slash' : 'fa-user-check'; ?>"></i>
                                                </button>
                                            </form>
                                        <?php endif; ?>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<?php include '../includes/footer.php'; ?>
