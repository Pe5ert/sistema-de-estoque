<?php
include '../config/conexao.php';

if ($_POST) {
    $nome = $_POST['nome'];
    $preco_custo = str_replace(',', '.', $_POST['preco_custo']);
    $preco_venda = str_replace(',', '.', $_POST['preco_venda']);
    $qtd = $_POST['qtd'];
    
    $stmt = $pdo->prepare("INSERT INTO produtos (nome, preco_custo, preco_venda, qtd) VALUES (?, ?, ?, ?)");
    
    if ($stmt->execute([$nome, $preco_custo, $preco_venda, $qtd])) {
        header('Location: index.php?sucesso=cadastrado');
        exit;
    } else {
        $erro = "Erro ao cadastrar produto!";
    }
}
?>

<?php include '../includes/header.php'; ?>

<h1>Adicionar Produto</h1>

<?php if (isset($erro)): ?>
    <div class="alert alert-danger"><?php echo $erro; ?></div>
<?php endif; ?>

<form method="POST">
    <div class="mb-3">
        <label for="nome" class="form-label">Nome do Produto</label>
        <input type="text" class="form-control" id="nome" name="nome" required>
    </div>
    
    <div class="row">
        <div class="col-md-4">
            <div class="mb-3">
                <label for="preco_custo" class="form-label">Preço de Custo</label>
                <input type="text" class="form-control" id="preco_custo" name="preco_custo" required>
            </div>
        </div>
        
        <div class="col-md-4">
            <div class="mb-3">
                <label for="preco_venda" class="form-label">Preço de Venda</label>
                <input type="text" class="form-control" id="preco_venda" name="preco_venda" required>
            </div>
        </div>
        
        <div class="col-md-4">
            <div class="mb-3">
                <label for="qtd" class="form-label">Quantidade Inicial</label>
                <input type="number" class="form-control" id="qtd" name="qtd" value="0" required>
            </div>
        </div>
    </div>
    
    <button type="submit" class="btn btn-primary">Cadastrar</button>
    <a href="index.php" class="btn btn-secondary">Cancelar</a>
</form>

<?php include '../includes/footer.php'; ?>