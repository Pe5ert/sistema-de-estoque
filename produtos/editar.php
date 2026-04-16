<?php
// produtos/alertas.php - VERSÃO FINAL CORRIGIDA
$root = $_SERVER['DOCUMENT_ROOT'] . '/Estoque';
include_once $root . '/config/conexao.php';
include_once $root . '/config/config.php';
$id = $_GET['id'];

// Buscar produto
$stmt = $pdo->prepare("SELECT * FROM produtos WHERE id = ?");
$stmt->execute([$id]);
$produto = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$produto) {
    die("Produto não encontrado!");
}

if ($_POST) {
    $nome = $_POST['nome'];
    $preco_custo = str_replace(',', '.', $_POST['preco_custo']);
    $preco_venda = str_replace(',', '.', $_POST['preco_venda']);
    $qtd = $_POST['qtd'];
    
    $stmt = $pdo->prepare("UPDATE produtos SET nome = ?, preco_custo = ?, preco_venda = ?, qtd = ? WHERE id = ?");
    
    if ($stmt->execute([$nome, $preco_custo, $preco_venda, $qtd, $id])) {
        header('Location: index.php?sucesso=atualizado');
        exit;
    } else {
        $erro = "Erro ao atualizar produto!";
    }
}
?>

<?php include '../includes/header.php'; ?>

<h1>Editar Produto</h1>

<?php if (isset($erro)): ?>
    <div class="alert alert-danger"><?php echo $erro; ?></div>
<?php endif; ?>
<!-- Formulário de Edição -->
<form method="POST">
    <div class="mb-3">
        <label for="nome" class="form-label">Nome do Produto</label>
        <input type="text" class="form-control" id="nome" name="nome" value="<?php echo htmlspecialchars($produto['nome']); ?>" required>
    </div>
    
    <div class="row">
        <div class="col-md-4">
            <div class="mb-3">
                <label for="preco_custo" class="form-label">Preço de Custo</label>
                <input type="text" class="form-control" id="preco_custo" name="preco_custo" value="<?php echo number_format($produto['preco_custo'], 2, ',', '.'); ?>" required>
            </div>
        </div>
        
        <div class="col-md-4">
            <div class="mb-3">
                <label for="preco_venda" class="form-label">Preço de Venda</label>
                <input type="text" class="form-control" id="preco_venda" name="preco_venda" value="<?php echo number_format($produto['preco_venda'], 2, ',', '.'); ?>" required>
            </div>
        </div>
        
        <div class="col-md-4">
            <div class="mb-3">
                <label for="qtd" class="form-label">Quantidade</label>
                <input type="number" class="form-control" id="qtd" name="qtd" value="<?php echo $produto['qtd']; ?>" required>
            </div>
        </div>
    </div>
    
    <button type="submit" class="btn btn-primary">Atualizar</button>
    <a href="index.php" class="btn btn-secondary">Cancelar</a>
</form>

<?php include '../includes/footer.php'; ?>