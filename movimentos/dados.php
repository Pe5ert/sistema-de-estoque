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
    0 => 'm.id',
    1 => 'p.nome',
    2 => 'm.tipo',
    3 => 'm.qtd',
    4 => 'm.data',
    5 => 'm.id',
];
$orderColumn = $orderColumns[(int) ($_GET['order'][0]['column'] ?? 4)] ?? 'm.data';
$orderDirection = strtolower((string) ($_GET['order'][0]['dir'] ?? 'desc')) === 'asc' ? 'ASC' : 'DESC';
$from = ' FROM movimentos m LEFT JOIN produtos p ON m.produto_id = p.id';
$where = '';
$params = [];
if ($search !== '') {
    $where = ' WHERE p.nome LIKE :search';
    $params[':search'] = '%' . $search . '%';
}

$total = (int) $pdo->query('SELECT COUNT(*) FROM movimentos')->fetchColumn();
$countStatement = $pdo->prepare('SELECT COUNT(*)' . $from . $where);
$countStatement->execute($params);
$filtered = (int) $countStatement->fetchColumn();

$query = 'SELECT m.id, m.tipo, m.qtd, m.data, p.nome AS produto_nome' . $from . $where
    . " ORDER BY {$orderColumn} {$orderDirection} LIMIT :length OFFSET :start";
$statement = $pdo->prepare($query);
foreach ($params as $name => $value) {
    $statement->bindValue($name, $value, PDO::PARAM_STR);
}
$statement->bindValue(':length', $length, PDO::PARAM_INT);
$statement->bindValue(':start', $start, PDO::PARAM_INT);
$statement->execute();

$data = [];
while ($movimento = $statement->fetch(PDO::FETCH_ASSOC)) {
    $entrada = $movimento['tipo'] === 'E';
    $badgeClass = $entrada ? 'bg-success' : 'bg-danger';
    $tipoTexto = $entrada ? 'Entrada' : 'Saída';
    $tipoIcone = $entrada ? 'fa-arrow-down' : 'fa-arrow-up';
    $id = (int) $movimento['id'];
    $nome = htmlspecialchars((string) $movimento['produto_nome'], ENT_QUOTES, 'UTF-8');
    $csrf = htmlspecialchars(csrfToken(), ENT_QUOTES, 'UTF-8');
    $data[] = [
        '<span class="fw-bold">#' . $id . '</span>',
        '<strong>' . $nome . '</strong>',
        '<span class="badge ' . $badgeClass . '"><i class="fas ' . $tipoIcone . '"></i> ' . $tipoTexto . '</span>',
        '<span class="badge ' . $badgeClass . '">' . (int) $movimento['qtd'] . ' un</span>',
        '<small class="text-muted">' . date('d/m/Y H:i', strtotime($movimento['data'])) . '</small>',
        '<form method="POST" action="excluir.php" class="d-inline" onsubmit="return confirm(\'Tem certeza que deseja excluir esta movimentação?\')">'
            . '<input type="hidden" name="id" value="' . $id . '"><input type="hidden" name="csrf_token" value="' . $csrf . '">'
            . '<button type="submit" class="btn btn-outline-danger btn-sm" title="Excluir Movimentação"><i class="fas fa-trash"></i></button></form>',
    ];
}

echo json_encode([
    'draw' => $draw,
    'recordsTotal' => $total,
    'recordsFiltered' => $filtered,
    'data' => $data,
], JSON_UNESCAPED_UNICODE);
