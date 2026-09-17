<?php
$root = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';
require_once $root . '/config/conexao.php';
require_once $root . '/config/config.php';
require_once $root . '/config/auth.php';
requireLogin();

header('Content-Type: application/json; charset=utf-8');

$draw = max(0, (int) ($_GET['draw'] ?? 0));
$start = max(0, (int) ($_GET['start'] ?? 0));
$length = (int) ($_GET['length'] ?? 25);
$length = $length > 0 ? min($length, 100) : 25;
$search = trim((string) ($_GET['search']['value'] ?? ''));

$orderColumns = [
    0 => 'id',
    1 => 'nome',
    2 => 'preco_custo',
    3 => 'preco_venda',
    4 => 'qtd',
    5 => 'qtd',
    6 => 'id',
];
$orderColumn = $orderColumns[(int) ($_GET['order'][0]['column'] ?? 0)] ?? 'id';
$orderDirection = strtolower((string) ($_GET['order'][0]['dir'] ?? 'desc')) === 'asc' ? 'ASC' : 'DESC';

$total = (int) $pdo->query('SELECT COUNT(*) FROM produtos')->fetchColumn();
$where = '';
$params = [];
if ($search !== '') {
    $where = ' WHERE nome LIKE :search';
    $params[':search'] = '%' . $search . '%';
}

$countStatement = $pdo->prepare('SELECT COUNT(*) FROM produtos' . $where);
$countStatement->execute($params);
$filtered = (int) $countStatement->fetchColumn();

$query = 'SELECT id, nome, preco_custo, preco_venda, qtd FROM produtos' . $where
    . " ORDER BY {$orderColumn} {$orderDirection} LIMIT :length OFFSET :start";
$statement = $pdo->prepare($query);
foreach ($params as $name => $value) {
    $statement->bindValue($name, $value, PDO::PARAM_STR);
}
$statement->bindValue(':length', $length, PDO::PARAM_INT);
$statement->bindValue(':start', $start, PDO::PARAM_INT);
$statement->execute();

$data = [];
while ($produto = $statement->fetch(PDO::FETCH_ASSOC)) {
    if ((int) $produto['qtd'] === 0) {
        $status = 'Sem Estoque';
        $badgeClass = 'bg-danger';
    } elseif ((int) $produto['qtd'] < ESTOQUE_BAIXO_LIMITE) {
        $status = 'Estoque Baixo';
        $badgeClass = 'bg-warning';
    } else {
        $status = 'Normal';
        $badgeClass = 'bg-success';
    }

    $id = (int) $produto['id'];
    $nome = htmlspecialchars($produto['nome'], ENT_QUOTES, 'UTF-8');
    $csrf = htmlspecialchars(csrfToken(), ENT_QUOTES, 'UTF-8');
    $data[] = [
        '<span class="fw-bold">#' . $id . '</span>',
        '<strong>' . $nome . '</strong>',
        '<span class="text-muted">R$ </span><strong>' . number_format((float) $produto['preco_custo'], 2, ',', '.') . '</strong>',
        '<span class="text-success">R$ </span><strong class="text-success">' . number_format((float) $produto['preco_venda'], 2, ',', '.') . '</strong>',
        '<span class="badge ' . $badgeClass . '">' . (int) $produto['qtd'] . ' un</span>',
        '<small class="badge ' . $badgeClass . '">' . $status . '</small>',
        '<div class="btn-group btn-group-sm" role="group">'
            . '<a href="editar.php?id=' . $id . '" class="btn btn-outline-primary" title="Editar Produto"><i class="fas fa-edit"></i></a>'
            . '<a href="../movimentos/cadastrar.php?produto_id=' . $id . '" class="btn btn-outline-success" title="Adicionar Estoque"><i class="fas fa-plus"></i></a>'
            . '<form method="POST" action="excluir.php" class="d-inline ms-1" onsubmit="return confirm(\'Tem certeza que deseja excluir este produto?\')">'
            . '<input type="hidden" name="id" value="' . $id . '"><input type="hidden" name="csrf_token" value="' . $csrf . '">'
            . '<button type="submit" class="btn btn-outline-danger btn-sm" title="Excluir Produto"><i class="fas fa-trash"></i></button></form></div>',
    ];
}

echo json_encode([
    'draw' => $draw,
    'recordsTotal' => $total,
    'recordsFiltered' => $filtered,
    'data' => $data,
], JSON_UNESCAPED_UNICODE);
