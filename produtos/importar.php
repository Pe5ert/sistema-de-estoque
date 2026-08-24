<?php
$root = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';
include_once $root . '/config/conexao.php';
include_once $root . '/config/auth.php';
requireLogin();

$maxFileSize = 5 * 1024 * 1024; // 5 MB
$errors = [];
$preview = [];
$valid_lines = [];
$total_valid = 0;
$total_errors = 0;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $etapa = $_POST['etapa'] ?? '1';

    if ($etapa === '1') {
        // Etapa 1: upload e pré-visualização
        if (!isset($_FILES['arquivo_csv']) || $_FILES['arquivo_csv']['error'] !== UPLOAD_ERR_OK) {
            $errors[] = 'Envie um arquivo CSV válido.';
        } else {
            if ($_FILES['arquivo_csv']['size'] > $maxFileSize) {
                $errors[] = 'Arquivo excede o tamanho máximo de 5 MB.';
            }

            $tmp = $_FILES['arquivo_csv']['tmp_name'];
            $name = $_FILES['arquivo_csv']['name'];
            $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
            if ($ext !== 'csv') {
                $errors[] = 'A extensão do arquivo deve ser .csv.';
            }

            if (empty($errors)) {
                if (($handle = fopen($tmp, 'r')) === false) {
                    $errors[] = 'Não foi possível ler o arquivo enviado.';
                } else {
                    $linha = 0;
                    $expectedHeader = ['nome','preco_custo','preco_venda','qtd'];
                    while (($data = fgetcsv($handle, 0, ';')) !== false) {
                        $linha++;
                        // Skip empty lines
                        if (count($data) === 1 && trim($data[0]) === '') {
                            continue;
                        }

                        if ($linha === 1) {
                            $header = array_map(function($v){ return mb_strtolower(trim($v)); }, $data);
                            if ($header !== $expectedHeader) {
                                $errors[] = 'Cabeçalho inválido. Use: nome;preco_custo;preco_venda;qtd';
                                break;
                            }
                            continue;
                        }

                        // Pad to 4 columns
                        $row = array_map('trim', $data);
                        $row += array_fill(0, 4 - count($row), '');

                        $rowAssoc = [
                            'nome' => $row[0],
                            'preco_custo' => $row[1],
                            'preco_venda' => $row[2],
                            'qtd' => $row[3],
                        ];

                        $rowErrors = [];
                        if ($rowAssoc['nome'] === '') {
                            $rowErrors[] = 'nome vazio';
                        }

                        // Normalizar decimais
                        $pc = str_replace(',', '.', $rowAssoc['preco_custo']);
                        $pv = str_replace(',', '.', $rowAssoc['preco_venda']);

                        if ($pc === '' || !is_numeric($pc) || floatval($pc) < 0) {
                            $rowErrors[] = 'preço de custo inválido';
                        }
                        if ($pv === '' || !is_numeric($pv) || floatval($pv) < 0) {
                            $rowErrors[] = 'preço de venda inválido';
                        }

                        if ($rowAssoc['qtd'] === '' || !ctype_digit($rowAssoc['qtd']) || intval($rowAssoc['qtd']) < 0) {
                            $rowErrors[] = 'quantidade inválida';
                        }

                        if (!empty($rowErrors)) {
                            $preview[] = ['linha' => $linha, 'dados' => $rowAssoc, 'erro' => implode('; ', $rowErrors)];
                            $total_errors++;
                        } else {
                            // normalize numeric values
                            $valid = [
                                'nome' => $rowAssoc['nome'],
                                'preco_custo' => number_format((float)$pc, 2, '.', ''),
                                'preco_venda' => number_format((float)$pv, 2, '.', ''),
                                'qtd' => intval($rowAssoc['qtd']),
                            ];
                            $preview[] = ['linha' => $linha, 'dados' => $valid, 'erro' => null];
                            $valid_lines[] = $valid;
                            $total_valid++;
                        }
                    }
                    fclose($handle);
                }
            }
        }
    } elseif ($etapa === '2') {
        // Etapa 2: confirmação e gravação
        csrfCheck();
        $json = $_POST['linhas_validas'] ?? '[]';
        $linhas = json_decode($json, true);
        if (!is_array($linhas)) {
            $errors[] = 'Dados de importação inválidos.';
        } else {
            try {
                $pdo->beginTransaction();
                $stmt = $pdo->prepare("INSERT INTO produtos (nome, preco_custo, preco_venda, qtd) VALUES (?, ?, ?, ?)");
                $count = 0;
                foreach ($linhas as $l) {
                    $stmt->execute([$l['nome'], $l['preco_custo'], $l['preco_venda'], $l['qtd']]);
                    $count++;
                }
                $pdo->commit();
                header('Location: index.php?sucesso=importacao_concluida&total=' . $count);
                exit;
            } catch (PDOException $e) {
                $pdo->rollBack();
                error_log('Import error: ' . $e->getMessage());
                $errors[] = 'Erro ao importar produtos. Nenhuma linha foi gravada.';
            }
        }
    }
}

?>
<?php include '../includes/header.php'; ?>

<div class="d-flex justify-content-between align-items-center mb-3">
    <h1>Importar Produtos (CSV)</h1>
    <div>
        <a href="modelo_importacao.php" class="btn btn-outline-secondary btn-sm">
            <i class="fas fa-download"></i> Baixar modelo de planilha
        </a>
        <a href="index.php" class="btn btn-secondary btn-sm">Cancelar</a>
    </div>
</div>

<?php if (!empty($errors)): ?>
    <div class="alert alert-danger"><?php echo htmlspecialchars(implode(' - ', $errors)); ?></div>
<?php endif; ?>

<?php if (empty($preview) && ($_SERVER['REQUEST_METHOD'] !== 'POST' || ($_SERVER['REQUEST_METHOD'] === 'POST' && ($etapa ?? '') !== '1'))): ?>

<form method="POST" enctype="multipart/form-data">
    <input type="hidden" name="etapa" value="1">
    <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars(csrfToken()); ?>">
    <div class="mb-3">
        <label for="arquivo_csv" class="form-label">Arquivo CSV (delimitador: ; )</label>
        <input type="file" class="form-control" id="arquivo_csv" name="arquivo_csv" accept=".csv" required>
    </div>
    <button type="submit" class="btn btn-primary">Analisar arquivo</button>
    <a href="index.php" class="btn btn-secondary">Voltar</a>
</form>

<?php else: ?>

    <div class="mb-3">
        <p><strong><?php echo $total_valid; ?></strong> produtos prontos para importar, <strong><?php echo $total_errors; ?></strong> linhas com erro que serão ignoradas.</p>
    </div>

    <form method="POST">
        <input type="hidden" name="etapa" value="2">
        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars(csrfToken()); ?>">
        <input type="hidden" name="linhas_validas" value="<?php echo htmlspecialchars(json_encode($valid_lines)); ?>">

        <div class="table-responsive mb-3">
            <table class="table table-sm table-bordered">
                <thead>
                    <tr>
                        <th>Linha</th>
                        <th>Nome</th>
                        <th>Preço Custo</th>
                        <th>Preço Venda</th>
                        <th>Qtd</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($preview as $p): ?>
                        <tr class="<?php echo $p['erro'] ? 'table-danger' : 'table-success'; ?>">
                            <td><?php echo (int)$p['linha']; ?></td>
                            <td><?php echo htmlspecialchars($p['dados']['nome']); ?></td>
                            <td><?php echo htmlspecialchars($p['dados']['preco_custo']); ?></td>
                            <td><?php echo htmlspecialchars($p['dados']['preco_venda']); ?></td>
                            <td><?php echo htmlspecialchars($p['dados']['qtd']); ?></td>
                            <td><?php echo $p['erro'] ? htmlspecialchars($p['erro']) : 'OK'; ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <button type="submit" class="btn btn-success">Confirmar importação (<?php echo $total_valid; ?>)</button>
        <a href="index.php" class="btn btn-secondary">Cancelar</a>
    </form>

<?php endif; ?>

<?php include '../includes/footer.php'; ?>
